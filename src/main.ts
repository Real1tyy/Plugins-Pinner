import { SettingsStore, SyncStore } from "@real1ty-obsidian-plugins";
import { Notice, Plugin } from "obsidian";
import { PluginScanner } from "./core/plugin-scanner";
import { SecretManager } from "./core/secret-manager";
import { SyncManager } from "./core/sync-manager";
import { PluginsPinnerSettingsTab } from "./settings/settings-tab";
import {
  PluginsPinnerLocalDataSchema,
  PluginsPinnerSettingsSchema,
} from "./types/schemas";

export default class PluginsPinnerPlugin extends Plugin {
  settingsStore!: SettingsStore<typeof PluginsPinnerSettingsSchema>;
  syncStore!: SyncStore<typeof PluginsPinnerLocalDataSchema>;
  secretManager!: SecretManager;
  syncManager!: SyncManager;
  pluginScanner!: PluginScanner;

  async onload() {
    // Initialize settings store (synced via data.json)
    this.settingsStore = new SettingsStore(this, PluginsPinnerSettingsSchema);
    await this.settingsStore.loadSettings();

    this.syncStore = new SyncStore(
      this.app,
      this,
      PluginsPinnerLocalDataSchema,
    );
    await this.syncStore.loadData();
    this.secretManager = new SecretManager(this.app);

    this.pluginScanner = new PluginScanner(this.app);
    this.syncManager = new SyncManager(
      this.app,
      this.settingsStore.settings$,
      this.syncStore,
    );
    this.addSettingTab(
      new PluginsPinnerSettingsTab(
        this.app,
        this,
        this.settingsStore,
        this.secretManager,
        this.syncManager,
        this.pluginScanner,
      ),
    );

    this.registerCommands();

    this.app.workspace.onLayoutReady(() => {
      void this.syncInstalledPlugins();
    });
  }

  onunload() {
    // Cleanup if needed
  }

  private registerCommands(): void {
    this.addCommand({
      id: "sync-plugins",
      name: "Sync all tracked plugins",
      callback: async () => {
        await this.runManualSync();
      },
    });

    this.addCommand({
      id: "scan-installed-plugins",
      name: "Scan installed plugins and update versions",
      callback: async () => {
        await this.syncInstalledPlugins();
        new Notice(
          "Plugins Pinner: Scanned installed plugins and updated versions",
        );
      },
    });

    this.addCommand({
      id: "open-settings",
      name: "Open Plugins Pinner settings",
      callback: () => {
        // @ts-expect-error - setting property exists at runtime
        this.app.setting.open();
        // @ts-expect-error - setting property exists at runtime
        this.app.setting.openTabById("plugins-pinner");
      },
    });
  }

  /**
   * Scans installed plugins and syncs their versions with settings.
   * This is the source of truth - manifest.json versions are always used.
   */
  private async syncInstalledPlugins(): Promise<void> {
    const currentPlugins = this.settingsStore.currentSettings.plugins;
    const updatedPlugins =
      await this.pluginScanner.syncPluginVersionsWithSettings(currentPlugins);
    await this.settingsStore.updateProperty("plugins", updatedPlugins);
    const settings = this.settingsStore.currentSettings;
    if (settings.autoSyncOnLoad) {
      await this.runAutoSync();
    }
  }

  private async runAutoSync(): Promise<void> {
    const settings = this.settingsStore.currentSettings;

    const pluginsWithUrls = settings.plugins.filter(
      (p) => p.url && p.url.trim() !== "",
    );
    if (pluginsWithUrls.length === 0) {
      return;
    }

    const githubToken = this.secretManager.getGitHubToken(
      settings.githubTokenSecretName,
    );
    this.syncManager.updateToken(githubToken);

    try {
      const summary = await this.syncManager.sync();

      if (settings.showSyncNotification) {
        if (summary.synced > 0) {
          new Notice(`Plugins Pinner: ${summary.synced} plugin(s) updated`);
        }
        if (summary.failed > 0) {
          new Notice(
            `Plugins Pinner: ${summary.failed} plugin(s) failed to sync`,
          );
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Plugins Pinner: Auto-sync failed", error);
      if (settings.showSyncNotification) {
        new Notice(
          "Plugins Pinner: Auto-sync failed. Check console for details.",
        );
      }
    }
  }

  private async runManualSync(): Promise<void> {
    const settings = this.settingsStore.currentSettings;

    const pluginsWithUrls = settings.plugins.filter(
      (p) => p.url && p.url.trim() !== "",
    );

    if (pluginsWithUrls.length === 0) {
      new Notice(
        "Plugins Pinner: No plugins with URLs configured. Add GitHub URLs in settings.",
      );
      return;
    }

    const githubToken = this.secretManager.getGitHubToken(
      settings.githubTokenSecretName,
    );
    this.syncManager.updateToken(githubToken);

    new Notice("Plugins Pinner: Starting sync...");

    try {
      const summary = await this.syncManager.sync();

      if (summary.failed > 0) {
        new Notice(
          `Plugins Pinner: ${summary.synced} synced, ${summary.skipped} skipped, ${summary.failed} failed`,
        );
      } else if (summary.synced > 0) {
        new Notice(
          `Plugins Pinner: ${summary.synced} plugin(s) synced, ${summary.skipped} already up to date`,
        );
      } else {
        new Notice("Plugins Pinner: All plugins are up to date");
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Plugins Pinner: Manual sync failed", error);
      new Notice("Plugins Pinner: Sync failed. Check console for details.");
    }
  }
}
