import axios from "axios";
import logger from "../logger"; // Adjust the import path accordingly
import { get_axios_params, getToken } from "../url"; // Adjust the import path accordingly
import semver from "semver";
import fs from "fs";
import path from "path";

/**
 * Interface representing the result of dependency pinning calculation.
 */
interface DependencyResult {
  score: number;
  latency: number;
}

/**
 * Determines if a version string is pinned to at least a major and minor version.
 * @param version The version string from package.json.
 * @returns True if the version is pinned, false otherwise.
 */
function isVersionPinned(version: string): boolean {
  try {
    const range = new semver.Range(version);
    const isPinned = range.set.every((comparators) =>
      comparators.every(
        (comparator) =>
          comparator.operator === "" &&
          comparator.semver.major !== null &&
          comparator.semver.minor !== null
      )
    );
    return isPinned;
  } catch (error) {
    logger.warn(`Invalid semver version: ${version}`, {
      error: (error as Error).message,
    });
    return false;
  }
}

/**
 * Calculates the dependency pinning score from an object of dependencies.
 * @param dependencies An object containing dependency versions.
 * @returns The fraction of dependencies that are pinned. Returns 1.0 if there are no dependencies.
 */
function calculatePinningScore(dependencies: { [key: string]: string }): number {
  const totalDependencies = Object.keys(dependencies).length;
  if (totalDependencies === 0) {
    return 1.0;
  }

  const pinnedDependencies = Object.values(dependencies).filter(isVersionPinned).length;
  const score = pinnedDependencies / totalDependencies;

  return score;
}

/**
 * Reads and parses package.json from a local directory.
 * @param directoryPath The path to the directory to search.
 * @returns The parsed package.json content as a string.
 */
async function findPackageJson(directoryPath: string): Promise<string> {

  const entries = await fs.promises.readdir(directoryPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name);

    if (entry.isFile() && entry.name === "package.json") {
      return fs.promises.readFile(fullPath, "utf8");
    }

    if (entry.isDirectory()) {
      try {
        const packageJsonContent = await findPackageJson(fullPath);
        if (packageJsonContent) {
          return packageJsonContent;
        }
      } catch (err) {
        // Continue searching other directories
        continue;
      }
    }
  }

  throw new Error("package.json not found in the provided directory or its subdirectories.");
}

/**
 * Fetches the package.json from a GitHub repository and calculates the dependency pinning score.
 * @param owner The owner of the repository.
 * @param repo The name of the repository.
 * @param headers Axios headers including authorization.
 * @returns The dependency pinning score as a number between 0 and 1, or null if failed.
 */
async function fetchAndCalculateFromGitHub(owner: string, repo: string, headers: any): Promise<number | null> {
  try {
    const packageJsonUrl = `https://api.github.com/repos/${owner}/${repo}/contents/package.json`;
    const response = await axios.get(packageJsonUrl, { headers });

    // Decode package.json content from base64
    if (response.data.content) {
      const packageContent = Buffer.from(response.data.content, "base64").toString("utf-8");
      return calculatePinningScore(JSON.parse(packageContent));
    }

    logger.error(`package.json content not found for ${owner}/${repo}.`);
    console.error(`No package.json content found for ${owner}/${repo}.`);
    return null;
  } catch (error: any) {
    logger.error(`Failed to fetch package.json from GitHub for ${owner}/${repo}: ${error.message}`);
    console.error(`Error fetching package.json from GitHub for ${owner}/${repo}:`, error);
    return null;
  }
}

/**
 * Fetches and calculates the dependency pinning fraction from a local directory.
 * @param directoryPath The path to the local directory.
 * @returns The dependency pinning score as a number between 0 and 1, or null if failed.
 */
async function fetchAndCalculateFromLocal(directoryPath: string): Promise<number | null> {
  try {
    const packageJsonContent = await findPackageJson(directoryPath);
    return calculatePinningScore(JSON.parse(packageJsonContent));
  } catch (error: any) {
    logger.error(`Failed to read package.json from local path ${directoryPath}: ${error.message}`);
    console.error(`Error reading package.json from local path ${directoryPath}:`, error);
    return null;
  }
}

/**
 * Processes the dependency pinning from either a local path or a GitHub URL.
 * @param inputPath A GitHub repository URL or a local directory path.
 * @returns The dependency pinning score and the latency of the operation.
 */
export async function getDependencyPinningFraction(inputPath: string): Promise<DependencyResult> {
  const startTime = Date.now();
  let score: number = 0;

  // Determine if the input is a URL or a local path
  if (inputPath.startsWith("http")) {
    try {
      const token = getToken();
      const { owner, repo, headers } = get_axios_params(inputPath, token);
      score = await fetchAndCalculateFromGitHub(owner, repo, headers) ?? 0;
    } catch (error: any) {
      logger.error(`Failed to process GitHub URL ${inputPath}: ${error.message}`);
      score = 0;
    }
  } else {
    try {
      score = await fetchAndCalculateFromLocal(inputPath) ?? 0;
    } catch (error: any) {
      logger.error(`Failed to process local path ${inputPath}: ${error.message}`);
      score = 0;
    }
  }

  const latency = Date.now() - startTime;

  logger.info("Dependency Pinning calculation complete", {
    inputPath,
    score,
    latency,
  });

  return { score, latency };
}
