import axios from "axios";
import logger from "../logger"; // Adjust the import path accordingly
import { get_axios_params, getToken } from "../url"; // Adjust the import path accordingly
import semver from "semver";

export interface DependencyResult {
  score: number;
  latency: number;
}

/**
 * Determines if a version string is pinned to at least a major and minor version.
 * Recognizes exact versions, caret (^), and tilde (~) prefixed versions.
 * @param version The version string from package.json.
 * @returns True if the version is pinned, false otherwise.
 */
function isVersionPinned(version: string): boolean {
  const regex = /^(\^|~)?\d+\.\d+\.\d+(-[\w\d]+)?$/;
  return regex.test(version);
}

/**
 * Calculates the dependency pinning score.
 * @param dependencies An object containing dependency versions.
 * @returns The fraction of dependencies that are pinned. Returns 1.0 if there are no dependencies.
 */
function calculatePinningScore(dependencies: {
  [key: string]: string;
}): number {
  const totalDependencies = Object.keys(dependencies).length;

  if (totalDependencies === 0) {
    return 1.0;
  }

  const pinnedDependencies = Object.values(dependencies).filter(isVersionPinned)
    .length;

  return pinnedDependencies / totalDependencies;
}

/**
 * Fetches the package.json from a GitHub repository and calculates the dependency pinning score.
 * @param owner The owner of the repository (user or organization).
 * @param repo The name of the repository.
 * @param headers Axios headers including authorization.
 * @returns The dependency pinning score as a number between 0 and 1, or null if failed.
 */
async function _getDependencyPinningFractionFromPackageJson(
  owner: string,
  repo: string,
  headers: any,
): Promise<number | null> {
  try {
    const packageJsonUrl = `https://api.github.com/repos/${owner}/${repo}/contents/package.json`;
    const packageResponse = await axios.get(packageJsonUrl, { headers });

    if (packageResponse.data.content) {
      const packageContent = Buffer.from(
        packageResponse.data.content,
        "base64",
      ).toString("utf-8");

      const packageJson = JSON.parse(packageContent);

      const allDependencies: { [key: string]: string } = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies,
        ...packageJson.optionalDependencies,
      };

      return calculatePinningScore(allDependencies);
    }

    logger.error(`package.json content not found for ${owner}/${repo}.`);
    return null;
  } catch (error: any) {
    logger.error(
      `Failed to fetch package.json for ${owner}/${repo}:`,
      error.message,
    );
    return null;
  }
}

/**
 * Fetches the dependency pinning fraction from package.json of a GitHub repository.
 * @param url GitHub repository URL.
 * @returns The dependency pinning score as a MetricResult object containing score and latency.
 */
export async function getDependencyPinningFraction(
  url: string,
): Promise<DependencyResult> {
  const startTime = Date.now();

  try {
    const token = getToken();
    const { owner, repo, headers } = get_axios_params(url, token);

    const sanitizedRepo = repo.endsWith(".git") ? repo.slice(0, -4) : repo;

    const pinningScore = await _getDependencyPinningFractionFromPackageJson(
      owner,
      sanitizedRepo,
      headers,
    );
    const latency = Date.now() - startTime;

    return { score: pinningScore ?? 0, latency };
  } catch (error: any) {
    const latency = Date.now() - startTime;
    logger.error(
      `Error calculating Dependency Pinning for ${url}:`,
      error.message,
    );
    return { score: 0, latency };
  }
}
