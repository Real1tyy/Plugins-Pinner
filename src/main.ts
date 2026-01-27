import { SettingsStore, SyncStore } from "@real1ty-obsidian-plugins";
import { Notice, Plugin } from "obsidian";
import { SyncManager } from "./core/sync-manager";
import { PluginsPinnerSettingsTab } from "./settings/settings-tab";
import { PluginsPinnerLocalDataSchema, PluginsPinnerSettingsSchema } from "./types/schemas";

export default class PluginsPinnerPlugin extends Plugin {
	settingsStore!: SettingsStore<typeof PluginsPinnerSettingsSchema>;
	syncStore!: SyncStore<typeof PluginsPinnerLocalDataSchema>;
	syncManager!: SyncManager;

	async onload() {
		// Initialize settings store (synced via data.json)
		this.settingsStore = new SettingsStore(this, PluginsPinnerSettingsSchema);
		await this.settingsStore.loadSettings();

		// Initialize sync store (local only, stored in sync.json)
		this.syncStore = new SyncStore(this.app, this, PluginsPinnerLocalDataSchema);
		await this.syncStore.loadData();

		// Initialize sync manager
		this.syncManager = new SyncManager(this.app, this.settingsStore.settings$, this.syncStore);

		// Add settings tab
		this.addSettingTab(new PluginsPinnerSettingsTab(this.app, this, this.settingsStore, this.syncManager));

		// Register commands
		this.registerCommands();

		// Auto-sync on load if enabled
		if (this.settingsStore.currentSettings.autoSyncOnLoad) {
			this.app.workspace.onLayoutReady(() => {
				void this.runAutoSync();
			});
		}
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

	private async runAutoSync(): Promise<void> {
		const settings = this.settingsStore.currentSettings;

		if (settings.plugins.length === 0) {
			return;
		}

		// Update token
		this.syncManager.updateToken(settings.githubToken);

		try {
			const summary = await this.syncManager.sync();

			if (settings.showSyncNotification) {
				if (summary.synced > 0) {
					new Notice(`Plugins Pinner: ${summary.synced} plugin(s) updated`);
				}
				if (summary.failed > 0) {
					new Notice(`Plugins Pinner: ${summary.failed} plugin(s) failed to sync`);
				}
			}
		} catch (error) {
			console.error("Plugins Pinner: Auto-sync failed", error);
			if (settings.showSyncNotification) {
				new Notice("Plugins Pinner: Auto-sync failed. Check console for details.");
			}
		}
	}

	private async runManualSync(): Promise<void> {
		const settings = this.settingsStore.currentSettings;

		if (settings.plugins.length === 0) {
			new Notice("Plugins Pinner: No plugins configured. Add plugins in settings.");
			return;
		}

		// Update token
		this.syncManager.updateToken(settings.githubToken);

		new Notice("Plugins Pinner: Starting sync...");

		try {
			const summary = await this.syncManager.sync();

			if (summary.failed > 0) {
				new Notice(`Plugins Pinner: ${summary.synced} synced, ${summary.skipped} skipped, ${summary.failed} failed`);
			} else if (summary.synced > 0) {
				new Notice(`Plugins Pinner: ${summary.synced} plugin(s) synced, ${summary.skipped} already up to date`);
			} else {
				new Notice("Plugins Pinner: All plugins are up to date");
			}
		} catch (error) {
			console.error("Plugins Pinner: Manual sync failed", error);
			new Notice("Plugins Pinner: Sync failed. Check console for details.");
		}
	}
}
