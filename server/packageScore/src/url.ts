// src/url.ts

import axios from "axios";
import logger from "./logger";

/**
 * Enum representing different URL types.
 */
export enum UrlType {
  GitHub = "GitHub",
  NPM = "NPM",
  Other = "Other",
}

/**
 * Retrieves the GitHub API token from environment variables.
 * @returns GitHub API token as a string.
 */
export function getToken(): string {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GitHub API token is not set in environment variables.");
  }
  return token;
}

/**
 * Parses the GitHub repository URL to extract the owner and repository name.
 * Sanitizes the repository name by removing the '.git' suffix if present.
 * @param url GitHub repository URL.
 * @returns An object containing the owner and sanitized repository name.
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } {
  const regex = /github\.com[:/](?<owner>[^/]+)\/(?<repo>[^/.]+)(\.git)?$/;
  const match = url.match(regex);

  if (!match || !match.groups) {
    throw new Error("Invalid GitHub repository URL.");
  }

  const owner = match.groups.owner;
  let repo = match.groups.repo;

  // Remove the .git suffix if present
  if (repo.endsWith(".git")) {
    repo = repo.slice(0, -4);
  }

  return { owner, repo };
}

/**
 * Constructs Axios parameters including headers for GitHub API requests.
 * @param url GitHub repository URL.
 * @param token GitHub API token.
 * @returns An object containing owner, sanitized repo, and headers.
 */
export function get_axios_params(
  url: string,
  token: string
): { owner: string; repo: string; headers: any } {
  const { owner, repo } = parseGitHubUrl(url);
  const headers = {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github.v3+json",
  };
  return { owner, repo, headers };
}

/**
 * Classifies a URL into its type: GitHub, NPM, or Other.
 * @param url The URL to classify.
 * @returns The classified UrlType.
 */
export function classifyURL(url: string): UrlType {
  if (/^https?:\/\/github\.com\/[^/]+\/[^/]+(\.git)?$/.test(url)) {
    return UrlType.GitHub;
  } else if (/^https?:\/\/www\.npmjs\.com\/package\/[^/]+$/.test(url)) {
    return UrlType.NPM;
  } else {
    return UrlType.Other;
  }
}

/**
 * Extracts the NPM package name from an NPM package URL.
 * @param url The NPM package URL.
 * @returns The NPM package name or null if extraction fails.
 */
export function extractNpmPackageName(url: string): string | null {
  const regex = /^https?:\/\/www\.npmjs\.com\/package\/([^/]+)$/;
  const match = url.match(regex);
  return match && match[1] ? match[1] : null;
}

/**
 * Fetches the GitHub URL associated with an NPM package.
 * @param packageName The NPM package name.
 * @returns The GitHub repository URL or null if not found.
 */
export async function getNpmPackageGitHubUrl(packageName: string): Promise<string | null> {
  try {
    const response = await axios.get(`https://registry.npmjs.org/${packageName}`);
    const repository = response.data.repository;
    if (repository && repository.url) {
      // Extract GitHub URL from repository URL
      const githubRegex = /github\.com[:/](?<owner>[^/]+)\/(?<repo>[^/]+)(\.git)?$/;
      const match = repository.url.match(githubRegex);
      if (match && match.groups) {
        const owner = match.groups.owner;
        let repo = match.groups.repo;
        // Remove the .git suffix if present
        if (repo.endsWith(".git")) {
          repo = repo.slice(0, -4);
        }
        return `https://github.com/${owner}/${repo}`;
      }
    }
    return null;
  } catch (error: any) {
    logger.error(`Error fetching NPM package data for ${packageName}: ${error.message}`);
    return null;
  }
}

/**
 * Fetches all commits and contributors from the repository's default branch.
 * @param owner Repository owner.
 * @param repo Repository name.
 * @param headers Axios headers including authorization.
 * @returns An object containing arrays of commits and contributors.
 */
