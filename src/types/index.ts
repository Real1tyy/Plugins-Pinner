export * from "./schemas";

export interface GitHubRepoInfo {
  owner: string;
  repo: string;
}

export type SyncStatus = "idle" | "syncing" | "success" | "error";

export interface PluginSyncResult {
  url: string;
  version: string;
  success: boolean;
  skipped: boolean;
  error?: string;
  pluginId?: string;
  hasStyles?: boolean;
}

export interface SyncSummary {
  total: number;
  synced: number;
  skipped: number;
  failed: number;
  results: PluginSyncResult[];
}

export interface DownloadResult {
  success: boolean;
  pluginId?: string;
  hasStyles?: boolean;
  error?: string;
}
