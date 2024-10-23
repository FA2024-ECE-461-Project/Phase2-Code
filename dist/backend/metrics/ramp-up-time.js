"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_ramp_up_time_metric = get_ramp_up_time_metric;
const url_1 = require("../url");
const logger_1 = __importDefault(require("../logger"));
async function get_ramp_up_time_metric(url) {
    const startTime = Date.now();
    logger_1.default.info('Starting ramp-up time metric calculation', { url });
    try {
        const { owner, repo } = (0, url_1.parseGitHubUrl)(url);
        logger_1.default.debug('Parsed GitHub URL', { owner, repo });
        const readmeContent = await (0, url_1.getReadmeContent)(owner, repo);
        logger_1.default.debug('Retrieved README content', { contentLength: readmeContent.length });
        const score = calculateRampUpScore(readmeContent);
        const latency = Date.now() - startTime;
        logger_1.default.info('Ramp-up time metric calculation complete', { url, score, latency });
        return { score, latency };
    }
    catch (error) {
        logger_1.default.error('Error calculating ramp-up time metric', {
            url,
            error: error.message
        });
        return { score: 0, latency: Date.now() - startTime };
    }
}
function calculateRampUpScore(readmeContent) {
    logger_1.default.debug('Calculating ramp-up score');
    if (!readmeContent.trim()) {
        logger_1.default.warn('Empty README content');
        return 0; // Return 0 for empty repositories
    }
    let score = 0;
    // Count Markdown headers
    const headerCount = (readmeContent.match(/^#{1,6}\s/gm) || []).length;
    score += Math.min(headerCount / 5, 0.3); // Cap at 0.3 for headers
    logger_1.default.debug('Header score calculated', { headerCount, headerScore: Math.min(headerCount / 5, 0.3) });
    // Check for code examples
    const codeBlockCount = (readmeContent.match(/```[\s\S]*?```/g) || []).length;
    score += Math.min(codeBlockCount / 3, 0.2); // Cap at 0.2 for code blocks
    logger_1.default.debug('Code block score calculated', { codeBlockCount, codeBlockScore: Math.min(codeBlockCount / 3, 0.2) });
    // Check for installation instructions
    if (/install|installation/i.test(readmeContent)) {
        score += 0.15;
        logger_1.default.debug('Installation instructions found');
    }
    // Check for usage examples
    if (/usage|example/i.test(readmeContent)) {
        score += 0.15;
        logger_1.default.debug('Usage examples found');
    }
    // Check for external documentation links
    const externalDocsRegex = /\[.*?\]\((https?:\/\/.*?)\)/g;
    const externalDocs = readmeContent.match(externalDocsRegex);
    const externalDocsScore = Math.min((externalDocs?.length || 0) * 0.05, 0.2);
    score += externalDocsScore; // Cap at 0.2 for external links
    logger_1.default.debug('External documentation links score calculated', {
        externalDocsCount: externalDocs?.length || 0,
        externalDocsScore
    });
    // Normalize score to be between 0 and 1
    const finalScore = Math.min(1, score);
    logger_1.default.debug('Final ramp-up score calculated', { finalScore });
    return finalScore;
}
