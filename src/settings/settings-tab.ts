import type { SettingsStore } from "@real1ty-obsidian-plugins";
import type { App, Plugin } from "obsidian";
import { Notice, PluginSettingTab, SecretComponent, Setting } from "obsidian";
import type { PluginScanner } from "../core/plugin-scanner";
import type { SecretManager } from "../core/secret-manager";
import type { SyncManager } from "../core/sync-manager";
import type { PluginsPinnerSettingsSchema } from "../types/schemas";
import { cls } from "../utils/css";
import { renderPluginsSection } from "./sections/plugins";
import { renderSyncStatusSection } from "./sections/sync-status";

type SectionType = "plugins" | "sync-status";

export class PluginsPinnerSettingsTab extends PluginSettingTab {
  private currentSection: SectionType = "plugins";

  constructor(
    app: App,
    plugin: Plugin,
    private settingsStore: SettingsStore<typeof PluginsPinnerSettingsSchema>,
    private secretManager: SecretManager,
    private syncManager: SyncManager,
    private pluginScanner: PluginScanner,
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass(cls("settings"));

    // Navigation
    this.renderNavigation(containerEl);

    // Content area
    const contentEl = containerEl.createDiv({ cls: cls("settings-content") });
    this.renderCurrentSection(contentEl);
  }

  private renderNavigation(containerEl: HTMLElement): void {
    const navEl = containerEl.createDiv({ cls: cls("settings-nav") });

    const sections: { id: SectionType; label: string }[] = [
      { id: "plugins", label: "Plugins" },
      { id: "sync-status", label: "Sync Status" },
    ];

    for (const section of sections) {
      const button = navEl.createEl("button", {
        text: section.label,
        cls: cls(
          "nav-button",
          this.currentSection === section.id ? "nav-button-active" : "",
        ),
      });

      button.addEventListener("click", () => {
        this.currentSection = section.id;
        this.display();
      });
    }
  }

  private renderCurrentSection(containerEl: HTMLElement): void {
    switch (this.currentSection) {
      case "plugins":
        this.renderPluginsSection(containerEl);
        break;
      case "sync-status":
        this.renderSyncStatusSection(containerEl);
        break;
    }
  }

  private renderPluginsSection(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName("Scan installed plugins")
      .setDesc(
        "Scan .obsidian/plugins directory and update plugin versions from manifest.json files",
      )
      .addButton((button) =>
        button.setButtonText("Scan now").onClick(async () => {
          const currentPlugins = this.settingsStore.currentSettings.plugins;
          const updatedPlugins =
            await this.pluginScanner.syncPluginVersionsWithSettings(
              currentPlugins,
            );
          await this.settingsStore.updateProperty("plugins", updatedPlugins);
          new Notice(
            "Plugins Pinner: Scanned installed plugins and updated versions",
          );
          this.display(); // Refresh to show updated plugins
        }),
      );

    renderPluginsSection(containerEl, this.settingsStore, () => {
      this.display();
    });

    // General settings
    containerEl.createEl("h2", { text: "General Settings" });

    new Setting(containerEl)
      .setName("GitHub Token")
      .setDesc(
        "Optional: Select a GitHub personal access token from SecretStorage to increase API rate limits (from 60 to 5000 requests per hour). Secrets are stored securely and can be shared across plugins.",
      )
      .addComponent((el) =>
        new SecretComponent(this.app, el)
          .setValue(this.settingsStore.currentSettings.githubTokenSecretName)
          .onChange(async (value) => {
            await this.settingsStore.updateProperty(
              "githubTokenSecretName",
              value,
            );
          }),
      );

    new Setting(containerEl)
      .setName("Auto-sync on load")
      .setDesc("Automatically sync plugins when Obsidian starts")
      .addToggle((toggle) =>
        toggle
          .setValue(this.settingsStore.currentSettings.autoSyncOnLoad)
          .onChange(async (value) => {
            await this.settingsStore.updateProperty("autoSyncOnLoad", value);
          }),
      );

    new Setting(containerEl)
      .setName("Show sync notification")
      .setDesc("Display a notification when sync completes")
      .addToggle((toggle) =>
        toggle
          .setValue(this.settingsStore.currentSettings.showSyncNotification)
          .onChange(async (value) => {
            await this.settingsStore.updateProperty(
              "showSyncNotification",
              value,
            );
          }),
      );
  }

  private renderSyncStatusSection(containerEl: HTMLElement): void {
    renderSyncStatusSection(containerEl, this.syncManager, async () => {
      await this.runSync();
      this.display(); // Refresh to show updated status
    });
  }

  private async runSync(): Promise<void> {
    const settings = this.settingsStore.currentSettings;

    const githubToken = this.secretManager.getGitHubToken(
      settings.githubTokenSecretName,
    );
    this.syncManager.updateToken(githubToken);

    const summary = await this.syncManager.sync();

    if (settings.showSyncNotification) {
      if (summary.failed > 0) {
        new Notice(
          `Plugins Pinner: ${summary.synced} synced, ${summary.skipped} skipped, ${summary.failed} failed`,
        );
      } else if (summary.synced > 0) {
        new Notice(
          `Plugins Pinner: ${summary.synced} plugin(s) synced successfully`,
        );
      } else {
        new Notice("Plugins Pinner: All plugins are up to date");
      }
    }
  }
}
