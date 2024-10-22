"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_bus_factor = get_bus_factor;
const url_1 = require("../url");
const logger_1 = __importDefault(require("../logger"));
function calculateBusFactor(commits, contributors) {
    logger_1.default.debug('Calculating bus factor', { commitCount: commits.length, contributorCount: contributors.length });
    const commitCounts = {};
    commits.forEach(commit => {
        const author = commit.commit.author.name;
        commitCounts[author] = (commitCounts[author] || 0) + 1;
    });
    const totalCommits = commits.length;
    const totalContributors = contributors.length;
    if (totalCommits === 0 || totalContributors === 0) {
        logger_1.default.warn('Repository has no commits or contributors', { totalCommits, totalContributors });
        return { busFactor: 1, normalizedScore: 0 };
    }
    const sortedContributions = Object.values(commitCounts).sort((a, b) => b - a);
    let accumulatedCommits = 0;
    let busFactor = 0;
    for (const count of sortedContributions) {
        accumulatedCommits += count;
        busFactor++;
        if (accumulatedCommits > totalCommits * 0.8)
            break; // Increased from 0.5 to 0.8
    }
    const normalizedScore = normalizeScore(busFactor, totalContributors, totalCommits);
    logger_1.default.debug('Bus factor calculation complete', { busFactor, normalizedScore });
    return { busFactor, normalizedScore };
}
function normalizeScore(busFactor, totalContributors, totalCommits) {
    logger_1.default.debug('Normalizing bus factor score', { busFactor, totalContributors, totalCommits });
    if (totalContributors === 0 || totalCommits < 20) {
        logger_1.default.warn('Repository has too few contributors or commits for meaningful score', { totalContributors, totalCommits });
        return 0; // Penalize repos with very few commits
    }
    const contributorRatio = busFactor / totalContributors;
    const commitThreshold = Math.min(totalCommits / 100, 1000); // Adjust based on repo size
    let score = contributorRatio * (totalCommits / commitThreshold);
    // Penalize projects with very few contributors
    if (totalContributors < 3) {
        logger_1.default.info('Applying penalty for low contributor count', { totalContributors });
        score *= 0.5;
    }
    const finalScore = Math.max(0, Math.min(1, score));
    logger_1.default.debug('Normalized score calculated', { finalScore });
    return finalScore;
}
async function get_bus_factor(url) {
    const startTime = Date.now();
    logger_1.default.info('Starting bus factor calculation', { url });
    try {
        const { owner, repo, headers } = (0, url_1.get_axios_params)(url, (0, url_1.getToken)());
        logger_1.default.debug('Fetching commits and contributors', { owner, repo });
        const { commits, contributors } = await (0, url_1.getCommitsAndContributors)(owner, repo, headers);
        const result = calculateBusFactor(commits, contributors);
        const latency = Date.now() - startTime;
        logger_1.default.info('Bus factor calculation complete', { url, latency, ...result });
        return { ...result, latency };
    }
    catch (error) {
        logger_1.default.error('Error calculating bus factor', { url, error: error.message });
        return { busFactor: 1, normalizedScore: 0, latency: 0 };
    }
}
