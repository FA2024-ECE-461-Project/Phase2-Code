import { 
    classifyURL, 
    extractNpmPackageName, 
    getNpmPackageGitHubUrl, 
    parseGitHubUrl, 
    UrlType,
    getToken
} from "./urlUtils";

import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

interface NpmPackageInfo {
  repository?: {
    url?: string;
  };
}

// Helper function to omit the 'id' field from an object
export function omitId<T extends { id?: any }>(obj: T): Omit<T, 'id'> {
const { id, ...rest } = obj;
return rest;
}

// Function to generate unique ID from package name and version
export function generatePackageId(name: string, version: string): string {
    return `${name}@${version}`;
}

export async function getPackageDataFromUrl(
  url: string,
): Promise<{ name: string | null; version: string | null }> {
  // Initialize name and version to null
  let name: string | null = null;
  let version: string | null = null;

  // Classify the URL
  const urlType = classifyURL(url);

  let githubUrl = url; // Default to the input URL

  if (urlType === UrlType.NPM) {
    // It's an NPM URL
    const packageName = extractNpmPackageName(url);
    if (packageName) {
      const repoUrl = await getNpmPackageGitHubUrl(packageName);
      if (repoUrl) {
        githubUrl = repoUrl;
      } else {
        // Cannot get GitHub URL from NPM package
        return { name: null, version: null };
      }
    } else {
      // Cannot extract package name from NPM URL
      return { name: null, version: null };
    }
  } else if (urlType !== UrlType.GitHub) {
    // Other URL type, cannot process
    return { name: null, version: null };
  }

  // Now we have the GitHub URL, parse it to get owner and repo
  const { owner, repo } = parseGitHubUrl(githubUrl);
  if (!owner || !repo) {
    return { name: null, version: null };
  }

  // Get the GitHub token
  const token = getToken();
  const headers = {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github.v3+json",
  };

  try {
    // Fetch the package.json file from the GitHub repo
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contents/package.json`,
      { headers },
    );

    const content = response.data.content;
    const encoding = response.data.encoding;

    if (content && encoding === 'base64') {
      const packageJsonBuffer = Buffer.from(content, 'base64');
      const packageJsonString = packageJsonBuffer.toString('utf8');
      const packageJson = JSON.parse(packageJsonString);

      // Get name and version from package.json
      name = packageJson.name || null;
      version = packageJson.version || null;
    } else {
      // Could not get content
      return { name: null, version: null };
    }
  } catch (error) {
    console.log("Error fetching package.json from GitHub repo", {
      owner,
      repo,
      error: (error as Error).message,
    });
    return { name: null, version: null };
  }

  return { name, version };
}
