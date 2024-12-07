import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export async function downloadGitHubZip(
    githubUrl: string,
    outputDir: string,
    fileName: string,
  ): Promise<string> {
    try {
      console.log(`Starting download from: ${githubUrl}`);
      
      // Make an HTTP GET request to fetch the ZIP file
      const response = await axios.get(githubUrl, {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json', // Optional: Ensures GitHub API compatibility
        },
        responseType: 'arraybuffer', // Ensures the response data is in binary format
      });
  
      // Create the output directory if it doesn't exist
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
  
      // Define the output file path
      const outputPath = path.join(outputDir, fileName);
  
      // Write the file to disk
      fs.writeFileSync(outputPath, response.data);
  
      // console.log(`File saved to: ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error(`Error downloading the file: ${(error as Error).message}`);
      return '';
    }
  }

// Example usage:
const githubUrl = 'https://github.com/ryanve/unlicensed/archive/refs/heads/master.zip'; // Replace with the GitHub ZIP file URL
const outputDir = './downloads'; // Replace with your desired output directory
const fileName = 'repository-main.zip'; // Replace with your desired file name


downloadGitHubZip(githubUrl, outputDir, fileName)
  .then(() => console.log('Download completed successfully.'))
  .catch((error) => console.error('Download failed:', error));