import { Octokit } from "@octokit/rest";
import { requestUrl } from "obsidian";
import type { GitHubAsset, GitHubRelease, GitHubRepoInfo } from "../types";
import { GitHubReleaseSchema } from "../types/schemas";

export interface GitHubServiceOptions {
	token?: string;
}

export class GitHubService {
	private octokit: Octokit;

	constructor(options: GitHubServiceOptions = {}) {
		this.octokit = this.createOctokit(options.token);
	}

	private createOctokit(token?: string): Octokit {
		return new Octokit({
			auth: token || undefined,
			retry: {
				enabled: true,
			},
			throttle: {
				onRateLimit: (retryAfter: number, opts: Record<string, unknown>, oct: Octokit, retryCount: number) => {
					oct.log.warn(`Request quota exhausted for request ${opts.method} ${opts.url}`);
					if (retryCount < 3) {
						oct.log.info(`Retrying after ${retryAfter} seconds!`);
						return true;
					}
					return false;
				},
				onSecondaryRateLimit: (retryAfter: number, opts: Record<string, unknown>, oct: Octokit) => {
					oct.log.warn(`SecondaryRateLimit detected for request ${opts.method} ${opts.url}`);
					return true;
				},
			},
		});
	}

	setToken(token: string): void {
		this.octokit = this.createOctokit(token);
	}

	/**
	 * Fetches a release from GitHub API using the version as the tag.
	 * Assumes version format without 'v' prefix (e.g., "1.30.1").
	 */
	async fetchRelease(repoInfo: GitHubRepoInfo, version: string): Promise<GitHubRelease> {
		const { data } = await this.octokit.rest.repos.getReleaseByTag({
			owner: repoInfo.owner,
			repo: repoInfo.repo,
			tag: version,
		});

		return GitHubReleaseSchema.parse(data);
	}

	/**
	 * Downloads a binary file from a URL.
	 */
	async downloadAsset(asset: GitHubAsset): Promise<ArrayBuffer> {
		const response = await requestUrl({
			url: asset.browser_download_url,
		});

		return response.arrayBuffer;
	}

	/**
	 * Downloads a text file from a URL.
	 */
	async downloadAssetAsText(asset: GitHubAsset): Promise<string> {
		const response = await requestUrl({
			url: asset.browser_download_url,
		});

		return response.text;
	}

	/**
	 * Finds a specific asset in a release by filename.
	 */
	findAsset(release: GitHubRelease, filename: string): GitHubAsset | undefined {
		return release.assets.find((asset) => asset.name === filename);
	}

	/**
	 * Gets the required plugin files from a release.
	 * Returns main.js, manifest.json, and optionally styles.css.
	 */
	getPluginAssets(release: GitHubRelease): { mainJs: GitHubAsset; manifest: GitHubAsset; styles?: GitHubAsset } | null {
		const mainJs = this.findAsset(release, "main.js");
		const manifest = this.findAsset(release, "manifest.json");
		const styles = this.findAsset(release, "styles.css");

		if (!mainJs || !manifest) {
			return null;
		}

		return { mainJs, manifest, styles };
	}
}
