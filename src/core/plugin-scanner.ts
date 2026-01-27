import type { App } from "obsidian";
import {
  PluginManifestSchema,
  type PluginEntry,
  type PluginManifest,
} from "../types";

export interface InstalledPlugin {
  id: string;
  manifest: PluginManifest;
}

export class PluginScanner {
  constructor(private app: App) {}

  /**
   * Scans the .obsidian/plugins directory and reads all manifest.json files.
   * Returns a list of installed plugins with their manifests.
   */
  async scanInstalledPlugins(): Promise<InstalledPlugin[]> {
    const pluginsFolder = `${this.app.vault.configDir}/plugins`;
    const installedPlugins: InstalledPlugin[] = [];

    try {
      const pluginDirs = await this.app.vault.adapter.list(pluginsFolder);

      for (const dir of pluginDirs.folders) {
        const pluginId = dir.split("/").pop();
        if (!pluginId) continue;

        const manifestPath = `${dir}/manifest.json`;

        try {
          const manifestContent =
            await this.app.vault.adapter.read(manifestPath);
          const manifestData = JSON.parse(manifestContent);
          const parseResult = PluginManifestSchema.safeParse(manifestData);

          if (parseResult.success) {
            installedPlugins.push({
              id: pluginId,
              manifest: parseResult.data,
            });
          } else {
            console.warn(
              `Plugins Pinner: Invalid manifest for plugin ${pluginId}`,
              parseResult.error,
            );
          }
        } catch (error) {
          // Skip plugins without valid manifest.json
          console.debug(
            `Plugins Pinner: Could not read manifest for ${pluginId}`,
            error,
          );
        }
      }
    } catch (error) {
      console.error("Plugins Pinner: Error scanning plugins directory", error);
    }

    return installedPlugins;
  }

  /**
   * Syncs installed plugin versions with settings.
   * Updates existing entries with current versions from manifests.
   * Creates new entries (with empty URL) for plugins not in settings.
   * Returns the updated plugin entries array.
   */
  async syncPluginVersionsWithSettings(
    currentPlugins: readonly PluginEntry[],
  ): Promise<PluginEntry[]> {
    const byId = new Map(currentPlugins.map((p) => [p.id, p]));
    const installed = await this.scanInstalledPlugins();

    const synced = installed.map((installedPlugin) => {
      const existing = byId.get(installedPlugin.id);

      return existing
        ? {
            ...existing,
            version: installedPlugin.manifest.version,
          }
        : {
            id: installedPlugin.id,
            url: "",
            version: installedPlugin.manifest.version,
            enabled: false,
          };
    });

    const installedIds = new Set(installed.map((p) => p.id));
    const leftovers = currentPlugins.filter((p) => !installedIds.has(p.id));
    return [...synced, ...leftovers];
  }
}
