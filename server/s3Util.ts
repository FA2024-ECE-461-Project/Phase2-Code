import fs from 'fs';
import path from 'path';
import AWS from 'aws-sdk';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Initialize S3 client
export const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID, // Ensure these are set in your environment
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
  });

export function encodeBase64(filePath: string): string {
    // Read the file in binary format
    const fileData = fs.readFileSync(filePath);

    // Convert the binary data to Base64
    const base64Data = fileData.toString('base64');

    return base64Data;
    // console.log("File encoded to Base64 and saved to ${outputFilePath}");
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