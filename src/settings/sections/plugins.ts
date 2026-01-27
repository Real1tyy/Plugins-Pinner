import { Setting } from "obsidian";
import type { SettingsStore } from "@real1ty-obsidian-plugins";
import type { PluginsPinnerSettingsSchema } from "../../types/schemas";
import { cls } from "../../utils/css";
import { isValidGitHubUrl } from "../../utils/github-utils";

export function renderPluginsSection(
  containerEl: HTMLElement,
  settingsStore: SettingsStore<typeof PluginsPinnerSettingsSchema>,
  onRefresh: () => void,
): void {
  const settings = settingsStore.currentSettings;

  containerEl.createEl("h2", { text: "Tracked Plugins" });

  containerEl.createEl("p", {
    text: "Use 'Scan installed plugins' to automatically detect all installed plugins. Then add GitHub URLs for the plugins you want to pin to specific versions.",
    cls: cls("info-message"),
  });

  if (settings.plugins.length > 0) {
    containerEl.createEl("h3", { text: "Plugin List" });

    const listContainer = containerEl.createDiv({ cls: cls("plugin-list") });

    for (let i = 0; i < settings.plugins.length; i++) {
      const plugin = settings.plugins[i];
      const hasUrl = plugin.url && plugin.url.trim() !== "";

      const displayName = `${plugin.id}${hasUrl ? "" : " (needs URL)"}`;
      const description = hasUrl
        ? `URL: ${plugin.url} | Version: ${plugin.version}`
        : `Version: ${plugin.version} - Add GitHub URL to enable syncing`;

      const pluginSetting = new Setting(listContainer)
        .setName(displayName)
        .setDesc(description);

      if (!hasUrl) {
        pluginSetting.addText((text) => {
          text
            .setPlaceholder("https://github.com/owner/repo")
            .onChange(async (value) => {
              const trimmedUrl = value.trim();
              if (trimmedUrl && isValidGitHubUrl(trimmedUrl)) {
                await settingsStore.updateSettings((s) => ({
                  ...s,
                  plugins: s.plugins.map((p, idx) =>
                    idx === i ? { ...p, url: trimmedUrl } : p,
                  ),
                }));
                onRefresh();
              }
            });
        });
      } else {
        // Enabled toggle (only for plugins with URLs)
        pluginSetting.addToggle((toggle) =>
          toggle.setValue(plugin.enabled).onChange(async (value) => {
            await settingsStore.updateSettings((s) => ({
              ...s,
              plugins: s.plugins.map((p, idx) =>
                idx === i ? { ...p, enabled: value } : p,
              ),
            }));
          }),
        );
      }

      // Remove button
      pluginSetting.addButton((button) =>
        button
          .setIcon("trash")
          .setWarning()
          .onClick(async () => {
            await settingsStore.updateSettings((s) => ({
              ...s,
              plugins: s.plugins.filter((_, idx) => idx !== i),
            }));
            onRefresh();
          }),
      );
    }
  } else {
    containerEl.createEl("p", {
      text: "No plugins tracked yet. Click 'Scan now' to detect installed plugins.",
      cls: cls("empty-state"),
    });
  }

}
