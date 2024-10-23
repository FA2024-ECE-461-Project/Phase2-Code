"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UrlType = void 0;
exports.getToken = getToken;
exports.test_API = test_API;
exports.getOpenPRs = getOpenPRs;
exports.getClosedPRs = getClosedPRs;
exports.classifyURL = classifyURL;
exports.extractNpmPackageName = extractNpmPackageName;
exports.getNpmPackageGitHubUrl = getNpmPackageGitHubUrl;
exports.parseGitHubUrl = parseGitHubUrl;
exports.get_axios_params = get_axios_params;
exports.getReadmeContent = getReadmeContent;
exports.test_getReadmeContent = test_getReadmeContent;
exports.get_avg_ClosureTime = get_avg_ClosureTime;
exports.getComments = getComments;
exports.get_avg_Responsetime = get_avg_Responsetime;
exports.getIssues = getIssues;
exports.getOpenIssues = getOpenIssues;
exports.getClosedIssues = getClosedIssues;
exports.getCommitsAndContributors = getCommitsAndContributors;
exports.getCodeReviewLines = getCodeReviewLines;
const dotenv = __importStar(require("dotenv"));
const axios_1 = __importDefault(require("axios"));
const responsive = __importStar(require("./metrics/responsiveness"));
const logger_1 = __importDefault(require("./logger")); // Import the logger
dotenv.config();
var UrlType;
(function (UrlType) {
    UrlType[UrlType["GitHub"] = 0] = "GitHub";
    UrlType[UrlType["NPM"] = 1] = "NPM";
    UrlType[UrlType["Other"] = 2] = "Other";
})(UrlType || (exports.UrlType = UrlType = {}));
function getToken() {
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
        logger_1.default.error('GITHUB_TOKEN is not set in .env file');
    }
    return githubToken;
}
function test_API() {
    const githubToken = getToken();
    const OWNER = 'nikivakil';
    const REPO = '461-team';
    const getPullRequestCount = async () => {
        try {
            const response = await axios_1.default.get(`https://api.github.com/repos/${OWNER}/${REPO}/pulls?state=all`, {
                headers: {
                    Authorization: `token ${githubToken}`
                }
            });
            logger_1.default.info(`Number of pull requests: ${response.data.length}`, { owner: OWNER, repo: REPO });
        }
        catch (error) {
            logger_1.default.error('Error fetching pull requests', { error: error.message, owner: OWNER, repo: REPO });
        }
    };
    getPullRequestCount();
}
async function getOpenPRs(owner, repo, headers) {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls?state=open`;
    logger_1.default.debug('Fetching open PRs', { owner, repo });
    const response = await axios_1.default.get(apiUrl, { headers });
    logger_1.default.debug('Open PRs fetched', { count: response.data.length, owner, repo });
    return response.data.length;
}
async function getClosedPRs(owner, repo, headers) {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls?state=closed`;
    logger_1.default.debug('Fetching closed PRs', { owner, repo });
    const response = await axios_1.default.get(apiUrl, { headers });
    logger_1.default.debug('Closed PRs fetched', { count: response.data.length, owner, repo });
    return response.data.length;
}
function classifyURL(url) {
    logger_1.default.debug('Classifying URL', { url });
    if (url.includes('github.com')) {
        return UrlType.GitHub;
    }
    else if (url.includes('npmjs.com') || url.startsWith('npm:')) {
        return UrlType.NPM;
    }
    else {
        return UrlType.Other;
    }
}
function extractNpmPackageName(url) {
    logger_1.default.debug('Extracting NPM package name', { url });
    const match = url.match(/npmjs\.com\/package\/([^/]+)/);
    return match ? match[1] : null;
}
async function getNpmPackageGitHubUrl(packageName) {
    logger_1.default.debug('Fetching GitHub URL for NPM package', { packageName });
    try {
        const response = await axios_1.default.get(`https://registry.npmjs.org/${packageName}`);
        const repoUrl = response.data.repository?.url;
        if (repoUrl) {
            let cleanUrl = repoUrl.replace(/^git\+/, '').replace(/\.git$/, '');
            if (cleanUrl.startsWith('git://')) {
                cleanUrl = 'https://' + cleanUrl.slice(6);
            }
            logger_1.default.debug('GitHub URL fetched for NPM package', { packageName, cleanUrl });
            return cleanUrl;
        }
        logger_1.default.warn('No GitHub URL found for NPM package', { packageName });
        return null;
    }
    catch (error) {
        logger_1.default.error('Error fetching NPM package info', { packageName, error: error.message });
        return null;
    }
}
function parseGitHubUrl(url) {
    logger_1.default.debug('Parsing GitHub URL', { url });
    const match = url.match(/github.com\/([^/]+)\/([^/]+)/);
    return match ? { owner: match[1], repo: match[2] } : { owner: '', repo: '' };
}
function get_axios_params(url, token) {
    const { owner, repo } = parseGitHubUrl(url);
    const headers = {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json'
    };
    logger_1.default.debug('Generated axios parameters', { owner, repo });
    return { owner, repo, headers };
}
async function getReadmeContent(owner, repo) {
    logger_1.default.info('Fetching README content', { owner, repo });
    const token = getToken();
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents`;
    const headers = {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
    };
    try {
        const response = await axios_1.default.get(apiUrl, { headers });
        const readmeFile = response.data.find(file => file.name.toLowerCase().startsWith('readme'));
        if (!readmeFile) {
            logger_1.default.warn('README file not found', { owner, repo });
            throw new Error('README file not found');
        }
        const readmeResponse = await axios_1.default.get(readmeFile.url, { headers });
        const decodedContent = Buffer.from(readmeResponse.data.content, 'base64').toString('utf-8');
        logger_1.default.debug('README content fetched successfully', { owner, repo, contentLength: decodedContent.length });
        return decodedContent;
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error)) {
            logger_1.default.error('API request failed', { owner, repo, status: error.response?.status, statusText: error.response?.statusText });
            throw new Error(`API request failed: ${error.response?.status} ${error.response?.statusText}`);
        }
        logger_1.default.error('Error fetching README content', { owner, repo, error: error.message });
        throw error;
    }
}
function test_getReadmeContent() {
    const OWNER = 'nikivakil';
    const REPO = '461-team';
    getReadmeContent(OWNER, REPO)
        .then(readmeContent => logger_1.default.info('README content fetched', { owner: OWNER, repo: REPO, contentLength: readmeContent.length }))
        .catch(error => logger_1.default.error('Error fetching README content', { owner: OWNER, repo: REPO, error: error.message }));
}
async function get_avg_ClosureTime(owner, repo, headers) {
    logger_1.default.debug('Calculating average closure time', { owner, repo });
    try {
        const response = await axios_1.default.get(`https://api.github.com/repos/${owner}/${repo}/issues?state=closed`, { headers });
        let totalClosureTime = 0;
        let totalIssues = 0;
        for (const issue of response.data) {
            if (issue.state === 'closed') {
                totalClosureTime += responsive.getTimeDifferenceInHours(issue.created_at, issue.closed_at);
                totalIssues++;
            }
        }
        if (totalIssues === 0) {
            logger_1.default.warn('No closed issues found', { owner, repo });
            return 0;
        }
        const avgClosureTime = totalClosureTime / totalIssues;
        logger_1.default.debug('Average closure time calculated', { owner, repo, avgClosureTime });
        return avgClosureTime;
    }
    catch (error) {
        logger_1.default.error('Error calculating average closure time', { owner, repo, error: error.message });
    }
}
async function getComments(owner, repo, number, headers) {
    logger_1.default.debug('Fetching comments', { owner, repo, prNumber: number });
    try {
        const response = await axios_1.default.get(`https://api.github.com/repos/${owner}/${repo}/issues/${number}/comments`, { headers });
        logger_1.default.debug('Comments fetched', { owner, repo, prNumber: number, commentCount: response.data.length });
        return response.data;
    }
    catch (error) {
        logger_1.default.error('Error fetching comments', { owner, repo, prNumber: number, error: error.message });
        return [];
    }
}
async function get_avg_Responsetime(owner, repo, headers) {
    logger_1.default.debug('Calculating average response time', { owner, repo });
    try {
        const Pulls = await axios_1.default.get(`https://api.github.com/repos/${owner}/${repo}/pulls?state=all`, { headers });
        let total_Pulls = 0;
        let total = 0;
        for (const pull of Pulls.data) {
            const PR_number = pull.number;
            const comments = await getComments(owner, repo, PR_number, headers);
            if (comments.length == 0) {
                total_Pulls++;
                continue;
            }
            else if (comments.length == 1) {
                total += responsive.getTimeDifferenceInHours(pull.created_at, comments[0].created_at);
            }
            else {
                comments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                total += responsive.getTimeDifferenceInHours(pull.created_at, comments[0].created_at);
            }
            total_Pulls++;
        }
        if (total_Pulls == 0) {
            logger_1.default.warn('No pull requests found', { owner, repo });
            return 0;
        }
        const avgResponseTime = total / total_Pulls;
        logger_1.default.debug('Average response time calculated', { owner, repo, avgResponseTime });
        return avgResponseTime;
    }
    catch (error) {
        logger_1.default.error('Error calculating average response time', { owner, repo, error: error.message });
    }
}
async function getIssues(owner, repo) {
    logger_1.default.debug('Fetching all issues', { owner, repo });
    const token = getToken();
    const { headers } = get_axios_params(`https://github.com/${owner}/${repo}`, token);
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/issues?state=all`;
    try {
        const response = await axios_1.default.get(apiUrl, { headers });
        logger_1.default.debug('Issues fetched', { owner, repo, issueCount: response.data.length });
        return response.data;
    }
    catch (error) {
        logger_1.default.error('Error fetching issues', { owner, repo, error: error.message });
        throw error;
    }
}
async function getOpenIssues(owner, repo, headers) {
    logger_1.default.debug('Fetching open issues', { owner, repo });
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/issues?state=open`;
    const response = await axios_1.default.get(apiUrl, { headers });
    logger_1.default.debug('Open issues fetched', { owner, repo, count: response.data.length });
    return response.data.length;
}
async function getClosedIssues(owner, repo, headers) {
    logger_1.default.debug('Fetching closed issues', { owner, repo });
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/issues?state=closed`;
    const response = await axios_1.default.get(apiUrl, { headers });
    logger_1.default.debug('Closed issues fetched', { owner, repo, count: response.data.length });
    return response.data.length;
}
async function getCommitsAndContributors(owner, repo, headers) {
    logger_1.default.debug('Fetching commits and contributors', { owner, repo });
    const commitsUrl = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=100`;
    const contributorsUrl = `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=100`;
    try {
        const [commitsResponse, contributorsResponse] = await Promise.all([
            axios_1.default.get(commitsUrl, { headers }),
            axios_1.default.get(contributorsUrl, { headers })
        ]);
        logger_1.default.debug('Commits and contributors fetched', {
            owner,
            repo,
            commitCount: commitsResponse.data.length,
            contributorCount: contributorsResponse.data.length
        });
        return {
            commits: commitsResponse.data,
            contributors: contributorsResponse.data
        };
    }
    catch (error) {
        logger_1.default.error('Error fetching commits and contributors', { owner, repo, error: error.message });
        return { commits: [], contributors: [] };
    }
}
async function getCodeReviewLines(owner, repo, headers) {
    logger_1.default.debug('Calculating number of lines that were code reviewed', { owner, repo });
    try {
        const Pulls = await axios_1.default.get(`https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=100`, { headers });
        let totalLinesAdded = 0;
        let reviewedLinesAdded = 0;
        if (Pulls.data.length == 0) {
            logger_1.default.warn('No pull requests found', { owner, repo });
            return 0;
        }
        for (const pull of Pulls.data) {
            const prData = await axios_1.default.get(`https://api.github.com/repos/${owner}/${repo}/pulls/${pull.number}`, { headers });
            totalLinesAdded += prData.data.additions;
            const reviewsUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${pull.number}/reviews`;
            const reviews = await axios_1.default.get(reviewsUrl, { headers });
            if (reviews.data.length > 0) {
                // If the PR has reviews, add its additions to the reviewed lines count
                reviewedLinesAdded += prData.data.additions;
            }
        }
        if (totalLinesAdded == 0) {
            logger_1.default.warn('No lines added found', { owner, repo });
            return 0;
        }
        if (reviewedLinesAdded == 0) {
            logger_1.default.warn('No lines reviewed found', { owner, repo });
            return 0;
        }
        const ratioReviewedLinesAdded = (reviewedLinesAdded / totalLinesAdded);
        logger_1.default.debug('Calculated values for lines that were code reviewed', { owner, repo, reviewedLinesAdded, totalLinesAdded, ratioReviewedLinesAdded });
        return ratioReviewedLinesAdded;
    }
    catch (error) {
        logger_1.default.error('Error calculating number of lines added through code reviews', { owner, repo, error: error.message });
    }
}
