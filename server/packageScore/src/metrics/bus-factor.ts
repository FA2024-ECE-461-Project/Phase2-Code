// src/metrics/bus-factor.ts

import logger from "../logger";
import { getCommitsAndContributors, get_axios_params, getToken } from "../url";

/**
 * Interface representing the Bus Factor result.
 */
export interface BusFactorResult {
  score: number;
  latency: number;
}

/**
 * Calculates the Bus Factor metric for a given GitHub repository.
 * @param url GitHub repository URL.
 * @returns An object containing the Bus Factor score and latency.
 */
export async function get_bus_factor(url: string): Promise<BusFactorResult> {
  const startTime = Date.now();
  logger.info("Starting Bus Factor calculation", { url });

  try {
    const { owner, repo, headers } = get_axios_params(url, getToken());
    logger.debug(`Parsed owner: ${owner}, repo: ${repo}`);

    logger.debug("Fetching commits and contributors");
    const { commits, contributors } = await getCommitsAndContributors(owner, repo, headers);
    logger.debug(`Fetched ${commits.length} commits and ${contributors.length} contributors.`);

    // Implement Bus Factor calculation logic
    const busFactorScore = calculateBusFactor(commits, contributors);
    const latency = Date.now() - startTime;

    logger.info("Bus Factor calculation complete", { url, score: busFactorScore, latency });
    return { score: busFactorScore, latency };
  } catch (error: any) {
    logger.error(`Error calculating Bus Factor: ${error.message}`);
    return { score: 0, latency: Date.now() - startTime };
  }
}

/**
 * Calculates the Bus Factor score based on the number of contributors.
 * A higher number of contributors typically indicates a lower Bus Factor.
 * @param commits Array of commit objects.
 * @param contributors Array of contributor objects.
 * @returns Bus Factor score between 0 and 1.
 */
export function calculateBusFactor(commits: any[], contributors: any[]): number {
  logger.debug("Calculating Bus Factor score");

  const totalContributors = contributors.length;
  if (totalContributors === 0) {
    logger.warn("No contributors found. Assigning Bus Factor score of 0.");
    return 0;
  }

  // For simplicity, let's define Bus Factor as the ratio of top contributors
  // contributing to 50% of the commits.

  // Sort contributors by number of commits
  const sortedContributors = contributors
    .map((contributor) => ({
      login: contributor.login,
      contributions: contributor.contributions,
    }))
    .sort((a, b) => b.contributions - a.contributions);

  const totalCommits = commits.length;
  let cumulativeCommits = 0;
  let busFactorCount = 0;

  for (const contributor of sortedContributors) {
    cumulativeCommits += contributor.contributions;
    busFactorCount++;
    if (cumulativeCommits / totalCommits >= 0.5) {
      break;
    }
  }

  // Normalize Bus Factor score between 0 and 1
  // Higher busFactorCount indicates a healthier Bus Factor
  const normalizedScore = Math.min(busFactorCount / totalContributors, 1);
  logger.debug(`Bus Factor Count: ${busFactorCount}, Total Contributors: ${totalContributors}, Normalized Score: ${normalizedScore}`);

  return normalizedScore;
}
