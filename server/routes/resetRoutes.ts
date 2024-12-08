import { Hono } from "hono";
import {
  packageMetadata as packageMetadataTable,
  packageData as packageDataTable,
  packageRating as packageRatingTable,
  packages as packagesTable,
} from "../db/schemas/packageSchemas";
import { db } from "../db";
import AWS from "aws-sdk";

// Initialize S3 client
const s3 = new AWS.S3({
  region: process.env.AWS_REGION, // e.g., 'us-west-2'
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// Specify your S3 bucket name
const BUCKET_NAME = process.env.S3_BUCKET_NAME!;

// Helper function to delete all objects in the bucket
const emptyS3Bucket = async (): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    let isTruncated = true;
    let continuationToken: string | undefined;

    while (isTruncated) {
      const listParams: AWS.S3.ListObjectsV2Request = {
        Bucket: BUCKET_NAME,
        ContinuationToken: continuationToken,
      };

      const listData = await s3.listObjectsV2(listParams).promise();
      const objectsToDelete = (listData.Contents || []).map((object) => ({
        Key: object.Key!,
      }));

      if (objectsToDelete.length > 0) {
        const deleteParams: AWS.S3.DeleteObjectsRequest = {
          Bucket: BUCKET_NAME,
          Delete: { Objects: objectsToDelete, Quiet: true },
        };

        await s3.deleteObjects(deleteParams).promise();
        console.log(
          `Deleted ${objectsToDelete.length} objects from S3 bucket.`,
        );
      }

      isTruncated = listData.IsTruncated || false;
      continuationToken = listData.NextContinuationToken;
    }

    return { success: true };
  } catch (error) {
    console.error("Error emptying S3 bucket:", error);
    return { success: false, error: (error as Error).message };
  }
};

// Example Hono route that resets both DB and S3
export const resetRoutes = new Hono().delete("/", async (c) => {
  try {
    // Clear database tables
    await db.delete(packageMetadataTable);
    await db.delete(packageDataTable);
    await db.delete(packageRatingTable);
    await db.delete(packagesTable);

    // Delete all S3 objects
    const s3ResetResult = await emptyS3Bucket();

    if (!s3ResetResult.success) {
      console.error("S3 Bucket Reset Failed:", s3ResetResult.error);
      return c.json(
        {
          message: "Database reset successful, but failed to reset S3 bucket.",
          error: s3ResetResult.error,
        },
        500,
      );
    }

    return c.json({ message: "All data successfully reset." }, 200);
  } catch (error) {
    console.error("Error resetting data:", error);
    return c.json({ message: "Failed to reset data." }, 500);
  }
});
