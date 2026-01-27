export const CSS_PREFIX = "plugins-pinner-";

export const GITHUB_RATE_LIMIT_UNAUTHENTICATED = 60; // per hour
export const GITHUB_RATE_LIMIT_AUTHENTICATED = 5000; // per hour

export const SETTINGS_DEFAULTS = {
  DEFAULT_VERSION: "0.0.0",
  DEFAULT_AUTO_SYNC_ON_LOAD: true,
  DEFAULT_SHOW_SYNC_NOTIFICATION: true,
  DEFAULT_GITHUB_TOKEN: "",
} as const;

export const LOCAL_DATA_DEFAULTS = {
  DEFAULT_DOWNLOADED_PLUGINS: {} as Record<
    string,
    { url: string; version: string; downloadedAt: string; hasStyles: boolean }
  >,
  DEFAULT_LAST_SYNC_AT: undefined as string | undefined,
  DEFAULT_FAILED_PLUGINS: [] as {
    url: string;
    version: string;
    error: string;
    failedAt: string;
  }[],
};
