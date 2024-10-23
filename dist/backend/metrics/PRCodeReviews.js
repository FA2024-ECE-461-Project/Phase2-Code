"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePRCodeReviews = calculatePRCodeReviews;
const logger_1 = __importDefault(require("../logger")); // Import the logger
const url_1 = require("../url");
async function calculatePRCodeReviews(url) {
    const startTime = Date.now();
    logger_1.default.info('Starting PR code reviews calculation', { url });
    try {
        const token = (0, url_1.getToken)();
        const { owner, repo, headers } = (0, url_1.get_axios_params)(url, token);
        logger_1.default.debug('Fetching closure and response times', { owner, repo });
        const ratioCodeReviewLines = await (0, url_1.getCodeReviewLines)(owner, repo, headers);
        const score = ratioCodeReviewLines ?? 0;
        const latency = Date.now() - startTime;
        logger_1.default.info('PR Code Reviews calculation complete', { url, score, latency });
        return { score, latency };
    }
    catch (error) {
        logger_1.default.error('Error calculating PR code reviews', { url, error: error.message });
        return { score: 0, latency: Date.now() - startTime };
    }
}
