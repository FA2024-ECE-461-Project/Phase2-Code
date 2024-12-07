import {
  classifyURL,
  extractNpmPackageName,
  getNpmPackageGitHubUrl,
  parseGitHubUrl,
  UrlType,
  getToken,
} from "./urlUtils";

import axios from "axios";
import * as dotenv from "dotenv";
import AWS from 'aws-sdk';
import AdmZip from 'adm-zip';
import { string } from "zod";

dotenv.config();

interface NpmPackageInfo {
  repository?: {
    URL?: string;
  };
}

export const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID, // Ensure these are set in your environment
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Helper function to omit the 'id' field from an object
export function omitId<T extends { ID?: any }>(obj: T): Omit<T, "ID"> {
  const { ID, ...rest } = obj;
  return rest;
}

// Function to generate unique ID from package name and version
export function generatePackageId(Name: string, Version: string): string {
  return `${Name}@${Version}`;
}

export async function getPackageDataFromUrl(
  URL: string,
): Promise<{ Name: string | null; Version: string | null }> {
  // Initialize name and version to null
  let Name: string | null = null;
  let Version: string | null = null;

  // Classify the URL
  const urlType = classifyURL(URL);

  let githubUrl = URL; // Default to the input URL

  if (urlType === UrlType.NPM) {
    // It's an NPM URL
    const packageName = extractNpmPackageName(URL);
    if (packageName) {
      const repoUrl = await getNpmPackageGitHubUrl(packageName);
      if (repoUrl) {
        githubUrl = repoUrl;
      } else {
        // Cannot get GitHub URL from NPM package
        return { Name: null, Version: null };
      }
    } else {
      // Cannot extract package name from NPM URL
      return { Name: null, Version: null };
    }
  } else if (urlType !== UrlType.GitHub) {
    // Other URL type, cannot process
    return { Name: null, Version: null };
  }

  // Now we have the GitHub URL, parse it to get owner and repo
  const { owner, repo } = parseGitHubUrl(githubUrl);
  if (!owner || !repo) {
    return { Name: null, Version: null };
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

    if (content && encoding === "base64") {
      const packageJsonBuffer = Buffer.from(content, "base64");
      const packageJsonString = packageJsonBuffer.toString("utf8");
      const packageJson = JSON.parse(packageJsonString);

      // Get name and version from package.json
      Name = packageJson.name || null;
      Version = packageJson.version || null;
    } else {
      // Could not get content
      return { Name: null, Version: null };
    }
  } catch (error) {
    console.log("Error fetching package.json from GitHub repo", {
      owner,
      repo,
      error: (error as Error).message,
    });
    return { Name: null, Version: null };
  }

  return { Name, Version };
}

export async function uploadToS3(buffer: Buffer, key: string, contentType: string): Promise<{ success: boolean; url?: string; error?: string }> {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME!, // Ensure this environment variable is set
    Key: key, // e.g., 'packages/Default-Name-1.0.0.zip'
    Body: buffer,
    ContentType: contentType,
    ACL: 'private', // Ensures the file is not publicly accessible
  };

  try {
    await s3.putObject(params).promise();

    // Generate a pre-signed URL valid for 1 hour
    const url = s3.getSignedUrl('getObject', {
      Bucket: params.Bucket,
      Key: params.Key,
      Expires: 60 * 60, // 1 hour
    });

    return { success: true, url };
  } catch (error) {
    console.error(`Error uploading to S3: ${(error as Error).message}`);
    return { success: false, error: (error as Error).message };
  }
}


export function extractMetadataFromZip(buffer: Buffer): { Name: string; Version: string } {
  const zip = new AdmZip(buffer);
  const zipEntries = zip.getEntries();

  // Log all entries for debugging
  console.log("Zip Entries:");
  zipEntries.forEach(entry => {
    console.log(`- ${entry.entryName}`);
  });

  // Search for package.json in any directory within the zip
  const packageJsonEntry = zipEntries.find(entry => entry.entryName.endsWith('package.json'));

  if (!packageJsonEntry) {
    throw new Error('package.json not found in the zip file');
  }

  const packageJsonStr = packageJsonEntry.getData().toString('utf-8');

  let packageJson: { name?: string; version?: string };
  try {
    packageJson = JSON.parse(packageJsonStr);
  } catch (error) {
    throw new Error('Invalid package.json format');
  }

  const Name = packageJson.name || 'Default-Name';
  const Version = packageJson.version || '1.0.0';

  return { Name, Version };
}

export function removeDotGitFolderFromZip(buffer: Buffer): string {
  const zip = new AdmZip(buffer);
  const zipEntries = zip.getEntries();

  // Filter out the .git folder
  const newEntries = zipEntries.filter(entry => !entry.entryName.startsWith('.git/'));

  // Create a new zip file with the filtered entries
  const newZip = new AdmZip();
  newEntries.forEach(entry => {
    newZip.addFile(entry.entryName, entry.getData());
  });
  // encode new zip file to base64 string
  return newZip.toBuffer().toString('base64');
}

export async function downloadZipFromS3ToWorkingDirectory(key: string): Promise<string> {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME!, // Ensure this environment variable is set
    Key: key, // e.g., 'packages/Default-Name-1.0.0.zip'
  };
  try {
    const data = await s3.getObject(params).promise();
    const filePath = path.join(process.cwd(), path.basename(key));
    fs.writeFileSync(filePath, data.Body as Buffer);
    console.log('File downloaded successfully to:', filePath);
    return filePath;
  } catch(error) {
    console.error('Error downloading file:', error);
    throw error;
  }
}