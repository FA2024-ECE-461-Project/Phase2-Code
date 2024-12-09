import logger from "../logger"; // Import the logger
import { getToken, get_axios_params, getCodeReviewLines } from "../url";

interface PRCodeReviewsResult {
  score: number;
  latency: number;
}

export async function calculatePRCodeReviews(
  url: string,
): Promise<PRCodeReviewsResult> {
  const startTime = Date.now();
  console.log(`Starting PR code reviews calculation for URL: ${url}`); // Logging the start
  logger.info("Starting PR code reviews calculation", { url });

  try {
    const token = getToken();
    console.log("Token retrieved successfully."); // Confirm token retrieval
    const { owner, repo, headers } = get_axios_params(url, token);
    console.log(`Repo details - Owner: ${owner}, Repository: ${repo}`); // Log the repository details

    logger.debug("Fetching closure and response times", { owner, repo });
    const ratioCodeReviewLines = await getCodeReviewLines(owner, repo, headers);
    console.log(`Fetched code review lines ratio: ${ratioCodeReviewLines}`); // Log fetched data

    let score = ratioCodeReviewLines ?? 0;
    const latency = Date.now() - startTime;
    
    console.log(`PR Code Reviews calculation completed. Score: ${score}, Latency: ${latency}ms`); // Final output log
    logger.info("PR Code Reviews calculation complete", {
      url,
      score,
      latency,
    });

    return { score, latency };
  } catch (error) {
    logger.error("Error calculating PR code reviews", {
      url,
      error: (error as Error).message,
    });
    console.error(`Error during PR code reviews calculation: ${error.message}`); // Error log
    return { score: 0, latency: Date.now() - startTime };
  }
}
