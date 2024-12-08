import {
  classifyURL,
  extractNpmPackageName,
  getNpmPackageGitHubUrl,
  parseGitHubUrl,
  UrlType,
  getToken,
} from "./urlUtils";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFileSync } from "fs";
import fs from 'fs';
import path from 'path';
import axios from "axios";
import * as dotenv from "dotenv";
import AWS from 'aws-sdk';
import AdmZip from 'adm-zip';
import { string } from "zod";
import { bool } from "aws-sdk/clients/signer";

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

export async function getPackageNameVersion(
  owner: string,
  repo: string,
): Promise<{ Name: string | null; Version: string | null }> {
  // Initialize name and version to null
  let Name: string | null = null;
  let Version: string | null = null;

  const headers = {
    Authorization: `token ${process.env.GITHUB_TOKEN}`,
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

export async function uploadToS3viaBuffer(buffer: Buffer, key: string, contentType: string): Promise<{ success: boolean; url?: string; error?: string }> {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME!, // Ensure this environment variable is set
    Key: key, // e.g., 'packages/Default-Name-1.0.0.zip'
    Body: buffer,
    ContentType: contentType,
    // ACL: 'private', // Ensures the file is not publicly accessible
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


export function extractMetadataFromZip(buffer: Buffer): { Name: string; Version: string, URL: string } {
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

  let packageJson: { name?: string; version?: string; repository?: {url?: string} };
  try {
    packageJson = JSON.parse(packageJsonStr);
  } catch (error) {
    throw new Error('Invalid package.json format');
  }

  const Name = packageJson.name || 'Default-Name';
  const Version = packageJson.version || '1.0.0';
  const URL = packageJson.repository?.url || "";

  return { Name, Version, URL };
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

// export async function downloadGitHubZip(
//   githubUrl: string,
//   outputDir: string,
//   fileName: string
// ): Promise<boolean> {
//   try {

//     // Make an HTTP GET request to fetch the ZIP file

//     const match = githubUrl.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)$/);
//     if (!match) {
//       throw new Error("Invalid GitHub repository URL format.");
//     }
//     const [_, owner, repo] = match;
//     // Construct the ZIP URL
//     const zipUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/master.zip`;

//     const Zipresponse = await axios.get(zipUrl, {
//       headers: {
//         Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, // Add your GitHub token in the environment
//       },
//       responseType: 'arraybuffer', // Ensures the response data is in binary format
//     });

//     // Create the output directory if it doesn't exist
//     if (!fs.existsSync(outputDir)) {
//       fs.mkdirSync(outputDir, { recursive: true });
//     }

//     // Define the output file path
//     const outputPath = path.join(outputDir, fileName);

//     // Write the file to disk
//     fs.writeFileSync(outputPath, Zipresponse.data);

//     console.log(`File saved to: ${outputPath}`);
//     return true;
//   } catch (error) {
//     console.error(
//       `Error downloading the file: ${(error as Error).message}`
//     );
//     return false;
//   }
// }

export const uploadToS3viaFile = async (
  filePath: string,
  objectKey: string
): Promise<void> => {
  try {
    // Create an S3 client
    const s3Client = new S3Client({ region: process.env.AWS_REGION }); // Replace with your S3 region in the environment variable

    // Read the file content
    const fileContent = readFileSync(filePath);

    // Prepare the upload command
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME, // Replace with your S3 bucket name
      Key: objectKey, // The name of the file in S3
      Body: fileContent,
    });

    // Upload the file
    const response = await s3Client.send(command);
    console.log("File uploaded successfully:", response);
  } catch (error) {
    console.error("Error uploading file:", (error as Error).message);
  }
};


export const getPackageJsonUrl = (zipContent: string): string | null => {
  try {
    // Load the ZIP content
    const zip = new AdmZip(zipContent);

    zip.extractAllTo("downloads", true);
    // Find all entries in the ZIP file
    const entries = zip.getEntries();

    // Locate the package.json file
    const packageJsonEntry = entries.find(entry => entry.entryName.endsWith("package.json"));
    if (!packageJsonEntry) {
      throw new Error("package.json not found in the ZIP file.");
    }

    // Read the content of package.json
    const packageJsonContent = packageJsonEntry.getData().toString("utf8");
    const packageJson = JSON.parse(packageJsonContent);

    // Extract the URL field
    let url = packageJson?.repository.url || null;

    // Remove 'git+' prefix if present
    if (url.startsWith("git+")) {
      url = url.slice(4); // Remove the first 4 characters ('git+')
    }
    return url;
  } catch (error) {
    console.error("Error processing ZIP file:", (error as Error).message);
    return null;
  }
};

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

export function removeDownloadedFile(filePath: string): boolean{
  fs.unlinkSync(filePath);
  if(!fs.existsSync(filePath)){
    console.log('File removed successfully:', filePath);
    return true;
  }
  return false;
}


export function isMoreRecentVersion(newVersion: string, latestVersion: string): boolean {
  const newParts = newVersion.split(".").map(Number);
  const latestParts = latestVersion.split(".").map(Number);

  for (let i = 0; i < Math.max(newParts.length, latestParts.length); i++) {
    const newPart = newParts[i] || 0; // Default to 0 if undefined
    const latestPart = latestParts[i] || 0;

    if (newPart > latestPart) {
      return true;
    } else if (newPart < latestPart) {
      return false;
    }
  }

  // If all parts are equal
  return false;
}
