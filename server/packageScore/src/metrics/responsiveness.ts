// src/metrics/responsiveness.ts

import logger from "../logger";
import { get_avg_ClosureTime, get_avg_Responsetime, get_axios_params, getToken } from "../url";

/**
 * Interface representing the Responsiveness result.
 */
export interface ResponsivenessResult {
  score: number;
  latency: number;
}

const MAX_TIME_TO_CLOSE = 5 * 24; // max time for normalization in hours (5 days)
const MAX_TIME_TO_RESPOND = 36; // max time for response to pull request in hours (1.5 days)

/**
 * Normalizes a time value against a maximum threshold.
 * @param time The time value to normalize.
 * @param maxTime The maximum time threshold.
 * @returns Normalized time between 0 and 1.
 */
function normalizeTime(time: number, maxTime: number): number {
  const normalized = Math.max(0, 1 - time / maxTime);
  logger.debug(`Normalized time: ${normalized} (time: ${time}, maxTime: ${maxTime})`);
  return normalized;
}

/**
 * Calculates the Responsiveness score based on closure and response times.
 * @param closureTime Average time to close issues in hours.
 * @param responseTime Average response time to PRs in hours.
 * @returns Responsiveness score between 0 and 1.
 */
function calculateResponsivenessScore(
  closureTime: number,
  responseTime: number,
): number {
  logger.debug("Calculating Responsiveness score", { closureTime, responseTime });

  const closureScore = normalizeTime(closureTime, MAX_TIME_TO_CLOSE);
  const responseScore = normalizeTime(responseTime, MAX_TIME_TO_RESPOND);
  logger.debug(`Closure Score: ${closureScore}, Response Score: ${responseScore}`);

  const finalScore = 0.6 * responseScore + 0.4 * closureScore;
  logger.debug(`Final Responsiveness Score: ${finalScore}`);

  return finalScore;
}

/**
 * Calculates the Responsiveness metric for a given GitHub repository.
 * @param url GitHub repository URL.
 * @returns ResponsivenessResult containing the score and latency.
 */
export async function calculateResponsiveness(url: string): Promise<ResponsivenessResult> {
  const startTime = Date.now();
  logger.info("Starting Responsiveness calculation", { url });

  try {
    const { owner, repo, headers } = get_axios_params(url, getToken());
    logger.debug(`Parsed owner: ${owner}, repo: ${repo}`);

    logger.debug("Fetching average closure and response times");
    const [averageClosureTime, averageResponseTime] = await Promise.all([
      get_avg_ClosureTime(owner, repo, headers),
      get_avg_Responsetime(owner, repo, headers),
    ]);
    logger.debug(`Average Closure Time: ${averageClosureTime} hours`);
    logger.debug(`Average Response Time: ${averageResponseTime} hours`);

    const closureTime = averageClosureTime ?? 0;
    const responseTime = averageResponseTime ?? 0;
    logger.debug(`Closure Time: ${closureTime} hours, Response Time: ${responseTime} hours`);

    let score: number;
    if (closureTime === 0 && responseTime === 0) {
      logger.warn("No issues or pull requests found. Assigning Responsiveness score of 0.");
      score = 0;
    } else {
      score = calculateResponsivenessScore(closureTime, responseTime);
      logger.debug(`Responsiveness Score: ${score}`);
    }

    const latency = Date.now() - startTime;
    logger.info("Responsiveness calculation complete", { url, score, latency });

    return { score, latency };
  } catch (error: any) {
    logger.error(`Error calculating Responsiveness: ${error.message}`);
    const latency = Date.now() - startTime;
    logger.debug("Responsiveness calculation failed. Assigning score of 0.");
    return { score: 0, latency };
  }
}
