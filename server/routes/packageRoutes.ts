// Description: This file defines the routes for uploading, downloading, and deleting packages
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { log } from "../logger";
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
  removeDotGitFolderFromZip,
  uploadToS3viaBuffer,
  getPackageJsonUrl,
  npmUrlToGitHubUrl,
  getOwnerRepoAndDefaultBranchFromGithubUrl,
  removeDownloadedFile
} from "../packageUtils";
import { processUrl, processSingleUrl } from "../packageScore/src/index";
import { readFileSync } from "fs";
import { encodeBase64, downloadZipFromS3ToWorkingDirectory, downloadZipFromS3 } from "../s3Util";
import AWS from "aws-sdk";
import AdmZip from "adm-zip";

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
  
  // If the payload is invalid, it will automatically return an error response with a 400 status code.
  .post("/", zValidator("json", uploadRequestValidation), async (c) => {
    const newPackage = await c.req.valid("json");

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
    let metadata: { Name: string; Version: string; Url: string} | undefined;
    let s3Url: string | undefined;
    let githubUrl: string | null = null;
    let s3Key: string | undefined;

    if (newPackage.URL) {
      const packageURL = await npmUrlToGitHubUrl(newPackage.URL!);
      const packageDetails = await getOwnerRepoAndDefaultBranchFromGithubUrl(packageURL!);
      if (!packageDetails) {
        c.status(400);
        return c.json({ error: "Invalid URL" });
      }
      const { owner, repo, defaultBranch } = packageDetails;
      const packageData = await getPackageNameVersion(owner, repo);

      if (!packageData) {
        c.status(400);
        return c.json({ error: "Invalid URL" });
      }

      // If the version is not provided, set it to 1.0.0
      const Version = packageData.Version || "1.0.0";
      // If the name is not provided, set it to "Default Name"
      const Name = packageData.Name || newPackage.Name || "Default-Name";
      
      // Get the github zip file using url
      // print the url
      console.log(newPackage.URL);
      const githubZip = await downloadGitHubZip(owner, repo, defaultBranch, "./downloads", `${Name}-${Version}.zip`);
      if (!githubZip) {
        c.status(400);
        return c.json({ error: "Failed to download the package from the URL" });
      }

      // Upload the zip file to S3
      const fileContent = readFileSync(`./downloads/${Name}-${Version}.zip`);
      s3Key = `packages/${Name}-${Version}.zip`;
      const uploadResult = await uploadToS3viaBuffer(
        fileContent,
        s3Key,
        "application/zip",
      );

      // Set metadata
      // s3Url = uploadResult.url;
      metadata = { Name, Version, Url: newPackage.URL };

    } else if (newPackage.Content) {
      // Handle Content-based package upload
      let fileBuffer: Buffer;
      try {
        fileBuffer = Buffer.from(newPackage.Content, "base64");
      } catch (error) {
        return c.json({ error: "Invalid base64 content" }, 400);
      }

      // Extract metadata from the zip file
      try {
        metadata= extractMetadataFromZip(fileBuffer);
      } catch (error) {
        return c.json({ error: (error as Error).message }, 400);
      }

      // Upload the zip file to S3
      s3Key = `packages/${metadata.Name}-${metadata.Version}.zip`;
      const uploadResult = await uploadToS3viaBuffer(
        fileBuffer,
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

      //get the github url
      //githubUrl = getPackageJsonUrl(newPackage.Content);
      s3Url = uploadResult.url;
    }

    // Handle debloating
    // If debloat is enabled, debloat the content
    if (newPackage.debloat && newPackage.Content) {
      // Debloat the content
      // This is a placeholder for the actual debloating logic
    }

    // Create package id with a UUID
    const packageId = uuidv4();

    // Prepare the data to be inserted into the database
    const data = {
      ID: packageId,
      S3: s3Key,
      URL: newPackage.URL || metadata?.Url,
      JSProgram: newPackage.JSProgram || null,
      debloat: newPackage.debloat || false,
    };

    // Prepare the metadata to be inserted into the database
    const metaData = {
      ID: packageId,
      Name: metadata?.Name!, // Use the name from metadata
      Version: metadata?.Version!, // Use the version from metadata
    };

    //Prepare packagesTable data to be inserted into database
    const packagesTableData = {
      ID: packageId,
      Name: metaData?.Name!,
      Version: metaData?.Version!,
      S3: s3Key,
    };

    //If a package with the same name and same version already exists
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

    // Rate the package
    // const rating = await processUrl(newPackage.URL!);
    // prepare the rating data to be inserted into the database
    // const ratingData = {
    //   ID: packageId,
    //   URL: newPackage.URL,
    //   NetScore: rating.NetScore,
    //   NetScore_Latency: rating.NetScore_Latency,
    //   RampUp: rating.RampUp,
    //   RampUp_Latency: rating.RampUp_Latency,
    //   Correctness: rating.Correctness,
    //   Correctness_Latency: rating.Correctness_Latency,
    //   BusFactor: rating.BusFactor,
    //   BusFactor_Latency: rating.BusFactor_Latency,
    // };
    const ratingData = {
      ID: packageId,
      URL: newPackage.URL || metadata?.Url!, 
      NetScore: '-1',
      NetScore_Latency: '-1',
      RampUp: '-1',
      RampUp_Latency: '-1',
      Correctness: '-1',
      Correctness_Latency: '-1',
      BusFactor: '-1',
      BusFactor_Latency: '-1',
      ResponsiveMaintainer: '-1',
      ResponsiveMaintainer_Latency: '-1',
      License: '-1',
      License_Latency: '-1',
      PR_Code_Reviews: '-1',
      PR_Code_Reviews_Latency: '-1',
      DependencyMetric: '-1',
      DependencyMetric_Latency: '-1',
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
  })

  .post("/byRegEx", zValidator("json", PackageRegEx), async (c) => {
    const body = c.req.valid("json");
    const regex = body.RegEx;
    console.log("Executing query with regex:", regex);

    if (!regex) {
      return c.json({ error: "RegEx is required" }, 400);
    }

    // Validate the regex pattern
    try {
      new RegExp(regex);
    } catch (e) {
      return c.json({ error: "Invalid RegEx pattern" }, 400);
    }

    // Fetch packages that match the regex
    let nameRegExPackages = [];
    try {
      nameRegExPackages = await db
        .select({
          Name: packageMetadataTable.Name,
          Version: packageMetadataTable.Version,
          ID: packageMetadataTable.ID,
        })
        .from(packageMetadataTable)
        .where(sql`${packageMetadataTable.Name} ~ ${regex}`);

    } catch (error) {
      return c.json({ error: "No package found under this regex" }, 404);
    }

    // Fetch zip files from S3 for packages not in matchedPackages
    const allPackages = await db.select({
      Name: packagesTable.Name,
      Version: packagesTable.Version,
      ID: packagesTable.ID,
      ZipFilePath: packagesTable.S3,
    }).from(packagesTable);

    const unmatchedPackages = allPackages.filter(
      (pkg) => !nameRegExPackages.some((matched) => matched.ID === pkg.ID)
    );

    const s3 = new AWS.S3(); // Assuming AWS SDK is configured

    // Regex through README files in zip packages
    console.log("Checking README files for regex match...");
    const matchedReadMePackages = [];
    for (const pkg of unmatchedPackages) {
      const { ZipFilePath } = pkg;

      if (!ZipFilePath) continue;

      try {
        // Download the zip file from S3
        const path = await downloadZipFromS3(ZipFilePath, "./regex-packages");

        const zip = new AdmZip(path);
        const zipEntries = zip.getEntries();

        for (const entry of zipEntries) {
          if (entry.entryName.toLowerCase().includes("readme")) {
            const readMeContent = entry.getData().toString("utf-8");

            // Apply regex to the README content
            if (new RegExp(regex).test(readMeContent)) {
              matchedReadMePackages.push(pkg);
              break; // Exit loop once a match is found in this package
            }
          }
        }
        removeDownloadedFile(path);
      } catch (error) {
        console.error(`Error processing zip for package ID ${pkg.ID}:`, error);
      }
    }

    // Remove the ZipFilePath field from each object in matchedReadMePackages
    const cleanedMatchedReadMePackages = matchedReadMePackages.map(pkg => {
      const { ZipFilePath, ...rest } = pkg;
      return rest;
    });

    // Combine database and README results
    const finalResults = [...nameRegExPackages, ...cleanedMatchedReadMePackages];

    if (finalResults.length === 0) {
      return c.json({ error: "No matching packages found" }, 404);
    }

    return c.json(finalResults);
  })

  // download package endpoint
  .get("/:ID", async (c) => {
    // get ID from the request
    const ID = c.req.param("ID");
    // if no ID is provided, return an error
    if (!ID) {
      return c.json({ error: "ID is required" }, 400);
    }

    // console.log(`Package ID: ${ID}`);
    // query packagesTable for package ID, then use this entry to reference packageMetadataTable
    type MetaDataAndPackageDataEntry = {
      Name: string;
      Version: string | undefined;
      S3: string | null;
      JSProgram: string | null;
    };

    // check if package exists
    const packageID = await db
      .select()
      .from(packagesTable)
      .where(eq(packagesTable.ID, ID))
      .then((res) => res[0]);

    if (!packageID) {
      return c.json({ error: `no package with ID ${ID} found` }, 404);
    }

    // get metadata and package data from the database
    const packageData = await db
      .select()
      .from(packageDataTable)
      .where(eq(packageDataTable.ID, ID))
      .then((res) => res[0]);

    const packageMetadata = await db
      .select()
      .from(packageMetadataTable)
      .where(eq(packageMetadataTable.ID, ID))
      .then((res) => res[0]);

    const metaDataAndPackageDataEntry: MetaDataAndPackageDataEntry = {
      Name: packageMetadata.Name,
      Version: packageMetadata.Version,
      S3: packageData.S3,
      JSProgram: packageData.JSProgram,
    };

    //when no package matches with ID from request
    if (!metaDataAndPackageDataEntry) {
      return c.json({ error: `no package with ID ${ID} found` }, 404);
    }

    if (metaDataAndPackageDataEntry.S3 === null) {
      console.log(
        "no zipfile content found in " +
          metaDataAndPackageDataEntry.Name +
          " " +
          metaDataAndPackageDataEntry.Version,
      );
      return c.json({ error: "no zipfile content found" }, 404);
    }

    // download the package from S3
    const filePath = await downloadZipFromS3(
      metaDataAndPackageDataEntry.S3,
      "./packages"
    );

    // encode the downloaded file to base64
    const base64Data = encodeBase64(filePath);

    // fill in payload
    const payload: PackageDownloadResponseType = {
      metadata: {
        Name: metaDataAndPackageDataEntry.Name,
        Version: metaDataAndPackageDataEntry.Version,
        ID: ID,
      },
      data: {
        content: base64Data,
        JSProgram: metaDataAndPackageDataEntry.JSProgram
          ? metaDataAndPackageDataEntry.JSProgram
          : "",
      },
    };
    console.log("before return, ", filePath);
    // remove the downloaded file
    console.log("is removed?", removeDownloadedFile(filePath));
    return c.json(payload);
  })

  .post("/:ID", zValidator("json", updateRequestValidation), async (c) => {
    log.info("Starting [post/:ID] endpoint... ");

    const ID = c.req.param("ID");
    const body = c.req.valid("json");

    log.info(`[post/:ID] Updating Package ID: ${ID}`);
    log.info("[post/:ID] Body: ", body);

    // Validate incoming data
    const { metadata, data } = body;
    if (!metadata.ID) {
      log.error("Invalid input: Must provide metadata ID to update.");
      c.status(400);
      return c.json({
        error: "Invalid input: Must provide metadata or data to update.",
      });
    }


    // Fetch the existing package from the database
    const packageResult = await db
      .select()
      .from(packagesTable)
      .where(eq(packagesTable.ID, ID))
      .then((res) => res[0]);

    if (!packageResult) {
      log.error("Package not found");
      c.status(404);
      return c.json({ error: "Package not found" });
    }

    // Check is the package version is more recent
    const isMoreRecent = isMoreRecentVersion(metadata.Version, packageResult.Version);
    if (!isMoreRecent) {
      c.status(409);
      return c.json({
        error: "Version provided is older than the existing version",
      });
    }

    // Update metadata if provided
    if (metadata) {
      const { ID, ...metadataToUpdate } = metadata;
      await db
        .update(packageMetadataTable)
        .set(metadataToUpdate)
        .where(eq(packageMetadataTable.ID, packageResult.ID));
    }

    // Update data if provided
    if (data) {
      const { ...dataToUpdate } = data;
      await db
        .update(packageDataTable)
        .set(dataToUpdate)
        .where(eq(packageDataTable.ID, packageResult.ID));
    }

    // Return updated package
    c.status(200);
    return c.json(body);
  })

  // Get rating of a package
  .get("/:ID/rate", async (c) => {    
    const ID = c.req.param("ID");
    // Print the ID to the console
    // if no ID is provided, return an error
    // Not sure why this is not working when no ID is provided
    if (!ID) {
      c.status(400);
      return c.json({ error: "ID is required" });
    }
    // Fetch the package from the database
    const packageResult = await db
      .select()
      .from(packagesTable)
      .where(eq(packagesTable.ID, ID))
      .then((res) => res[0]);

    if (!packageResult) {
      c.status(404);
      return c.json({ error: "Package not found" });
    }

    // get the url from the package data
    const packageData = await db
      .select()
      .from(packageDataTable)
      .where(eq(packageDataTable.ID, packageResult.ID))
      .then((res) => res[0]);

    // Get the URL from the package data
    const URL = packageData.URL;
    // if (typeof URL !== 'string') {
    //   throw new Error('Invalid URL');
    // }
    console.log(URL);
    
    // Uncomment the following line to rate the package
    // const rating = await processUrl(URL!);
    // Return the rating
    const rating = {
      NetScore: '-1',
      NetScore_Latency: '-1',
      RampUp: '-1',
      RampUp_Latency: '-1',
      Correctness: '-1',
      Correctness_Latency: '-1',
      BusFactor: '-1',
      BusFactor_Latency: '-1',
      ResponsiveMaintainer: '-1',
      ResponsiveMaintainer_Latency: '-1',
      License: '-1',
      License_Latency: '-1',
      PR_Code_Reviews: '-1',
      PR_Code_Reviews_Latency: '-1',
      DependencyMetric: '-1',
      DependencyMetric_Latency: '-1',
    }
    c.status(200);
    return c.json(rating);
  });

  // .get("/:ID", async (c) => {
  //   const ID = c.req.param("ID");

  //   if (!ID) {
  //     return c.json({ error: "Package ID is required" }, 400);
  //   }

  //   // Fetch the package from the database
  //   const packageResult = await db
  //     .select()
  //     .from(packagesTable)
  //     .where(eq(packagesTable.ID, ID))
  //     .then((res) => res[0]);

  //   if (!packageResult) {
  //     return c.json({ error: "Package not found" }, 404);
  //   }

  //   // Fetch package data
  //   const packageData = await db
  //     .select()
  //     .from(packageDataTable)
  //     .where(eq(packageDataTable.ID, packageResult.dataId))
  //     .then((res) => res[0]);

  //   if (!packageData) {
  //     return c.json({ error: "Package data not found" }, 404);
  //   }

  //   if (packageData.URL) {
  //     // If the package is stored in S3, redirect the user to the S3 URL
  //     // Optionally, generate a pre-signed URL for secure download
  //     const s3Params = {
  //       Bucket: process.env.S3_BUCKET_NAME!,
  //       Key: `packages/${packageResult.ID}.zip`, // Adjust the key as per your naming convention
  //       Expires: 60 * 5, // 5 minutes
  //     };

  //     try {
  //       const downloadUrl = s3.getSignedUrl("getObject", s3Params);
  //       return c.redirect(downloadUrl, 302);
  //     } catch (error) {
  //       console.error(
  //         `Error generating S3 download URL: ${(error as Error).message}`,
  //       );
  //       return c.json({ error: "Failed to generate download URL" }, 500);
  //     }
  //   }

  //   if (packageData.Content) {
  //     // If the package content is stored in the database (not recommended for large files)
  //     const zipBuffer = Buffer.from(packageData.Content, "base64");

  //     // Set headers for file download
  //     c.res.headers.set("Content-Type", "application/zip");
  //     c.res.headers.set(
  //       "Content-Disposition",
  //       `attachment; filename="${ID}.zip"`,
  //     );

  //     // Return the zip file as a buffer

  //     return c.body(zipBuffer);
  //   }

  //   return c.json({ error: "Package content not found" }, 404);
  // });
