import { getToken, get_axios_params, getOpenIssues, getClosedIssues, getOpenPRs, getClosedPRs } from '../url';
import logger from '../logger';  // Import the logger

interface CorrectnessResult {
  score: number;
  latency: number;
}

export async function getCorrectnessMetric(gitHubUrl: string): Promise<CorrectnessResult> {
  const startTime = Date.now();
  logger.info('Starting correctness metric calculation', { url: gitHubUrl });
  
  try {
    const token = getToken();
    const { owner, repo, headers } = get_axios_params(gitHubUrl, token);
    
    logger.debug('Fetching issues and pull requests data', { owner, repo });
    // Fetch data for issues and pull requests concurrently
    const [openIssues, closedIssues, openPRs, closedPRs] = await Promise.all([
      getOpenIssues(owner, repo, headers),
      getClosedIssues(owner, repo, headers),
      getOpenPRs(owner, repo, headers),
      getClosedPRs(owner, repo, headers)
    ]);

    const totalIssues = openIssues + closedIssues;
    const totalPRs = openPRs + closedPRs;

    logger.debug('Fetched repository statistics', { 
      openIssues, closedIssues, totalIssues, 
      openPRs, closedPRs, totalPRs 
    });

    // Calculate correctness score
    const correctnessScore = calculateCorrectnessScore(totalIssues, closedIssues, totalPRs, closedPRs);

    const latency = Date.now() - startTime;

    logger.info('Correctness metric calculation complete', { 
      url: gitHubUrl, 
      score: correctnessScore, 
      latency 
    });

    return {
      score: correctnessScore,
      latency
    };
  } catch (error) {
    logger.error('Error calculating correctness metric', { 
      url: gitHubUrl, 
      error: (error as Error).message 
    });
    return {
      score: 0,
      latency: Date.now() - startTime
    };
  }
}

function calculateCorrectnessScore(totalIssues: number, closedIssues: number, totalPRs: number, closedPRs: number): number {
  logger.debug('Calculating correctness score', { 
    totalIssues, closedIssues, totalPRs, closedPRs 
  });

  if (totalIssues + totalPRs === 0) {
    logger.warn('No issues or PRs found for repository');
    return 0; // If there are no issues or PRs, return 0
  }

  const issueResolutionRate = totalIssues > 0 ? closedIssues / totalIssues : 0;
  const prMergeRate = totalPRs > 0 ? closedPRs / totalPRs : 0;

  // Weight the scores
  const issueWeight = 0.6;
  const prWeight = 0.4;

  const weightedScore = (issueResolutionRate * issueWeight) + (prMergeRate * prWeight);

  // Apply a logarithmic scale to favor repositories with more activity
  const activityFactor = Math.log10(totalIssues + totalPRs + 1) / Math.log10(101); // Normalize to 0-1 range
  
  const finalScore = weightedScore * (0.7 + 0.3 * activityFactor);

  const clampedScore = Math.min(Math.max(finalScore, 0), 1); // Ensure score is between 0 and 1

  logger.debug('Correctness score calculated', { 
    issueResolutionRate, 
    prMergeRate, 
    weightedScore, 
    activityFactor, 
    finalScore, 
    clampedScore 
  });

  return clampedScore;
}