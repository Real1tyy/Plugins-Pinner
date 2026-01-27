import { z } from "zod";
import { LOCAL_DATA_DEFAULTS, SETTINGS_DEFAULTS } from "../constants";

// Plugin entry schema - represents a single tracked plugin
export const PluginEntrySchema = z.object({
  id: z.string(), // Plugin ID from manifest.json (source of truth)
  url: z.string().catch(""), // GitHub repository URL (user provides this)
  version: z.string(), // Version from manifest.json (source of truth)
  enabled: z.boolean().catch(true),
});

export type PluginEntry = z.infer<typeof PluginEntrySchema>;

// Settings schema - synced via data.json
export const PluginsPinnerSettingsSchema = z
  .object({
    version: z.string().catch(SETTINGS_DEFAULTS.DEFAULT_VERSION),
    plugins: z.array(PluginEntrySchema).catch([]),
    autoSyncOnLoad: z
      .boolean()
      .catch(SETTINGS_DEFAULTS.DEFAULT_AUTO_SYNC_ON_LOAD),
    showSyncNotification: z
      .boolean()
      .catch(SETTINGS_DEFAULTS.DEFAULT_SHOW_SYNC_NOTIFICATION),
    githubTokenSecretName: z
      .string()
      .catch(SETTINGS_DEFAULTS.DEFAULT_GITHUB_TOKEN_SECRET_NAME),
  })
  .strip();

export type PluginsPinnerSettings = z.infer<typeof PluginsPinnerSettingsSchema>;

// Downloaded plugin entry schema - stored locally
export const DownloadedPluginEntrySchema = z.object({
  url: z.url(),
  version: z.string(),
  downloadedAt: z.string().datetime(),
  hasStyles: z.boolean(),
});

export type DownloadedPluginEntry = z.infer<typeof DownloadedPluginEntrySchema>;

// Failed plugin entry schema
export const FailedPluginEntrySchema = z.object({
  url: z.url(),
  version: z.string(),
  error: z.string(),
  failedAt: z.string().datetime(),
});

export type FailedPluginEntry = z.infer<typeof FailedPluginEntrySchema>;

// Local data schema - NOT synced, stored in sync.json
export const PluginsPinnerLocalDataSchema = z
  .object({
    downloadedPlugins: z
      .record(z.string(), DownloadedPluginEntrySchema)
      .catch(LOCAL_DATA_DEFAULTS.DEFAULT_DOWNLOADED_PLUGINS),
    lastSyncAt: z
      .string()
      .datetime()
      .optional()
      .catch(LOCAL_DATA_DEFAULTS.DEFAULT_LAST_SYNC_AT),
    failedPlugins: z
      .array(FailedPluginEntrySchema)
      .catch(LOCAL_DATA_DEFAULTS.DEFAULT_FAILED_PLUGINS),
  })
  .strip();

export type PluginsPinnerLocalData = z.infer<
  typeof PluginsPinnerLocalDataSchema
>;

// GitHub release asset schema
export const GitHubAssetSchema = z.object({
  name: z.string(),
  browser_download_url: z.url(),
});

export type GitHubAsset = z.infer<typeof GitHubAssetSchema>;

// GitHub release schema
export const GitHubReleaseSchema = z.object({
  tag_name: z.string(),
  assets: z.array(GitHubAssetSchema),
});

export type GitHubRelease = z.infer<typeof GitHubReleaseSchema>;

// Plugin manifest schema (from downloaded manifest.json)
export const PluginManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  minAppVersion: z.string(),
  description: z.string().optional(),
  author: z.string().optional(),
  authorUrl: z.string().optional(),
  isDesktopOnly: z.boolean().optional(),
});

export type PluginManifest = z.infer<typeof PluginManifestSchema>;
