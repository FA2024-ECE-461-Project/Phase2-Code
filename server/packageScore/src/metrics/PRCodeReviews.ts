// src/metrics/PRCodeReviews.ts

import logger from "../logger";
import { getCodeReviewLines, get_axios_params, getToken } from "../url";

/**
 * Interface representing the PR Code Reviews result.
 */
export interface PRCodeReviewsResult {
  score: number;
  latency: number;
}

/**
 * Calculates PR Code Reviews score based on code review lines ratio.
 * @param url GitHub repository URL.
 * @returns PRCodeReviewsResult containing the score and latency.
 */
export async function calculatePRCodeReviews(
  url: string,
): Promise<PRCodeReviewsResult> {
  const startTime = Date.now();
  logger.info("Starting PR Code Reviews calculation", { url });

  try {
    const { owner, repo, headers } = get_axios_params(url, getToken());
    logger.debug(`Parsed owner: ${owner}, repo: ${repo}`);

    logger.debug("Fetching code review lines ratio");
    const ratioCodeReviewLines = await getCodeReviewLines(owner, repo, headers);
    logger.debug(`Fetched code review lines ratio: ${ratioCodeReviewLines}`);

    let score = ratioCodeReviewLines ?? 0;
    logger.debug(`Initial PR Code Reviews score: ${score}`);

    const latency = Date.now() - startTime;
    logger.info("PR Code Reviews calculation complete", { url, score, latency });

    return { score, latency };
  } catch (error: any) {
    logger.error(`Error calculating PR Code Reviews: ${error.message}`);
    return { score: 0, latency: Date.now() - startTime };
  }
}
