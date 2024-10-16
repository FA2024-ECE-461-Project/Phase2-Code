import { getToken, get_axios_params, get_avg_ClosureTime, get_avg_Responsetime } from '../url';
import logger from '../logger';  // Import the logger

interface ResponsivenessResult {
  score: number;
  latency: number;
}

const MAX_TIME_TO_CLOSE = 5 * 24; // max time for normalization in hours (5 days)
const MAX_TIME_TO_RESPOND = 36; // max time for response to pull request in hours (1.5 days)

export function getTimeDifferenceInHours(start: string, end: string): number {
  const startTime = new Date(start);
  const endTime = new Date(end);
  return (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
}

function normalizeTime(time: number, maxTime: number): number {
  return Math.max(0, 1 - time / maxTime);
}

export function calculateResponsivenessScore(closureTime: number, responseTime: number): number {
  const closureScore = normalizeTime(closureTime, MAX_TIME_TO_CLOSE);
  const responseScore = normalizeTime(responseTime, MAX_TIME_TO_RESPOND);
  logger.debug('Calculated component scores', { closureScore, responseScore });
  return (0.6 * responseScore) + (0.4 * closureScore);
}

export async function calculateResponsiveness(url: string): Promise<ResponsivenessResult> {
  const startTime = Date.now();
  logger.info('Starting responsiveness calculation', { url });
  
  try {
    const token = getToken();
    const { owner, repo, headers } = get_axios_params(url, token);
    logger.debug('Fetching closure and response times', { owner, repo });

    const [averageClosureTime, averageResponseTime] = await Promise.all([
      get_avg_ClosureTime(owner, repo, headers),
      get_avg_Responsetime(owner, repo, headers)
    ]);

    const closureTime = averageClosureTime ?? 0;
    const responseTime = averageResponseTime ?? 0;
    logger.debug('Fetched average times', { closureTime, responseTime });

    let score: number;
    if (closureTime === 0 && responseTime === 0) {
      logger.warn('No issues or pull requests found', { url });
      score = 0;
    } else {
      score = calculateResponsivenessScore(closureTime, responseTime);
    }

    const latency = Date.now() - startTime;
    logger.info('Responsiveness calculation complete', { url, score, latency });

    return { score, latency };
  } catch (error) {
    logger.error('Error calculating responsiveness', { 
      url, 
      error: (error as Error).message 
    });
    return { score: 0, latency: Date.now() - startTime };
  }
}