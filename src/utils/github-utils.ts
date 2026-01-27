import type { GitHubRepoInfo } from "../types";

/**
 * Parses a GitHub repository URL into owner and repo components.
 * Supports various GitHub URL formats:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - https://github.com/owner/repo/
 * - github.com/owner/repo
 */
export function parseGitHubUrl(url: string): GitHubRepoInfo | null {
  try {
    // Remove trailing slashes and .git suffix
    let cleanUrl = url
      .trim()
      .replace(/\/+$/, "")
      .replace(/\.git$/, "");

    // Add protocol if missing
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = "https://" + cleanUrl;
    }

    const parsed = new URL(cleanUrl);

    // Validate it's a GitHub URL
    if (!parsed.hostname.includes("github.com")) {
      return null;
    }

    // Extract owner and repo from pathname
    const pathParts = parsed.pathname
      .split("/")
      .filter((part) => part.length > 0);

    if (pathParts.length < 2) {
      return null;
    }

    return {
      owner: pathParts[0],
      repo: pathParts[1],
    };
  } catch {
    return null;
  }
}

/**
 * Compares two semantic version strings.
 * Assumes versions without 'v' prefix (e.g., "1.30.1").
 * Returns:
 *  - negative if a < b
 *  - 0 if a === b
 *  - positive if a > b
 */
export function compareVersions(a: string, b: string): number {
  const parseVersion = (v: string): number[] => {
    return v.split(".").map((n) => parseInt(n, 10) || 0);
  };

  const partsA = parseVersion(a);
  const partsB = parseVersion(b);

  const maxLength = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < maxLength; i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;

    if (numA !== numB) {
      return numA - numB;
    }
  }

  return 0;
}

/**
 * Validates that a URL is a valid GitHub repository URL.
 */
export function isValidGitHubUrl(url: string): boolean {
  return parseGitHubUrl(url) !== null;
}
