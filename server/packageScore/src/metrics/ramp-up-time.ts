// src/metrics/ramp-up-time.ts

import { getReadmeContent, parseGitHubUrl, get_axios_params, getToken } from "../url";
import logger from "../logger";

/**
 * Interface representing the Ramp-Up Time result.
 */
export interface RampUpResult {
  score: number;
  latency: number;
}

/**
 * Calculates the ramp-up score based on README content.
 * @param readmeContent The content of the README file.
 * @returns Ramp-up score between 0 and 1.
 */
function calculateRampUpScore(readmeContent: string): number {
  logger.debug("Calculating ramp-up score");

  if (!readmeContent.trim()) {
    logger.warn("Empty README content. Assigning Ramp-Up score of 0.");
    return 0; // Return 0 for empty repositories
  }

  let score = 0;

  // Count Markdown headers
  const headerCount = (readmeContent.match(/^#{1,6}\s/gm) || []).length;
  const headerScore = Math.min(headerCount / 5, 0.3);
  score += headerScore;
  logger.debug(`Header count: ${headerCount}, Header score: ${headerScore}`);

  // Check for code examples
  const codeBlockCount = (readmeContent.match(/```[\s\S]*?```/g) || []).length;
  const codeBlockScore = Math.min(codeBlockCount / 3, 0.2);
  score += codeBlockScore;
  logger.debug(`Code block count: ${codeBlockCount}, Code block score: ${codeBlockScore}`);

  // Check for installation instructions
  const hasInstallation = /install|installation/i.test(readmeContent);
  if (hasInstallation) {
    score += 0.15;
    logger.debug("Installation instructions found. Added 0.15 to Ramp-Up score.");
  }

  // Check for usage examples
  const hasUsage = /usage|example/i.test(readmeContent);
  if (hasUsage) {
    score += 0.15;
    logger.debug("Usage examples found. Added 0.15 to Ramp-Up score.");
  }

  // Check for external documentation links
  const externalDocsRegex = /\[.*?\]\((https?:\/\/.*?)\)/g;
  const externalDocs = readmeContent.match(externalDocsRegex);
  const externalDocsCount = externalDocs ? externalDocs.length : 0;
  const externalDocsScore = Math.min(externalDocsCount * 0.05, 0.2);
  score += externalDocsScore;
  logger.debug(`External documentation links count: ${externalDocsCount}, External docs score: ${externalDocsScore}`);

  // Normalize score to be between 0 and 1
  const finalScore = Math.min(1, score);
  logger.debug(`Final Ramp-Up Score: ${finalScore}`);

  return finalScore;
}

/**
 * Fetches README content and calculates the Ramp-Up Time metric.
 * @param url GitHub repository URL.
 * @returns RampUpResult containing the score and latency.
 */
export async function get_ramp_up_time_metric(url: string): Promise<RampUpResult> {
  const startTime = Date.now();
  logger.info("Starting Ramp-Up Time metric calculation", { url });

  try {
    const { owner, repo, headers } = get_axios_params(url, getToken());
    logger.debug(`Parsed GitHub URL - Owner: ${owner}, Repo: ${repo}`);

    logger.debug("Retrieving README content");
    const readmeContent = await getReadmeContent(owner, repo);
    logger.debug(`Retrieved README content of length: ${readmeContent.length}`);

    const score = calculateRampUpScore(readmeContent);
    logger.debug(`Ramp-Up Score: ${score}`);

    const latency = Date.now() - startTime;
    logger.info("Ramp-Up Time metric calculation complete", { url, score, latency });

    return { score, latency };
  } catch (error: any) {
    logger.error(`Error calculating Ramp-Up Time metric: ${error.message}`);
    return { score: 0, latency: Date.now() - startTime };
  }
}
