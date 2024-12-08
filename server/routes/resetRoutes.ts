import { Hono } from "hono";
import {
  packageMetadata as packageMetadataTable,
  packageData as packageDataTable,
  packageRating as packageRatingTable,
  packages as packagesTable,
} from "../db/schemas/packageSchemas";
import { db } from "../db";

import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  ListObjectVersionsCommand,
  DeleteObjectCommand,
  DeleteObjectRequest,
} from "@aws-sdk/client-s3";

// Initialize S3 client (ensure environment variables are set)
const s3Client = new S3Client({ 
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!, 
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function emptyBucket(bucketName: string) {
  const s3Client = new S3Client({ region: "us-east-1" }); // Change region as needed

  // Delete all objects from the bucket for unversioned buckets.
  let isTruncated = true;
  let continuationToken: string | undefined = undefined;
  
  while (isTruncated) {
    const listResponse = await s3Client.send(new ListObjectsV2Command({
      Bucket: bucketName,
    }));
    
    const objects = listResponse.Contents;
    if (objects && objects.length > 0) {
      const deleteParams = {
        Bucket: bucketName,
        Delete: {
          Objects: objects.map((obj) => ({ Key: obj.Key! }))
        },
      };
      await s3Client.send(new DeleteObjectsCommand(deleteParams));
    }

    isTruncated = listResponse.IsTruncated ?? false;
    continuationToken = listResponse.NextContinuationToken;
  }

  // // Delete all object versions for versioned buckets.
  // let versionIsTruncated = true;
  // let keyMarker: string | undefined = undefined;
  // let versionIdMarker: string | undefined = undefined;
  
  // while (versionIsTruncated) {
  //   const versionListResponse = await s3Client.send(new ListObjectVersionsCommand({
  //     Bucket: bucketName,
  //     KeyMarker: keyMarker,
  //     VersionIdMarker: versionIdMarker,
  //   }));

  //   const versions = versionListResponse.Versions ?? [];
  //   const deleteMarkers = versionListResponse.DeleteMarkers ?? [];
  //   const objectsToDelete = [...versions, ...deleteMarkers].map((v) => ({
  //     Key: v.Key!,
  //     VersionId: v.VersionId,
  //   }));

  //   if (objectsToDelete.length > 0) {
  //     // Delete each version individually because DeleteObjects doesn't support multiple versions directly
  //     for (const obj of objectsToDelete) {
  //       const deleteObjParams: DeleteObjectRequest = {
  //         Bucket: bucketName,
  //         Key: obj.Key,
  //         VersionId: obj.VersionId
  //       };
  //       await s3Client.send(new DeleteObjectCommand(deleteObjParams));
  //     }
  //   }

  //   versionIsTruncated = versionListResponse.IsTruncated ?? false;
  //   keyMarker = versionListResponse.NextKeyMarker;
  //   versionIdMarker = versionListResponse.NextVersionIdMarker;
  // }

  console.log(`All objects deleted from bucket ${bucketName}.`);
}

async function deleteAllFilesFromS3() {
  try {
    const bucketName = process.env.S3_BUCKET_NAME!;
    
    // List all objects in the bucket
    const listResponse = await s3Client.send(new ListObjectsV2Command({
      Bucket: bucketName,
    }));
    
    const contents = listResponse.Contents;
    if (!contents || contents.length === 0) {
      console.log("No files found in S3 bucket.");
      return;
    }
    
    // Prepare the objects to be deleted
    const objectsToDelete = contents.map((object) => ({ Key: object.Key! }));
    
    // Delete all objects
    await s3Client.send(new DeleteObjectsCommand({
      Bucket: bucketName,
      Delete: {
        Objects: objectsToDelete,
      },
    }));
    
    console.log(`All files have been deleted from the bucket ${bucketName}.`);
  } catch (error) {
    console.error("Error deleting files from S3:", error);
  }
}

// Example Hono route that resets both DB and S3
export const resetRoutes = new Hono().delete("/", async (c) => {
  try {
    // Clear database tables
    await db.delete(packageMetadataTable);
    await db.delete(packageDataTable);
    await db.delete(packageRatingTable);
    await db.delete(packagesTable);

    // Delete all S3 objects
    // await emptyBucket(process.env.S3_BUCKET_NAME!);

    return c.json({ message: "All data successfully reset." }, 200);
  } catch (error) {
    console.error("Error resetting data:", error);
    return c.json({ message: "Failed to reset data." }, 500);
  }
});
