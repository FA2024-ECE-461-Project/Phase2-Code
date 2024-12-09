// packageRoutes.ts

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { exec, execSync } from "child_process";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db";
import { eq, and, sql } from "drizzle-orm";
import {
  packageMetadata as packageMetadataTable,
  packageData as packageDataTable,
  packageRating as packageRatingTable,
  packages as packagesTable,
  packageData,
} from "../db/schemas/packageSchemas";
import {
  uploadRequestValidation,
  updateRequestValidation,
} from "../sharedSchema";
import {
  getPackageNameVersion,
  downloadGitHubZip,
  omitId,
  isMoreRecentVersion,
  extractMetadataFromZip,
  extractZip,
  removeDotGitFolderFromZip,
  uploadToS3viaBuffer,
  getPackageJsonUrl,
  npmUrlToGitHubUrl,
  getOwnerRepoAndDefaultBranchFromGithubUrl,
  removeDownloadedFile,
  removeFileFromS3,
  FailedDependencyError,
  parseGitHubUrl1,
  InvalidInputError,
} from "../packageUtils";
import { processUrl, processSingleUrl, MetricsResult } from "../packageScore/src/index";
import { readFileSync } from "fs";
import { encodeBase64, downloadZipFromS3ToWorkingDirectory, downloadZipFromS3 } from "../s3Util";
import AWS from "aws-sdk";
import AdmZip from "adm-zip";
import fs from "fs";
import path from "path";
import { OwnerOverride } from "@aws-sdk/client-s3";

// ... [Other imports remain unchanged]

// Schema for RegEx search of a package
const PackageRegEx = z.object({
  RegEx: z.string().optional(),
});

// Schema for package/download response (export this so it could be used in the frontend)
export type PackageDownloadResponseType = {
  metadata: {
    Name: string;
    Version: string | undefined;
    ID: string;
  };
  data: {
    content: string;
    JSProgram: string;
  };
};

