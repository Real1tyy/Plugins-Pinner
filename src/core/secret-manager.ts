import type { Plugin } from "obsidian";
import { SECRET_KEYS } from "../constants";

/**
 * Manages secure storage of sensitive data using Obsidian's SecretStorage API.
 * Secrets are stored securely and isolated from other plugins.
 */
export class SecretManager {
  constructor(private plugin: Plugin) {}

  async getGitHubToken(): Promise<string> {
    return (await this.plugin.loadSecret(SECRET_KEYS.GITHUB_TOKEN)) ?? "";
  }

  async setGitHubToken(token: string): Promise<void> {
    if (token.trim() === "") {
      await this.plugin.removeSecret(SECRET_KEYS.GITHUB_TOKEN);
    } else {
      await this.plugin.saveSecret(SECRET_KEYS.GITHUB_TOKEN, token);
    }
  }

  async clearGitHubToken(): Promise<void> {
    await this.plugin.removeSecret(SECRET_KEYS.GITHUB_TOKEN);
  }
}
