import * as dotenv from "dotenv";
import axios from "axios";

dotenv.config();

interface RepoContent {
  name: string;
  url: string;
}

interface ReadmeContent {
  content: string;
}

interface NpmPackageInfo {
  repository?: {
    url?: string;
  };
}

export type Headers = {
  Authorization: string;
  Accept: string;
};

export enum UrlType {
  GitHub,
  NPM,
  Other,
}

export function getToken(): string {
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    console.log("GITHUB_TOKEN is not set in .env file");
  }
  return githubToken as string;
}

export function classifyURL(url: string): UrlType {
  console.log("Classifying URL", { url });
  if (url.includes("github.com")) {
    return UrlType.GitHub;
  } else if (url.includes("npmjs.com") || url.startsWith("npm:")) {
    return UrlType.NPM;
  } else {
    return UrlType.Other;
  }
}

export function extractNpmPackageName(url: string): string | null {
  console.log("Extracting NPM package name", { url });
  const match = url.match(/npmjs\.com\/package\/([^/]+)/);
  return match ? match[1] : null;
}

export async function getNpmPackageGitHubUrl(
  packageName: string,
): Promise<string | null> {
  console.log("Fetching GitHub URL for NPM package", { packageName });
  try {
    const response = await axios.get<NpmPackageInfo>(
      `https://registry.npmjs.org/${packageName}`,
    );
    const repoUrl = response.data.repository?.url;

    if (repoUrl) {
      let cleanUrl = repoUrl.replace(/^git\+/, "").replace(/\.git$/, "");
      if (cleanUrl.startsWith("git://")) {
        cleanUrl = "https://" + cleanUrl.slice(6);
      }
      console.log("GitHub URL fetched for NPM package", {
        packageName,
        cleanUrl,
      });
      return cleanUrl;
    }
    console.log("No GitHub URL found for NPM package", { packageName });
    return null;
  } catch (error) {
    console.log("Error fetching NPM package info", {
      packageName,
      error: (error as Error).message,
    });
    return null;
  }
}

export function parseGitHubUrl(url: string): { owner: string; repo: string } {
  console.log("Parsing GitHub URL", { url });
  const match = url.match(/github.com\/([^/]+)\/([^/]+)/);
  return match ? { owner: match[1], repo: match[2] } : { owner: "", repo: "" };
}

function get_axios_params(url: string, token: string) {
  const regex = /github\.com[:/](?<owner>[^/]+)\/(?<repo>[^.]+)(\.git)?$/;
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

  const headers = {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github.v3+json",
  };

  return { owner, repo, headers };
}


