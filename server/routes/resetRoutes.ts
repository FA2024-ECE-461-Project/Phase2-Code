import { Hono } from "hono";
import {
  packages as packagesTable,
  packageMetadata as packageMetadataTable,
  packageData as packageDataTable,
} from "../db/schemas/packageSchemas";
import { db } from "../db";


import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME!;

const emptyS3Bucket = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    let isTruncated = true;
    let continuationToken: string | undefined;

    while (isTruncated) {
      const listParams: AWS.S3.ListObjectsV2Request = {
        Bucket: BUCKET_NAME,
        ContinuationToken: continuationToken,
      };

      const listData = await s3.listObjectsV2(listParams).promise();
      const objectsToDelete = (listData.Contents || []).map((object) => ({ Key: object.Key! }));

      if (objectsToDelete.length > 0) {
        const deleteParams: AWS.S3.DeleteObjectsRequest = {
          Bucket: BUCKET_NAME,
          Delete: { Objects: objectsToDelete },
        };

        await s3.deleteObjects(deleteParams).promise();
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

export const resetRoutes = new Hono().delete("/", async (c) => {
  try {
    // Perform the reset: Clear all related tables
    await db.delete(packagesTable).execute();
    await db.delete(packageMetadataTable).execute();
    await db.delete(packageDataTable).execute();

    await emptyS3Bucket();

    // Return a success response
    return c.json({ message: "Registry is reset." }, 200);
  } catch (error) {
    console.error("Error resetting database:", error);

    // Return an error response if something goes wrong
    return c.json({ message: "Failed to reset data." }, 500);
  }
});