export async function getCommitsAndContributors(
  owner: string,
  repo: string,
  headers: any
): Promise<{ commits: any[]; contributors: any[] }> {
  try {
    // Fetch repository details to get the default branch
    const repoResponse = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    const defaultBranch = repoResponse.data.default_branch;
    logger.debug(`Default branch: ${defaultBranch}`);

    // Fetch commits from the default branch (handling pagination)
    let commits: any[] = [];
    let page = 1;
    const per_page = 100;

    while (true) {
      const commitsResponse = await axios.get(`https://api.github.com/repos/${owner}/${repo}/commits`, {
        headers,
        params: { sha: defaultBranch, per_page, page },
      });
      if (commitsResponse.data.length === 0) break;
      commits = commits.concat(commitsResponse.data);
      logger.debug(`Fetched ${commitsResponse.data.length} commits on page ${page}. Total commits: ${commits.length}`);
      page++;
    }

    // Fetch contributors (handling pagination)
    let contributors: any[] = [];
    page = 1;

    while (true) {
      const contributorsResponse = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contributors`, {
        headers,
        params: { per_page, page },
      });
      if (contributorsResponse.data.length === 0) break;
      contributors = contributors.concat(contributorsResponse.data);
      logger.debug(`Fetched ${contributorsResponse.data.length} contributors on page ${page}. Total contributors: ${contributors.length}`);
      page++;
    }

    return { commits, contributors };
  } catch (error: any) {
    logger.error(`Error fetching commits and contributors: ${error.message}`);
    throw error;
  }
}

/**
 * Fetches open or closed issues with pagination.
 * @param owner Repository owner.
 * @param repo Repository name.
 * @param headers Axios headers including authorization.
 * @param state Issue state: 'open', 'closed', or 'all'.
 * @returns Total number of issues matching the state.
 */
export async function getIssues(
  owner: string,
  repo: string,
  headers: any,
  state: 'open' | 'closed' | 'all' = 'all'
): Promise<number> {
  let page = 1;
  const per_page = 100;
  let totalIssues = 0;

  while (true) {
    try {
      const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/issues`, {
        headers,
        params: { state, per_page, page },
      });

      const issues = response.data.filter((issue: any) => !issue.pull_request);
      if (issues.length === 0) break;

      totalIssues += issues.length;
      logger.debug(`Fetched ${issues.length} ${state} issues on page ${page}. Total issues: ${totalIssues}`);
      page++;
    } catch (error: any) {
      logger.error(`Error fetching ${state} issues on page ${page}: ${error.message}`);
      break;
    }
  }

  return totalIssues;
}

/**
 * Fetches open or closed pull requests with pagination.
 * @param owner Repository owner.
 * @param repo Repository name.
 * @param headers Axios headers including authorization.
 * @param state PR state: 'open', 'closed', or 'all'.
 * @returns Total number of pull requests matching the state.
 */
export async function getPullRequests(
  owner: string,
  repo: string,
  headers: any,
  state: 'open' | 'closed' | 'all' = 'all'
): Promise<number> {
  let page = 1;
  const per_page = 100;
  let totalPRs = 0;

  while (true) {
    try {
      const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
        headers,
        params: { state, per_page, page },
      });

      const prs = response.data;
      if (prs.length === 0) break;

      totalPRs += prs.length;
      logger.debug(`Fetched ${prs.length} ${state} PRs on page ${page}. Total PRs: ${totalPRs}`);
      page++;
    } catch (error: any) {
      logger.error(`Error fetching ${state} PRs on page ${page}: ${error.message}`);
      break;
    }
  }

  return totalPRs;
}

/**
 * Fetches the number of merged pull requests.
 * @param owner Repository owner.
 * @param repo Repository name.
 * @param headers Axios headers including authorization.
 * @returns Number of merged pull requests.
 */
export async function getMergedPRs(
  owner: string,
  repo: string,
  headers: any
): Promise<number> {
  try {
    const totalClosedPRs = await getPullRequests(owner, repo, headers, 'closed');
    // GitHub API does not provide a direct count of merged PRs, so we need to fetch them
    let mergedPRs = 0;
    let page = 1;
    const per_page = 100;

    while (page <= Math.ceil(totalClosedPRs / per_page)) {
      const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
        headers,
        params: { state: 'closed', per_page, page },
      });

      const prs = response.data;
      if (prs.length === 0) break;

      prs.forEach((pr: any) => {
        if (pr.merged_at) {
          mergedPRs++;
        }
      });

      page++;
    }

    logger.debug(`Total merged PRs: ${mergedPRs}`);
    return mergedPRs;
  } catch (error: any) {
    logger.error(`Error fetching merged PRs: ${error.message}`);
    return 0;
  }
}

