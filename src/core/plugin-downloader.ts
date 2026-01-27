import type { App } from "obsidian";
import type { DownloadResult, GitHubRepoInfo, PluginManifest } from "../types";
import { PluginManifestSchema } from "../types/schemas";
import type { GitHubService } from "./github-service";

export class PluginDownloader {
  constructor(
    private app: App,
    private githubService: GitHubService,
  ) {}

  async downloadPlugin(
    repoInfo: GitHubRepoInfo,
    version: string,
  ): Promise<DownloadResult> {
    try {
      const release = await this.githubService.fetchRelease(repoInfo, version);

      const assets = this.githubService.getPluginAssets(release);
      if (!assets) {
        return {
          success: false,
          error: "Release is missing required files (main.js, manifest.json)",
        };
      }

      const manifestText = await this.githubService.downloadAssetAsText(
        assets.manifest,
      );
      let manifest: PluginManifest;
      try {
        manifest = PluginManifestSchema.parse(JSON.parse(manifestText));
      } catch {
        return {
          success: false,
          error: "Invalid manifest.json format",
        };
      }

      const pluginId = manifest.id;
      const pluginDir = this.getPluginPath(pluginId);

      await this.ensureDirectory(pluginDir);

      const mainJsContent = await this.githubService.downloadAsset(
        assets.mainJs,
      );
      await this.app.vault.adapter.writeBinary(
        `${pluginDir}/main.js`,
        mainJsContent,
      );

      await this.app.vault.adapter.write(
        `${pluginDir}/manifest.json`,
        manifestText,
      );

      let hasStyles = false;
      if (assets.styles) {
        try {
          const stylesContent = await this.githubService.downloadAssetAsText(
            assets.styles,
          );
          await this.app.vault.adapter.write(
            `${pluginDir}/styles.css`,
            stylesContent,
          );
          hasStyles = true;
        } catch {
          // styles.css is optional, ignore errors
        }
      }

      return {
        success: true,
        pluginId,
        hasStyles,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Gets the path to a plugin directory.
   */
  private getPluginPath(pluginId: string): string {
    const configDir = this.app.vault.configDir;
    return `${configDir}/plugins/${pluginId}`;
  }

  /**
   * Ensures a directory exists, creating it if necessary.
   */
  private async ensureDirectory(path: string): Promise<void> {
    const exists = await this.app.vault.adapter.exists(path);
    if (!exists) {
      await this.app.vault.adapter.mkdir(path);
    }
  }

  /**
   * Checks if a plugin is installed.
   */
  async isPluginInstalled(pluginId: string): Promise<boolean> {
    const pluginDir = this.getPluginPath(pluginId);
    const mainJsExists = await this.app.vault.adapter.exists(
      `${pluginDir}/main.js`,
    );
    const manifestExists = await this.app.vault.adapter.exists(
      `${pluginDir}/manifest.json`,
    );
    return mainJsExists && manifestExists;
  }

  /**
   * Gets the installed version of a plugin.
   */
  async getInstalledVersion(pluginId: string): Promise<string | null> {
    try {
      const pluginDir = this.getPluginPath(pluginId);
      const manifestPath = `${pluginDir}/manifest.json`;

      if (!(await this.app.vault.adapter.exists(manifestPath))) {
        return null;
      }

      const manifestText = await this.app.vault.adapter.read(manifestPath);
      const manifest = PluginManifestSchema.parse(JSON.parse(manifestText));
      return manifest.version;
    } catch {
      return null;
    }
  }
}
