import { Setting } from "obsidian";
import type { SettingsStore } from "@real1ty-obsidian-plugins";
import type { PluginsPinnerSettingsSchema } from "../../types/schemas";
import { cls } from "../../utils/css";
import { isValidGitHubUrl } from "../../utils/github-utils";

export function renderPluginsSection(
	containerEl: HTMLElement,
	settingsStore: SettingsStore<typeof PluginsPinnerSettingsSchema>,
	onRefresh: () => void
): void {
	const settings = settingsStore.currentSettings;

	containerEl.createEl("h2", { text: "Tracked Plugins" });

	// Add plugin form
	const addFormContainer = containerEl.createDiv({ cls: cls("add-form") });

	let urlInput = "";
	let versionInput = "";
	let urlTextComponent: HTMLInputElement | undefined;
	let versionTextComponent: HTMLInputElement | undefined;

	const urlSetting = new Setting(addFormContainer)
		.setName("GitHub Repository URL")
		.setDesc("e.g., https://github.com/owner/repo");

	urlSetting.addText((text) => {
		urlTextComponent = text.inputEl;
		text.setPlaceholder("https://github.com/owner/repo").onChange((value) => {
			urlInput = value;
		});
	});

	const versionSetting = new Setting(addFormContainer)
		.setName("Version")
		.setDesc("The version tag to install (e.g., 1.0.0 or v1.0.0)");

	versionSetting.addText((text) => {
		versionTextComponent = text.inputEl;
		text.setPlaceholder("1.0.0").onChange((value) => {
			versionInput = value;
		});
	});

	new Setting(addFormContainer).addButton((button) =>
		button.setButtonText("Add Plugin").onClick(async () => {
			if (!urlInput.trim() || !versionInput.trim()) {
				return;
			}

			if (!isValidGitHubUrl(urlInput)) {
				return;
			}

			// Check for duplicates
			const exists = settings.plugins.some((p) => p.url === urlInput.trim());
			if (exists) {
				return;
			}

			await settingsStore.updateSettings((s) => ({
				...s,
				plugins: [
					...s.plugins,
					{
						url: urlInput.trim(),
						version: versionInput.trim(),
						enabled: true,
					},
				],
			}));

			// Clear inputs
			urlInput = "";
			versionInput = "";
			if (urlTextComponent) urlTextComponent.value = "";
			if (versionTextComponent) versionTextComponent.value = "";

			// Refresh the display
			onRefresh();
		})
	);

	// Plugin list
	if (settings.plugins.length > 0) {
		containerEl.createEl("h3", { text: "Plugin List" });

		const listContainer = containerEl.createDiv({ cls: cls("plugin-list") });

		for (let i = 0; i < settings.plugins.length; i++) {
			const plugin = settings.plugins[i];
			const pluginSetting = new Setting(listContainer).setName(plugin.url).setDesc(`Version: ${plugin.version}`);

			// Enabled toggle
			pluginSetting.addToggle((toggle) =>
				toggle.setValue(plugin.enabled).onChange(async (value) => {
					await settingsStore.updateSettings((s) => ({
						...s,
						plugins: s.plugins.map((p, idx) => (idx === i ? { ...p, enabled: value } : p)),
					}));
				})
			);

			// Edit version input - only save on blur (when user finishes typing)
			pluginSetting.addText((text) => {
				text.setPlaceholder(plugin.version).setValue(plugin.version);

				const saveVersion = async () => {
					const value = text.getValue().trim();
					if (value && value !== plugin.version) {
						await settingsStore.updateSettings((s) => ({
							...s,
							plugins: s.plugins.map((p, idx) => (idx === i ? { ...p, version: value } : p)),
						}));
						onRefresh();
					}
				};

				text.inputEl.addEventListener("blur", saveVersion);

				text.inputEl.addEventListener("keydown", (e) => {
					if (e.key === "Enter") {
						text.inputEl.blur();
					}
				});
			});

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
					})
			);
		}
	} else {
		containerEl.createEl("p", {
			text: "No plugins tracked yet. Add a plugin above to get started.",
			cls: cls("empty-state"),
		});
	}

	// GitHub Token section
	containerEl.createEl("h3", { text: "GitHub Authentication" });

	new Setting(containerEl)
		.setName("GitHub Personal Access Token")
		.setDesc("Optional. Increases rate limit from 60 to 5000 requests per hour.")
		.addText((text) =>
			text
				.setPlaceholder("ghp_xxxxxxxxxxxxxxxxxxxx")
				.setValue(settings.githubToken)
				.onChange(async (value) => {
					await settingsStore.updateProperty("githubToken", value);
				})
		);
}
