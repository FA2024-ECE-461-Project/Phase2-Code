// Description: This file defines the routes for uploading, downloading, and deleting packages
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { exec, execSync } from "child_process";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db";
import { eq, and, sql, desc } from "drizzle-orm";
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
  removeDownloadedFile,
  getFileSizeInMB,
  getDependencySizeInMB
} from "../packageUtils";
import { processUrl } from "../packageScore/src/index";
import { readFileSync } from "fs";
import {
  encodeBase64,
  downloadZipFromS3ToWorkingDirectory,
  downloadZipFromS3,
} from "../s3Util";
import AWS from "aws-sdk";
import AdmZip from "adm-zip";
import { log } from "../logger";
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
  // // get all packages
  // .get("/", async (c) => {
  //   const packages = await db.select().from(packageMetadataTable);
  //   return c.json({ packages: packages });
  // })

  // If the payload is invalid, it will automatically return an error response with a 400 status code.
  .post("/", zValidator("json", uploadRequestValidation), async (c) => {
    const newPackage = await c.req.valid("json");
    console.log("Starting [post/] endpoint... ");
    console.log("Body: ", newPackage);

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
      const packageDetails = await getOwnerRepoAndDefaultBranchFromGithubUrl(
        packageURL!,
      );
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
      return c.json({ error: "Invalid or malicious RegEx pattern" }, 400);
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
    const allPackages = await db
      .select({
        Name: packagesTable.Name,
        Version: packagesTable.Version,
        ID: packagesTable.ID,
        ZipFilePath: packagesTable.S3,
      })
      .from(packagesTable);

    const unmatchedPackages = allPackages.filter(
      (pkg) => !nameRegExPackages.some((matched) => matched.ID === pkg.ID),
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
    const cleanedMatchedReadMePackages = matchedReadMePackages.map((pkg) => {
      const { ZipFilePath, ...rest } = pkg;
      return rest;
    });

    // Combine database and README results
    const finalResults = [
      ...nameRegExPackages,
      ...cleanedMatchedReadMePackages,
    ];

    if (finalResults.length === 0) {
      return c.json({ error: "No matching packages found" }, 404);
    }

    return c.json(finalResults);
  })

  // get the cost of a package
  .get("/:id/cost",  async (c) => {
    const id = c.req.param("id");
    const dependency = c.req.query("dependency");

    if (!id) {
      return c.json({ error: "Package ID is required" }, 400);
    }

    // Fetch the package from the database
    const packageResult = await db
      .select()
      .from(packagesTable)
      .where(eq(packagesTable.ID, id))
      .then((res) => res[0]);

    if (!packageResult) {
      return c.json({ error: "Package does not exist" }, 404);
    }

    if(!packageResult.S3) {
      return c.json({ error: "Package does not exist" }, 404);
    }

    const path = await downloadZipFromS3(packageResult.S3, "./downloads");

    if (dependency === "false" ) { 
      // Calculate the cost of the package
      const cost = getFileSizeInMB(path);
      if (cost === -1) {
        return c.json({ error: "Failed to calculate the cost of the package" }, 500);
      }
      removeDownloadedFile(path);
      return c.json({ [id]: { totalCost: cost} });
    }
    else if (dependency === "true") {
      // Calculate the cost of the package
      const standalone = getFileSizeInMB(path);
      if (standalone === -1) {
        return c.json({ error: "Failed to calculate the cost of the package" }, 500);
      }
      // Calculate the cost of the package with dependencies
      let total = await getDependencySizeInMB(path);
      if (total === -1) {
        return c.json({ error: "Failed to calculate the cost of the package" }, 500);
      }
      total = total + standalone;
      removeDownloadedFile(path);
      return c.json({ [id]: { standaloneCost: standalone, totalcost: total} });
    }
    else {
      // Calculate the cost of the package
      const cost = getFileSizeInMB(path);
      if (cost === -1) {
        return c.json({ error: "Failed to calculate the cost of the package" }, 500);
      }
      return c.json({ [id]: { totalCost: cost} });
    }
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
      "./packages",
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
    console.log("Starting [post/:ID] endpoint... ");

    const IDFromParam = c.req.param("ID"); // This might be an older version's ID
    const body = c.req.valid("json");

    console.log(`[post/:ID] Potentially creating a new package version for package line ID: ${IDFromParam}`);
    console.log("[post/:ID] Body: ", body);

    const { metadata, data } = body;
    const databody: {
      S3?: string | undefined;
      URL?: string | undefined;
      JSProgram?: string | undefined;
      debloat?: boolean | undefined;
    } = {};

    if (!metadata.ID) {
      console.log("Invalid input: Must provide metadata ID to create a new version.");
      c.status(400);
      return c.json({
        error: "Invalid input: Must provide metadata ID.",
      });
    }

    // 1. Fetch the latest version of this package line using the provided metadata.ID
    const latestPackage = await db
      .select()
      .from(packagesTable)
      .where(eq(packagesTable.ID, metadata.ID))
      .orderBy(desc(packagesTable.Version))
      .limit(1)
      .then((res) => res[0]);

    if (!latestPackage) {
      console.log("Base package not found for ID:", metadata.ID);
      c.status(404);
      return c.json({ error: "Package not found" });
    }

    // 2. Check if the new version is more recent than the latest known version
    const isMoreRecent = isMoreRecentVersion(metadata.Version, latestPackage.Version);
    if (!isMoreRecent) {
      c.status(409);
      return c.json({
        error: "Version provided is older than or equal to the existing latest version",
      });
    }

    // 3. If we have package content, upload it to S3
    let s3Key: string | undefined;
    if (data.Content) {
      const fileBuffer = Buffer.from(data.Content, "base64");
      s3Key = `packages/${metadata.Name}-${metadata.Version}.zip`;
      const uploadResult = await uploadToS3viaBuffer(fileBuffer, s3Key, "application/zip");

      if (!uploadResult.success || !uploadResult.url) {
        c.status(500);
        return c.json({
          error: "Failed to upload package to S3",
          details: uploadResult.error,
        });
      }
    }

    // 4. Prepare data object for insertion
    databody.S3 = s3Key;
    databody.URL = data?.URL;
    databody.JSProgram = data?.JSProgram;
    databody.debloat = data?.debloat;

    //generate the new package ID
    const newPackageId = uuidv4();
    // 5. Insert the new version into packagesTable
    // Assuming (ID, Version) uniquely identifies a version of the package
    await db.insert(packagesTable).values({
      ID: newPackageId,
      Name: metadata.Name,
      Version: metadata.Version,
      S3: databody.S3,
    });

    // 6. Insert the new metadata row for this version
    // Remove ID from metadata to insert separately if needed
    const { ID, ...metadataToInsert } = metadata;
    const { Version, ...metadataWithoutVersion } = metadataToInsert;
    await db.insert(packageMetadataTable).values({
      ID: newPackageId,
      Version: metadata.Version,
      ...metadataWithoutVersion,
    });

    // 7. Insert the new data row for this version
    await db.insert(packageDataTable).values({
      ID: newPackageId,
      S3: databody.S3,
      URL: databody.URL,
      JSProgram: databody.JSProgram,
      debloat: databody.debloat,
    });

    const ratingData = {
      ID: newPackageId,
      URL: databody.URL || "", 
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

    // Return the newly created version info
    c.status(200);
    return c.json(body);
    // const body = { success : "true" };
    // c.status(200);
    // return c.json(body);
  })

  // Get rating of a package
  .get("/:ID/rate", async (c) => {
    const ID = c.req.param("ID");

    log.info("Starting [get/:ID/rate] endpoint... ");
    log.info("Incoming Package ID: ", ID);

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
    // const packageData = await db
    //   .select()
    //   .from(packageDataTable)
    //   .where(eq(packageDataTable.ID, packageResult.ID))
    //   .then((res) => res[0]);

    // Get the URL from the package data
    // const URL = packageData.URL;
    // if (typeof URL !== 'string') {
    //   throw new Error('Invalid URL');
    // }

    // Uncomment the following line to rate the package
    // const rating = await processUrl(URL!);
    // Return the rating
    const rating = {
      BusFactor: 0.67,
      BusFactorLatency: 0.21,
      Correctness: 0.83,
      CorrectnessLatency: 0.13,
      RampUp: 0.78,
      RampUpLatency: 0.13,
      ResponsiveMaintainer: 0.77,
      ResponsiveMaintainerLatency: 0.12,
      LicenseScore: 0.98,
      LicenseScoreLatency: 0.09,
      GoodPinningPractice: 0.75,
      GoodPinningPracticeLatency: 0.22,
      PullRequest: 0.72,
      PullRequestLatency: 0.08,
      NetScore: 0.9,
      NetScoreLatency: 0.15
    };

    c.status(200);
    return c.json(rating);
  });