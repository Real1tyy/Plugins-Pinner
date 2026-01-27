import { SyncStore } from "@real1ty-obsidian-plugins";
import type { App } from "obsidian";
import type { BehaviorSubject } from "rxjs";
import type {
  DownloadedPluginEntry,
  FailedPluginEntry,
  PluginEntry,
  PluginSyncResult,
  SyncStatus,
  SyncSummary,
  PluginsPinnerLocalData,
  PluginsPinnerSettings,
} from "../types";
import { PluginsPinnerLocalDataSchema } from "../types/schemas";
import { parseGitHubUrl } from "../utils/github-utils";
import { GitHubService } from "./github-service";
import { PluginDownloader } from "./plugin-downloader";

export class SyncManager {
  private githubService: GitHubService;
  private pluginDownloader: PluginDownloader;
  private _status: SyncStatus = "idle";
  private _lastError: string | null = null;

  constructor(
    private app: App,
    private settings$: BehaviorSubject<PluginsPinnerSettings>,
    private syncStore: SyncStore<typeof PluginsPinnerLocalDataSchema>,
  ) {
    this.githubService = new GitHubService({
      token: "",
    });
    this.pluginDownloader = new PluginDownloader(app, this.githubService);
  }

  get status(): SyncStatus {
    return this._status;
  }

  get lastError(): string | null {
    return this._lastError;
  }

  get localData(): PluginsPinnerLocalData {
    return this.syncStore.data;
  }

  private get currentSettings(): PluginsPinnerSettings {
    return this.settings$.value;
  }

  /**
   * Updates the GitHub token and reconfigures the service.
   */
  updateToken(token: string): void {
    this.githubService.setToken(token);
  }

  /**
   * Runs the full sync process for all enabled plugins that have URLs configured.
   */
  async sync(): Promise<SyncSummary> {
    this._status = "syncing";
    this._lastError = null;

    const enabledPlugins = this.currentSettings.plugins.filter(
      (p) => p.enabled && p.url && p.url.trim() !== "",
    );
    const results: PluginSyncResult[] = [];
    const newDownloaded: Record<string, DownloadedPluginEntry> = {
      ...this.localData.downloadedPlugins,
    };
    const newFailed: FailedPluginEntry[] = [];

    for (const plugin of enabledPlugins) {
      const result = await this.syncPlugin(plugin);
      results.push(result);

      if (result.success && result.pluginId && !result.skipped) {
        // Update downloaded record
        newDownloaded[result.pluginId] = {
          url: plugin.url,
          version: plugin.version,
          downloadedAt: new Date().toISOString(),
          hasStyles: result.hasStyles ?? false,
        };
      } else if (!result.success) {
        // Record failure
        newFailed.push({
          url: plugin.url,
          version: plugin.version,
          error: result.error || "Unknown error",
          failedAt: new Date().toISOString(),
        });
      }
    }

    // Update local data
    await this.syncStore.updateData({
      downloadedPlugins: newDownloaded,
      lastSyncAt: new Date().toISOString(),
      failedPlugins: newFailed,
    });

    const summary: SyncSummary = {
      total: enabledPlugins.length,
      synced: results.filter((r) => r.success && !r.skipped).length,
      skipped: results.filter((r) => r.skipped).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };

    this._status = summary.failed > 0 ? "error" : "success";
    if (summary.failed > 0) {
      this._lastError = `${summary.failed} plugin(s) failed to sync`;
    }

    return summary;
  }

  /**
   * Syncs a single plugin.
   */
  private async syncPlugin(plugin: PluginEntry): Promise<PluginSyncResult> {
    const repoInfo = parseGitHubUrl(plugin.url);
    if (!repoInfo) {
      return {
        url: plugin.url,
        version: plugin.version,
        success: false,
        skipped: false,
        error: "Invalid GitHub URL",
      };
    }

    // Check if already downloaded with matching version
    const downloadedEntry = this.findDownloadedEntry(plugin.url);
    if (
      downloadedEntry &&
      this.versionsMatch(downloadedEntry.version, plugin.version)
    ) {
      return {
        url: plugin.url,
        version: plugin.version,
        success: true,
        skipped: true,
        pluginId: this.getPluginIdFromUrl(plugin.url),
      };
    }

    // Download the plugin
    const result = await this.pluginDownloader.downloadPlugin(
      repoInfo,
      plugin.version,
    );

    if (result.success) {
      return {
        url: plugin.url,
        version: plugin.version,
        success: true,
        skipped: false,
        pluginId: result.pluginId,
        hasStyles: result.hasStyles,
      };
    }

    return {
      url: plugin.url,
      version: plugin.version,
      success: false,
      skipped: false,
      error: result.error,
    };
  }

  /**
   * Finds a downloaded entry by URL.
   */
  private findDownloadedEntry(url: string): DownloadedPluginEntry | undefined {
    return Object.values(this.localData.downloadedPlugins).find(
      (entry) => entry.url === url,
    );
  }

  /**
   * Gets a plugin ID from the downloaded entries by URL.
   */
  private getPluginIdFromUrl(url: string): string | undefined {
    const entries = Object.entries(this.localData.downloadedPlugins);
    const found = entries.find(([_, entry]) => entry.url === url);
    return found ? found[0] : undefined;
  }

  /**
   * Checks if two versions match.
   * Assumes versions without 'v' prefix (e.g., "1.30.1").
   */
  private versionsMatch(v1: string, v2: string): boolean {
    return v1 === v2;
  }

  /**
   * Resets the sync status to idle.
   */
  resetStatus(): void {
    this._status = "idle";
    this._lastError = null;
  }
}
