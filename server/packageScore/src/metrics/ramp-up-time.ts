import { getReadmeContent, parseGitHubUrl } from '../url';
import logger from '../logger';

interface RampUpResult {
  score: number;
  latency: number;
}

export async function get_ramp_up_time_metric(url: string): Promise<RampUpResult> {
  const startTime = Date.now();
  logger.info('Starting ramp-up time metric calculation', { url });

  try {
    const { owner, repo } = parseGitHubUrl(url);
    logger.debug('Parsed GitHub URL', { owner, repo });

    const readmeContent = await getReadmeContent(owner, repo);
    logger.debug('Retrieved README content', { contentLength: readmeContent.length });

    const score = calculateRampUpScore(readmeContent);

    const latency = Date.now() - startTime;
    logger.info('Ramp-up time metric calculation complete', { url, score, latency });
    return { score, latency };
  } catch (error) {
    logger.error('Error calculating ramp-up time metric', { 
      url, 
      error: (error as Error).message 
    });
    return { score: 0, latency: Date.now() - startTime };
  }
}

function calculateRampUpScore(readmeContent: string): number {
  logger.debug('Calculating ramp-up score');

  if (!readmeContent.trim()) {
    logger.warn('Empty README content');
    return 0; // Return 0 for empty repositories
  }

  let score = 0;

  // Count Markdown headers
  const headerCount = (readmeContent.match(/^#{1,6}\s/gm) || []).length;
  score += Math.min(headerCount / 5, 0.3); // Cap at 0.3 for headers
  logger.debug('Header score calculated', { headerCount, headerScore: Math.min(headerCount / 5, 0.3) });

  // Check for code examples
  const codeBlockCount = (readmeContent.match(/```[\s\S]*?```/g) || []).length;
  score += Math.min(codeBlockCount / 3, 0.2); // Cap at 0.2 for code blocks
  logger.debug('Code block score calculated', { codeBlockCount, codeBlockScore: Math.min(codeBlockCount / 3, 0.2) });

  // Check for installation instructions
  if (/install|installation/i.test(readmeContent)) {
    score += 0.15;
    logger.debug('Installation instructions found');
  }

  // Check for usage examples
  if (/usage|example/i.test(readmeContent)) {
    score += 0.15;
    logger.debug('Usage examples found');
  }

  // Check for external documentation links
  const externalDocsRegex = /\[.*?\]\((https?:\/\/.*?)\)/g;
  const externalDocs = readmeContent.match(externalDocsRegex);
  const externalDocsScore = Math.min((externalDocs?.length || 0) * 0.05, 0.2);
  score += externalDocsScore; // Cap at 0.2 for external links
  logger.debug('External documentation links score calculated', { 
    externalDocsCount: externalDocs?.length || 0, 
    externalDocsScore 
  });

  // Normalize score to be between 0 and 1
  const finalScore = Math.min(1, score);
  logger.debug('Final ramp-up score calculated', { finalScore });
  return finalScore;
}