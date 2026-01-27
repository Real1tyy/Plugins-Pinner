import { Setting } from "obsidian";
import type { SyncManager } from "../../core/sync-manager";
import { cls } from "../../utils/css";

export function renderSyncStatusSection(
  containerEl: HTMLElement,
  syncManager: SyncManager,
  onSyncClick: () => Promise<void>,
): void {
  const localData = syncManager.localData;

  containerEl.createEl("h2", { text: "Sync Status" });

  // Status indicator
  const statusContainer = containerEl.createDiv({
    cls: cls("status-container"),
  });
  const statusText = getStatusText(syncManager.status);
  const statusClass = getStatusClass(syncManager.status);

  statusContainer.createEl("div", {
    text: `Status: ${statusText}`,
    cls: cls("status", statusClass),
  });

  if (syncManager.lastError) {
    statusContainer.createEl("div", {
      text: syncManager.lastError,
      cls: cls("status-error"),
    });
  }

  // Last sync time
  if (localData.lastSyncAt) {
    const lastSyncDate = new Date(localData.lastSyncAt);
    new Setting(containerEl)
      .setName("Last Sync")
      .setDesc(lastSyncDate.toLocaleString());
  }

  // Sync button
  new Setting(containerEl)
    .setName("Manual Sync")
    .setDesc("Download any missing or outdated plugins")
    .addButton((button) =>
      button
        .setButtonText("Sync Now")
        .setCta()
        .onClick(async () => {
          button.setDisabled(true);
          button.setButtonText("Syncing...");
          try {
            await onSyncClick();
          } finally {
            button.setDisabled(false);
            button.setButtonText("Sync Now");
          }
        }),
    );

  // Downloaded plugins
  const downloadedEntries = Object.entries(localData.downloadedPlugins);
  if (downloadedEntries.length > 0) {
    containerEl.createEl("h3", { text: "Downloaded Plugins" });
    const downloadedContainer = containerEl.createDiv({
      cls: cls("downloaded-list"),
    });

    for (const [pluginId, entry] of downloadedEntries) {
      const downloadDate = new Date(entry.downloadedAt);
      new Setting(downloadedContainer)
        .setName(pluginId)
        .setDesc(
          `Version: ${entry.version} | Downloaded: ${downloadDate.toLocaleDateString()}`,
        );
    }
  }

  // Failed plugins
  if (localData.failedPlugins.length > 0) {
    containerEl.createEl("h3", { text: "Failed Plugins" });
    const failedContainer = containerEl.createDiv({ cls: cls("failed-list") });

    for (const failure of localData.failedPlugins) {
      const failDate = new Date(failure.failedAt);
      new Setting(failedContainer)
        .setName(failure.url)
        .setDesc(
          `Version: ${failure.version} | Error: ${failure.error} | Failed: ${failDate.toLocaleDateString()}`,
        );
    }
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case "idle":
      return "Idle";
    case "syncing":
      return "Syncing...";
    case "success":
      return "Success";
    case "error":
      return "Error";
    default:
      return "Unknown";
  }
}

function getStatusClass(status: string): string {
  switch (status) {
    case "idle":
      return "status-idle";
    case "syncing":
      return "status-syncing";
    case "success":
      return "status-success";
    case "error":
      return "status-error";
    default:
      return "";
  }
}
