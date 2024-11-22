import axios from 'axios';
import { getToken, parseGitHubUrl, get_axios_params, getCommitsAndContributors} from '../url';
import logger from '../logger';

interface BusFactorResult {
  busFactor: number;
  normalizedScore: number;
  latency: number;
}

function calculateBusFactor(commits: any[], contributors: any[]): Omit<BusFactorResult, 'latency'> {
    logger.debug('Calculating bus factor', { commitCount: commits.length, contributorCount: contributors.length });
    
    const commitCounts: { [key: string]: number } = {};
    
    commits.forEach(commit => {
      const author = commit.commit.author.name;
      commitCounts[author] = (commitCounts[author] || 0) + 1;
    });
  
    const totalCommits = commits.length;
    const totalContributors = contributors.length;
  
    if (totalCommits === 0 || totalContributors === 0) {
      logger.warn('Repository has no commits or contributors', { totalCommits, totalContributors });
      return { busFactor: 1, normalizedScore: 0 };
    }
  
    const sortedContributions = Object.values(commitCounts).sort((a, b) => b - a);
    
    let accumulatedCommits = 0;
    let busFactor = 0;
  
    for (const count of sortedContributions) {
      accumulatedCommits += count;
      busFactor++;
      if (accumulatedCommits > totalCommits * 0.8) break; // Increased from 0.5 to 0.8
    }
  
    const normalizedScore = normalizeScore(busFactor, totalContributors, totalCommits);
  
    logger.debug('Bus factor calculation complete', { busFactor, normalizedScore });
    return { busFactor, normalizedScore };
  }

function normalizeScore(busFactor: number, totalContributors: number, totalCommits: number): number {
  logger.debug('Normalizing bus factor score', { busFactor, totalContributors, totalCommits });
  
  if (totalContributors === 0 || totalCommits < 20) {
    logger.warn('Repository has too few contributors or commits for meaningful score', { totalContributors, totalCommits });
    return 0; // Penalize repos with very few commits
  }

  const contributorRatio = busFactor / totalContributors;
  const commitThreshold = Math.min(totalCommits / 100, 1000); // Adjust based on repo size

  let score = contributorRatio * (totalCommits / commitThreshold);
  
  // Penalize projects with very few contributors
  if (totalContributors < 3) {
    logger.info('Applying penalty for low contributor count', { totalContributors });
    score *= 0.5;
  }

  const finalScore = Math.max(0, Math.min(1, score));
  logger.debug('Normalized score calculated', { finalScore });
  return finalScore;
}

export async function get_bus_factor(url: string): Promise<BusFactorResult> {
    const startTime = Date.now();
    logger.info('Starting bus factor calculation', { url });
  
    try {
      const { owner, repo, headers } = get_axios_params(url, getToken());
      logger.debug('Fetching commits and contributors', { owner, repo });
      const { commits, contributors } = await getCommitsAndContributors(owner, repo, headers);
      const result = calculateBusFactor(commits, contributors);
  
      const latency = Date.now() - startTime;
      logger.info('Bus factor calculation complete', { url, latency, ...result });
  
      return { ...result, latency };
    } catch (error) {
      logger.error('Error calculating bus factor', { url, error: (error as Error).message });
      return { busFactor: 1, normalizedScore: 0, latency: 0 };
    }
  }