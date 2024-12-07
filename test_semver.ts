import { classifyURL, extractNpmPackageName, getNpmPackageGitHubUrl, parseGitHubUrl, UrlType, getToken } from "./server/urlUtils";
import axios from "axios";
import * as dotenv from "dotenv";
import fs from 'fs';
import path from 'path';

dotenv.config();

// 1. Convert an NPM URL to a GitHub URL
export async function npmUrlToGitHubUrl(url: string): Promise<string | null> {
  const urlType = classifyURL(url);

  if (urlType === UrlType.NPM) {
    const packageName = extractNpmPackageName(url);
    if (!packageName) return null;

    const repoUrl = await getNpmPackageGitHubUrl(packageName);
    return repoUrl || null;
  }

  // If it's already a GitHub URL, just return it
  if (urlType === UrlType.GitHub) {
    return url;
  }

  // For other URL types, we cannot convert
  return null;
}

// 2. Get owner, repo, and default branch from a GitHub URL
export async function getOwnerRepoAndDefaultBranchFromGithubUrl(githubUrl: string): Promise<{ owner: string; repo: string; defaultBranch: string } | null> {
  const { owner, repo } = parseGitHubUrl(githubUrl);
  if (!owner || !repo) return null;

  const token = getToken();
  const headers = {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github.v3+json",
  };

  try {
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    const data = response.data;
    const defaultBranch = data.default_branch;
    return { owner, repo, defaultBranch };
  } catch (error) {
    console.error("Error fetching repository data:", (error as Error).message);
    return null;
  }
}

// 3. Download the zip file from GitHub
export async function downloadGitHubZip(
  owner: string,
  repo: string,
  branch: string,
  outputDir: string,
  fileName: string
): Promise<boolean> {
  try {
    // Construct the ZIP URL using the provided branch
    const zipUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/${branch}.zip`;

    const response = await axios.get(zipUrl, {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      },
      responseType: 'arraybuffer',
    });

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, fileName);
    fs.writeFileSync(outputPath, response.data);

    console.log(`File saved to: ${outputPath}`);
    return true;
  } catch (error) {
    console.error(`Error downloading the file: ${(error as Error).message}`);
    return false;
  }
}

(async () => {
    const npmUrl = "https://www.npmjs.com/package/lodash"; // Example NPM URL
  
    // 1. Convert NPM URL to GitHub URL
    const githubUrl = await npmUrlToGitHubUrl(npmUrl);
    if (!githubUrl) {
      console.error("Could not convert NPM URL to GitHub URL.");
      return;
    }
  
    // 2. Get owner, repo, and default branch
    const repoInfo = await getOwnerRepoAndDefaultBranchFromGithubUrl(githubUrl);
    if (!repoInfo) {
      console.error("Could not retrieve repository info.");
      return;
    }
  
    const { owner, repo, defaultBranch } = repoInfo;
  
    // 3. Download the ZIP file from the default branch
    const success = await downloadGitHubZip(owner, repo, defaultBranch, "./downloads", "repo.zip");
    if (!success) {
      console.error("Failed to download repository ZIP.");
    }
  })();