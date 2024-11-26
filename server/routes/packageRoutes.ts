import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { exec, execSync } from "child_process";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db";
import { eq, desc, sum, and } from "drizzle-orm";
import {
  packages as packagesTable,
  packageMetadata as packageMetadataTable,
  packageData as packageDataTable,
} from "../db/schemas/packageSchemas";
import {
  uploadRequestValidation,
  updateRequestValidation,
} from "../sharedSchema";
import {
  getPackageDataFromUrl,
  generatePackageId,
  omitId,
} from "../packageUtils";
import { processUrl, processSingleUrl } from "../packageScore/src/index";
import fs from "fs";
import path from "path";
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID, // Ensure these are set in your environment
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

export const packageRoutes = new Hono()
  // get all packages
  .get("/", async (c) => {
    const packages = await db.select().from(packagesTable).limit(10);
    return c.json({ packages: packages });
  })

  .post("/", zValidator("json", uploadRequestValidation), async (c) => {
    // Validates the request body using the schema provided in the zValidator.
    // If the payload is invalid, it will automatically return an error response with a 400 status code.
    const newPackage = await c.req.valid("json");

    // console.log(newPackage);
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
    let metadata: { Name: string; Version: string } | undefined;
    let packageContentBuffer: Buffer | undefined;

    if (newPackage.URL) {
      const packageData = await getPackageDataFromUrl(newPackage.URL!);
      if (!packageData) {
        c.status(400);
        return c.json({ error: "Invalid URL" });
      }

      // If the version is not provided, set it to 1.0.0
      const Version = packageData.Version || "1.0.0";

      // If the name is not provided, set it to "Default Name"
      const Name = packageData.Name || newPackage.Name || "Default-Name";

      metadata = { Name, Version };
    }
    else if (newPackage.Content){
      try {
        packageContentBuffer = Buffer.from(newPackage.Content, "base64");
      } catch (error) {
        c.status(400);
        return c.json({ error: "Invalid base64 content" });
      }

      const tempZipPath = path.join("/tmp", `${uuidv4()}.zip`);
      fs.writeFileSync(tempZipPath, packageContentBuffer);

      // Extract metadata from the zip file, e.g., read package.json
      // For simplicity, we'll set default values
      const Name = newPackage.Name || "Default-Name";
      const Version = "1.0.0";

      metadata = { Name, Version };

      // Handle the JSProgram execution
      if (newPackage.JSProgram) {
        const tempJsPath = path.join('/tmp', `${uuidv4()}.js`);
        fs.writeFileSync(tempJsPath, newPackage.JSProgram);
      
        const additionalArgs = ['arg1', 'arg2', 'arg3', 'arg4', 'arg5'];
      
        try {
          const stdout = execSync(`node ${tempJsPath} ${additionalArgs.join(' ')}`, { encoding: 'utf-8' });
          console.log(`stdout: ${stdout}`);
        } catch (error) {
          if (error instanceof Error) {
            console.error(`Execution error: ${error.message}`);
          } else {
            console.error(`Execution error: ${String(error)}`);
          }
          fs.unlinkSync(tempJsPath);
          return c.json({ error: 'JSProgram execution failed' }, 400);
        }
      
        fs.unlinkSync(tempJsPath);
      }

      // Clean up temporary zip file
      fs.unlinkSync(tempZipPath);
    }

    console.log(metadata);
    // Handle debloating
    // If debloat is enabled, debloat the content
    if (newPackage.debloat && newPackage.Content) {
      // Debloat the content
      // This is a placeholder for the actual debloating logic
    }

    // Create meta data id with a UUID
    const dataId = uuidv4();
    const data = {
      ...newPackage, // Copy the newPackage object
      ID: dataId, // Add the UUID to the newPackage object
    };

    // Create meta data id with a UUID
    const metaDataId = uuidv4();
    const metaData = {
      ID: metaDataId,
      Name: metadata?.Name!, // Use the name from metadata
      Version: metadata?.Version!, // Use the version from metadata
    };

    // Generate a package ID using the metadata name and version
    // Create a package object with the metadata and data
    const packageId = generatePackageId(metaData.Name, metaData.Version);
    const packageObject = {
      ID: packageId,
      metadataId: metaData.ID,
      dataId: data.ID,
    };

    // Check if a package with the same name and version already exists
    // if the package have the same name but different version, should be appended to database
    // But I am not sure what does it mean by "appended to database"
    // Right now it's checking if the package with the same name and version already exists
    // Same name and different version should be added to the database
    try {
      const existingSameNamePackage = await db
        .select()
        .from(packageMetadataTable)
        .where(
          and(
            eq(packageMetadataTable.Name, metaData.Name),
            eq(packageMetadataTable.Version, metaData.Version)
          )
        ) //If a package with the same name and same version already exists
        .then((res) => res[0]);

      if (existingSameNamePackage) {
        // Package already exists, return 409 Conflict
        c.status(409);
        return c.json({ error: "Package already exists" });
      }
    } catch (error) {
      // Handle any errors during the check
      console.error("Error checking for existing package:", error);
      c.status(500);
      return c.json({ error: "Internal server error" });
    }

    // Insert the new package into the database
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

    // Insert into the packages table
    const packageResult = await db
      .insert(packagesTable)
      .values(packageObject)
      .returning()
      .then((res) => res[0]);

    // Return the new package with a status code of 201
    // Omit 'id' field from dataResult
    const dataWithoutId = omitId(dataResult);
    c.status(201);
    return c.json({
      package: packageResult, // temp, need to remove
      metadata: metaDataResult,
      data: dataWithoutId,
    });
  })

  .post("/:ID", zValidator("json", updateRequestValidation), async (c) => {
    const ID = c.req.param("ID");
    const body = await c.req.json();

    // Validate incoming data
    const { metadata, data } = body;
    if (!metadata && !data) {
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
      c.status(404);
      return c.json({ error: "Package not found" });
    }

    // Update metadata if provided
    if (metadata) {
      const { ID, ...metadataToUpdate } = metadata;
      await db
        .update(packageMetadataTable)
        .set(metadataToUpdate)
        .where(eq(packageMetadataTable.ID, packageResult.metadataId));
    }

    // Update data if provided
    if (data) {
      const { ID, ...dataToUpdate } = data;
      await db
        .update(packageDataTable)
        .set(dataToUpdate)
        .where(eq(packageDataTable.ID, packageResult.dataId));
    }

    // Fetch updated package details
    const updatedMetadata = await db
      .select()
      .from(packageMetadataTable)
      .where(eq(packageMetadataTable.ID, packageResult.metadataId))
      .then((res) => res[0]);

    const updatedData = await db
      .select()
      .from(packageDataTable)
      .where(eq(packageDataTable.ID, packageResult.dataId))
      .then((res) => res[0]);

    // Omit 'id' field from updated data result
    const dataWithoutId = omitId(updatedData);

    // Return updated package
    c.status(200);
    return c.json({
      metadata: updatedMetadata,
      data: dataWithoutId,
    });
  })

  // Get rating of a package
  .get("/:ID/rate", async (c) => {
    const ID = c.req.param("ID");

    // Print the ID to the console
    console.log(`Package ID: ${ID}`);
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
      .where(eq(packageDataTable.ID, packageResult.dataId))
      .then((res) => res[0]);

    // Get the URL from the package data
    const URL = packageData.URL;
    // if (typeof URL !== 'string') {
    //   throw new Error('Invalid URL');
    // }
    console.log(URL);
    // Need to implement the logic to get the rating from the URL
    const rating = await processSingleUrl(URL!);
    // Return the rating
    c.status(200);
    return c.json(rating);
  })

  .get('/:ID/download', async (c) => {
    const ID = c.req.param('ID');

    if (!ID) {
      c.status(400);
      return c.json({ error: 'Package ID is required' });
    }

    // Fetch the package data from the database
    const packageResult = await db
      .select()
      .from(packagesTable)
      .where(eq(packagesTable.ID, ID))
      .then((res) => res[0]);

    if (!packageResult) {
      c.status(404);
      return c.json({ error: 'Package not found' });
    }

    // Get the package content
    const packageDataResult = await db
      .select()
      .from(packageDataTable)
      .where(eq(packageDataTable.ID, packageResult.dataId))
      .then((res) => res[0]);

    if (!packageDataResult || !packageDataResult.Content) {
      c.status(404);
      return c.json({ error: 'Package content not found' });
    }

    // Decode the base64 content to Buffer
    const zipBuffer = Buffer.from(packageDataResult.Content, 'base64');

    // Set headers for file download
    c.res.headers.set('Content-Type', 'application/zip');
    c.res.headers.set('Content-Disposition', `attachment; filename="${ID}.zip"`);

    // Return the zip file as a stream
    return c.body(zipBuffer);
  });
