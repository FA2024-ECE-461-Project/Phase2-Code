"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTimeDifferenceInHours = getTimeDifferenceInHours;
exports.calculateResponsivenessScore = calculateResponsivenessScore;
exports.calculateResponsiveness = calculateResponsiveness;
const url_1 = require("../url");
const logger_1 = __importDefault(require("../logger")); // Import the logger
const MAX_TIME_TO_CLOSE = 5 * 24; // max time for normalization in hours (5 days)
const MAX_TIME_TO_RESPOND = 36; // max time for response to pull request in hours (1.5 days)
function getTimeDifferenceInHours(start, end) {
    const startTime = new Date(start);
    const endTime = new Date(end);
    return (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
}
function normalizeTime(time, maxTime) {
    return Math.max(0, 1 - time / maxTime);
}
function calculateResponsivenessScore(closureTime, responseTime) {
    const closureScore = normalizeTime(closureTime, MAX_TIME_TO_CLOSE);
    const responseScore = normalizeTime(responseTime, MAX_TIME_TO_RESPOND);
    logger_1.default.debug('Calculated component scores', { closureScore, responseScore });
    return (0.6 * responseScore) + (0.4 * closureScore);
}
async function calculateResponsiveness(url) {
    const startTime = Date.now();
    logger_1.default.info('Starting responsiveness calculation', { url });
    try {
        const token = (0, url_1.getToken)();
        const { owner, repo, headers } = (0, url_1.get_axios_params)(url, token);
        logger_1.default.debug('Fetching closure and response times', { owner, repo });
        const [averageClosureTime, averageResponseTime] = await Promise.all([
            (0, url_1.get_avg_ClosureTime)(owner, repo, headers),
            (0, url_1.get_avg_Responsetime)(owner, repo, headers)
        ]);
        const closureTime = averageClosureTime ?? 0;
        const responseTime = averageResponseTime ?? 0;
        logger_1.default.debug('Fetched average times', { closureTime, responseTime });
        let score;
        if (closureTime === 0 && responseTime === 0) {
            logger_1.default.warn('No issues or pull requests found', { url });
            score = 0;
        }
        else {
            score = calculateResponsivenessScore(closureTime, responseTime);
        }
        const latency = Date.now() - startTime;
        logger_1.default.info('Responsiveness calculation complete', { url, score, latency });
        return { score, latency };
    }
    catch (error) {
        logger_1.default.error('Error calculating responsiveness', {
            url,
            error: error.message
        });
        return { score: 0, latency: Date.now() - startTime };
    }
}