export const packageRoutes = new Hono()
  // get all packages
  .get("/", async (c) => {
    const packages = await db.select().from(packageMetadataTable);
    return c.json({ packages: packages });
  })

  // Updated POST "/" endpoint
  .post("/", zValidator("json", uploadRequestValidation), async (c) => {
    const newPackage = await c.req.valid("json");
    // console.log("Starting [post/] endpoint... ");
    // console.log("Body: ", newPackage);

    // Check if content or url is provided
    if (!newPackage.Content && !newPackage.URL) {
      c.status(400);
      return c.json({ error: "Content or URL is required" });
    }

    // If both content and url are provided, return an error
    if (newPackage.Content && newPackage.URL) {
      c.status(400);
      return c.json({
        error: "Content and URL cannot be provided at the same time",
      });
    }

    // Initialize metadata
    let metadata: { Name: string; Version: string; URL: string } | undefined;
    let s3Url: string | undefined;
    let s3Key: string | undefined;
    let zipBuffer: Buffer | undefined;
    let extractedDir: string | undefined;

    // Temporary directory for extraction
    const tempDir = path.join(process.cwd(), "temp_upload", uuidv4());
    fs.mkdirSync(tempDir, { recursive: true });

    try {
      if (newPackage.URL) {
        // Handle URL-based package upload
        const githubUrl = await npmUrlToGitHubUrl(newPackage.URL!);
        if (!githubUrl) {
          c.status(400);
          return c.json({ error: "Invalid URL" });
        }

        const packageDetails = await getOwnerRepoAndDefaultBranchFromGithubUrl(githubUrl!);
        if (!packageDetails) {
          c.status(400);
          return c.json({ error: "Invalid URL" });
        }

        const { owner, repo, defaultBranch } = packageDetails;
        const packageDataInfo = await getPackageNameVersion(owner, repo);

        if (!packageDataInfo) {
          c.status(400);
          return c.json({ error: "Invalid URL" });
        }

        // Set default values if necessary
        const Version = packageDataInfo.Version || "1.0.0";
        const Name = packageDataInfo.Name || newPackage.Name || "Default-Name";

        // Download the ZIP file
        const downloadedZipPath = await downloadGitHubZip(owner, repo, defaultBranch, tempDir, `${Name}-${Version}.zip`);
        if (!downloadedZipPath) {
          throw new FailedDependencyError("Failed to download the package from the URL.");
        }

        // Read the ZIP file into a buffer
        zipBuffer = readFileSync(downloadedZipPath);

        // Extract ZIP to temp directory
        extractedDir = path.join(tempDir, `${Name}-${Version}`);
        extractZip(downloadedZipPath, extractedDir);

        // Extract metadata
        metadata = extractMetadataFromZip(zipBuffer);
      } else if (newPackage.Content) {
        // Handle Content-based package upload
        try {
          zipBuffer = Buffer.from(newPackage.Content, "base64");
        } catch (error) {
          return c.json({ error: "Invalid base64 content" }, 400);
        }

        // Extract metadata from the zip file
        try {
          metadata = extractMetadataFromZip(zipBuffer);
        } catch (error) {
          return c.json({ error: (error as Error).message }, 400);
        }

        // Extract ZIP to temp directory
        extractedDir = path.join(tempDir, `${metadata.Name}-${metadata.Version}`);
        extractZipBuffer(zipBuffer, extractedDir); // New helper function
      }

      // At this point, the ZIP is extracted to `extractedDir`
      if (!metadata || !extractedDir) {
        throw new Error("Failed to extract metadata from the package");
      }
      // Rate the package
      const { owner, repo } = parseGitHubUrl1(metadata.URL);
      const metrics = await processUrl(metadata.URL, extractedDir, owner, repo);

      // Define your score threshold
      const SCORE_THRESHOLD = 0.5; // Adjust based on your criteria
      console.log("NetScore: ", metrics);
      if (metrics.NetScore < SCORE_THRESHOLD) {
        // Rating failed, return 424
        c.status(424);
        return c.json({
          error: `Package metrics failed. NetScore: ${metrics.NetScore}. Package not uploaded.`,
        });
      }

      // If rating passes, proceed to upload
      s3Key = `packages/${metadata.Name}-${metadata.Version}.zip`;


      if (zipBuffer && s3Key) {
        const uploadResult = await uploadToS3viaBuffer(
          zipBuffer,
          s3Key,
          "application/zip",
        );

        if (!uploadResult.success || !uploadResult.url) {
          return c.json(
            {
              error: "Failed to upload package to S3",
              details: uploadResult.error,
            },
            500,
          );
        }

        s3Url = uploadResult.url;
      }

      // Clean up extracted files and temporary ZIP
      if (extractedDir) {
        fs.rmdirSync(extractedDir, { recursive: true });
      }

      // Create package id with a UUID
      const packageId = uuidv4();

      // Prepare the data to be inserted into the database
      const data = {
        ID: packageId,
        S3: s3Key!,
        URL: newPackage.URL || metadata?.URL || "",
        JSProgram: newPackage.JSProgram || null,
        debloat: newPackage.debloat || false,
      };

      // Prepare the metadata to be inserted into the database
      const metaData = {
        ID: packageId,
        Name: metadata?.Name!, // Use the name from metadata
        Version: metadata?.Version!, // Use the version from metadata
      };

      // Prepare packagesTable data to be inserted into database
      const packagesTableData = {
        ID: packageId,
        Name: metaData?.Name!,
        Version: metaData?.Version!,
        S3: s3Key!,
      };

      // Check if a package with the same name and version already exists
      const existingSameNamePackage = await db
        .select()
        .from(packageMetadataTable)
        .where(
          and(
            eq(packageMetadataTable.Name, metaData.Name),
            eq(packageMetadataTable.Version, metaData.Version),
          ),
        )
        .then((res) => res[0]);

      if (existingSameNamePackage) {
        // Package already exists, return 409 Conflict
        c.status(409);
        return c.json({ error: "Package already exists" });
      }

      // Prepare rating data for insertion
      const ratingData = {
        ID: packageId,
        URL: newPackage.URL || metadata?.URL || "",
        NetScore: metrics.NetScore.toString(),
        NetScore_Latency: metrics.NetScore_Latency.toString(),
        RampUp: metrics.RampUp.toString(),
        RampUp_Latency: metrics.RampUp_Latency.toString(),
        Correctness: metrics.Correctness.toString(),
        Correctness_Latency: metrics.Correctness_Latency.toString(),
        BusFactor: metrics.BusFactor.toString(),
        BusFactor_Latency: metrics.BusFactor_Latency.toString(),
        ResponsiveMaintainer: metrics.ResponsiveMaintainer.toString(),
        ResponsiveMaintainer_Latency: metrics.ResponsiveMaintainer_Latency.toString(),
        License: metrics.License.toString(),
        License_Latency: metrics.License_Latency.toString(),
        PR_Code_Reviews: metrics.PR_Code_Reviews.toString(),
        PR_Code_Reviews_Latency: metrics.PR_Code_Reviews_Latency.toString(),
        DependencyMetric: metrics.DependencyMetric.toString(),
        DependencyMetric_Latency: metrics.DependencyMetric_Latency.toString(),
      };

      // Insert the rating to database
      await db
        .insert(packageRatingTable)
        .values(ratingData)
        .returning()
        .then((res) => res[0]);

      // Insert the new package into the database
      // Insert ID into the packages table
      await db
        .insert(packagesTable)
        .values(packagesTableData)
        .returning()
        .then((res) => res[0]);

      // Insert into the packageMetadata table
      const metaDataResult = await db
        .insert(packageMetadataTable)
        .values(metaData)
        .returning()
        .then((res) => res[0]);

      // Insert into the packageData table
      const dataResult = await db
        .insert(packageDataTable)
        .values(data)
        .returning()
        .then((res) => res[0]);

      // Return the new package with a status code of 201
      // Omit 'id' field from dataResult
      const dataWithoutId = omitId(dataResult);
      c.status(201);
      return c.json({
        metadata: metaDataResult,
        data: dataWithoutId,
      });
    } catch (error) {
      console.error("Error processing package upload:", error);

      // Clean up any temporary files/directories in case of error
      if (extractedDir && fs.existsSync(extractedDir)) {
        fs.rmdirSync(extractedDir, { recursive: true });
      }
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmdirSync(tempDir, { recursive: true });
      }

      if (error instanceof FailedDependencyError) {
        c.status(424);
        return c.json({ error: error.message });
      }

      // Handle other types of errors
      c.status(500);
      return c.json({ error: "Internal Server Error" });
    }
  })

  // ... [Rest of the routes remain unchanged]

// Helper function to extract ZIP from buffer
function extractZipBuffer(buffer: Buffer, extractToDir: string): void {
  try {
    const zip = new AdmZip(buffer);
    zip.extractAllTo(extractToDir, true);
    console.log(`Extracted ZIP buffer to ${extractToDir}`);
  } catch (error) {
    console.error(`Failed to extract ZIP buffer: ${(error as Error).message}`);
    throw new Error(`Failed to extract ZIP buffer: ${(error as Error).message}`);
  }
}

export default packageRoutes;
