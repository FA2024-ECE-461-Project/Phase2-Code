// src/metrics/correctness.ts

import logger from "../logger";
import { getIssues, getPullRequests, get_axios_params, getToken } from "../url";

/**
 * Interface representing the Correctness result.
 */
export interface CorrectnessResult {
  score: number;
  latency: number;
}

/**
 * Calculates the Correctness metric for a given GitHub repository.
 * @param url GitHub repository URL.
 * @returns An object containing the Correctness score and latency.
 */
export async function getCorrectnessMetric(url: string): Promise<CorrectnessResult> {
  const startTime = Date.now();
  logger.info("Starting Correctness metric calculation", { url });

  try {
    const { owner, repo, headers } = get_axios_params(url, getToken());
    logger.debug(`Parsed owner: ${owner}, repo: ${repo}`);

    logger.debug("Fetching issues and pull requests data");
    const [openIssues, closedIssues, openPRs, closedPRs] = await Promise.all([
      getIssues(owner, repo, headers, 'open'),
      getIssues(owner, repo, headers, 'closed'),
      getPullRequests(owner, repo, headers, 'open'),
      getPullRequests(owner, repo, headers, 'closed'),
    ]);
    logger.debug(`Fetched issues and PRs: Open Issues=${openIssues}, Closed Issues=${closedIssues}, Open PRs=${openPRs}, Closed PRs=${closedPRs}`);

    const correctnessScore = calculateCorrectnessScore(openIssues, closedIssues, openPRs, closedPRs);
    const latency = Date.now() - startTime;

    logger.info("Correctness metric calculation complete", { url, score: correctnessScore, latency });
    return { score: correctnessScore, latency };
  } catch (error: any) {
    logger.error(`Error calculating Correctness metric: ${error.message}`);
    return { score: 0, latency: Date.now() - startTime };
  }
}

/**
 * Calculates the Correctness score based on issue resolution and PR merge rates.
 * @param openIssues Number of open issues.
 * @param closedIssues Number of closed issues.
 * @param openPRs Number of open pull requests.
 * @param closedPRs Number of closed pull requests.
 * @returns Correctness score between 0 and 1.
 */
function calculateCorrectnessScore(
  openIssues: number,
  closedIssues: number,
  openPRs: number,
  closedPRs: number
): number {
  logger.debug("Calculating Correctness score", {
    openIssues,
    closedIssues,
    openPRs,
    closedPRs,
  });

  const totalIssues = openIssues + closedIssues;
  const totalPRs = openPRs + closedPRs;

  if (totalIssues + totalPRs === 0) {
    logger.warn("No issues or PRs found for repository. Assigning Correctness score of 0.");
    return 0;
  }

  const issueResolutionRate = totalIssues > 0 ? closedIssues / totalIssues : 0;
  const prMergeRate = totalPRs > 0 ? closedPRs / totalPRs : 0;
  logger.debug(`Issue Resolution Rate: ${issueResolutionRate}`);
  logger.debug(`PR Merge Rate: ${prMergeRate}`);

  // Weight the scores
  const issueWeight = 0.6;
  const prWeight = 0.4;

  const weightedScore = issueResolutionRate * issueWeight + prMergeRate * prWeight;
  logger.debug(`Weighted Correctness Score: ${weightedScore}`);

  // Apply a logarithmic scale to favor repositories with more activity
  const activityFactor = Math.log10(totalIssues + totalPRs + 1) / Math.log10(101); // Normalize to 0-1 range
  logger.debug(`Activity Factor: ${activityFactor}`);

  const finalScore = weightedScore * (0.7 + 0.3 * activityFactor);
  logger.debug(`Final Correctness Score before clamping: ${finalScore}`);

  const clampedScore = Math.min(Math.max(finalScore, 0), 1); // Ensure score is between 0 and 1
  logger.debug(`Clamped Correctness Score: ${clampedScore}`);

  return clampedScore;
}