/**
 * Fetches the content of the README file.
 * @param owner Repository owner.
 * @param repo Repository name.
 * @returns Content of the README file as a string.
 */
export async function getReadmeContent(owner: string, repo: string): Promise<string> {
  try {
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/readme`, {
      headers: {
        Accept: "application/vnd.github.v3.raw",
      },
    });
    return response.data;
  } catch (error: any) {
    logger.error(`Error fetching README content: ${error.message}`);
    throw error;
  }
}

/**
 * Fetches code review lines ratio. Placeholder function; implement as needed.
 * @param owner Repository owner.
 * @param repo Repository name.
 * @param headers Axios headers including authorization.
 * @returns Ratio of code review lines (number between 0 and 1).
 */
export async function getCodeReviewLines(
  owner: string,
  repo: string,
  headers: any
): Promise<number | undefined> {
  try {
    // Implement your logic to calculate code review lines ratio
    // Placeholder: Calculate the ratio of lines added in code reviews vs total lines
    // This requires analyzing PR diffs which can be complex. Here, we'll return a mock value.
    // You need to implement actual logic based on your requirements.
    return 0.5; // Example ratio
  } catch (error: any) {
    logger.error(`Error fetching code review lines ratio: ${error.message}`);
    return undefined;
  }
}

/**
 * Fetches the average time to close issues in hours.
 * @param owner Repository owner.
 * @param repo Repository name.
 * @param headers Axios headers including authorization.
 * @returns Average closure time in hours.
 */
export async function get_avg_ClosureTime(
  owner: string,
  repo: string,
  headers: any
): Promise<number | undefined> {
  try {
    const closedIssues = await getIssues(owner, repo, headers, 'closed');
    if (closedIssues === 0) return 0;

    // To calculate average closure time, fetch closed issues and compute the time difference
    let totalClosureTime = 0;
    let page = 1;
    const per_page = 100;

    while (true) {
      const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/issues`, {
        headers,
        params: { state: 'closed', per_page, page },
      });

      const issues = response.data.filter((issue: any) => !issue.pull_request);
      if (issues.length === 0) break;

      issues.forEach((issue: any) => {
        const createdAt = new Date(issue.created_at);
        const closedAt = new Date(issue.closed_at);
        const diffHours = (closedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        totalClosureTime += diffHours;
      });

      page++;
    }

    const averageClosureTime = totalClosureTime / closedIssues;
    logger.debug(`Average Closure Time: ${averageClosureTime} hours`);
    return averageClosureTime;
  } catch (error: any) {
    logger.error(`Error fetching average closure time: ${error.message}`);
    return undefined;
  }
}

/**
 * Fetches the average response time to pull requests in hours.
 * @param owner Repository owner.
 * @param repo Repository name.
 * @param headers Axios headers including authorization.
 * @returns Average response time in hours.
 */
export async function get_avg_Responsetime(
  owner: string,
  repo: string,
  headers: any
): Promise<number | undefined> {
  try {
    const closedPRs = await getPullRequests(owner, repo, headers, 'closed');
    if (closedPRs === 0) return 0;

    // To calculate average response time, fetch closed PRs and compute the time difference between PR creation and first comment
    let totalResponseTime = 0;
    let countedPRs = 0;
    let page = 1;
    const per_page = 100;

    while (countedPRs < closedPRs) {
      const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
        headers,
        params: { state: 'closed', per_page, page },
      });

      const prs = response.data;
      if (prs.length === 0) break;

      for (const pr of prs) {
        if (pr.merged_at) {
          const prCreatedAt = new Date(pr.created_at);

          // Fetch comments for the PR
          const commentsResponse = await axios.get(pr.comments_url, { headers });
          const comments = commentsResponse.data;

          if (comments.length > 0) {
            const firstComment = new Date(comments[0].created_at);
            const diffHours = (firstComment.getTime() - prCreatedAt.getTime()) / (1000 * 60 * 60);
            totalResponseTime += diffHours;
            countedPRs++;
          }
        }
      }

      page++;
    }

    const averageResponseTime = countedPRs > 0 ? totalResponseTime / countedPRs : 0;
    logger.debug(`Average Response Time: ${averageResponseTime} hours`);
    return averageResponseTime;
  } catch (error: any) {
    logger.error(`Error fetching average response time: ${error.message}`);
    return undefined;
  }
}
