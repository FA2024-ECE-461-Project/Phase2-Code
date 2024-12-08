import fs from 'fs';
import path from 'path';
import AWS from 'aws-sdk';

export const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID, // Ensure these are set in your environment
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  });

export async function downloadZipFromS3(
  key: string,
  destinationDir: string
): Promise<string> {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME!, // Ensure this environment variable is set
    Key: key, // e.g., 'packages/Default-Name-1.0.0.zip'
  };

  try {
    const data = await s3.getObject(params).promise();

    // Ensure the directory exists
    if (!fs.existsSync(destinationDir)) {
      fs.mkdirSync(destinationDir, { recursive: true });
    }

    // Construct the file path using the specified directory
    const filePath = path.join(destinationDir, path.basename(key));
    fs.writeFileSync(filePath, data.Body as Buffer);

    console.log("File downloaded successfully to:", filePath);
    return filePath;
  } catch (error) {
    console.error("Error downloading file:", error);
    throw error;
  }
}

// Example usage:
// await downloadZipFromS3("packages/easy-math-module-2.0.3.zip", "./downloads");

//test downloadZipFromS3ToWorkingDirectory
downloadZipFromS3("packages/cross-fetch-4.0.0.zip", "./packages");