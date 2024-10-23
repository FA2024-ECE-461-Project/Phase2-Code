"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCorrectnessMetric = getCorrectnessMetric;
const url_1 = require("../url");
const logger_1 = __importDefault(require("../logger")); // Import the logger
async function getCorrectnessMetric(gitHubUrl) {
    const startTime = Date.now();
    logger_1.default.info('Starting correctness metric calculation', { url: gitHubUrl });
    try {
        const token = (0, url_1.getToken)();
        const { owner, repo, headers } = (0, url_1.get_axios_params)(gitHubUrl, token);
        logger_1.default.debug('Fetching issues and pull requests data', { owner, repo });
        // Fetch data for issues and pull requests concurrently
        const [openIssues, closedIssues, openPRs, closedPRs] = await Promise.all([
            (0, url_1.getOpenIssues)(owner, repo, headers),
            (0, url_1.getClosedIssues)(owner, repo, headers),
            (0, url_1.getOpenPRs)(owner, repo, headers),
            (0, url_1.getClosedPRs)(owner, repo, headers)
        ]);
        const totalIssues = openIssues + closedIssues;
        const totalPRs = openPRs + closedPRs;
        logger_1.default.debug('Fetched repository statistics', {
            openIssues, closedIssues, totalIssues,
            openPRs, closedPRs, totalPRs
        });
        // Calculate correctness score
        const correctnessScore = calculateCorrectnessScore(totalIssues, closedIssues, totalPRs, closedPRs);
        const latency = Date.now() - startTime;
        logger_1.default.info('Correctness metric calculation complete', {
            url: gitHubUrl,
            score: correctnessScore,
            latency
        });
        return {
            score: correctnessScore,
            latency
        };
    }
    catch (error) {
        logger_1.default.error('Error calculating correctness metric', {
            url: gitHubUrl,
            error: error.message
        });
        return {
            score: 0,
            latency: Date.now() - startTime
        };
    }
}
function calculateCorrectnessScore(totalIssues, closedIssues, totalPRs, closedPRs) {
    logger_1.default.debug('Calculating correctness score', {
        totalIssues, closedIssues, totalPRs, closedPRs
    });
    if (totalIssues + totalPRs === 0) {
        logger_1.default.warn('No issues or PRs found for repository');
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
    logger_1.default.debug('Correctness score calculated', {
        issueResolutionRate,
        prMergeRate,
        weightedScore,
        activityFactor,
        finalScore,
        clampedScore
    });
    return clampedScore;
}
