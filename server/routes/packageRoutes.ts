import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { exec } from "child_process";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db";
import { eq, desc, sum, and } from "drizzle-orm";
import {
  insertPackageDataSchema,
  selectPackageMetadataSchema,
  selectPackageDataSchema,
  selectPackagesSchema,
  packages as packagesTable,
  packageMetadata as packageMetadataTable,
  packageData as packageDataTable,
} from "../db/schemas/packageSchemas";
import { createPackageData, 
         createPackageMetadata, 
         createPackages, 
         createPackageDataSchema, 
         createPackageMetadataSchema 
        } from "../sharedSchema";
// import { getPackageDataFromGithub } from "../utils";
import { uuid } from "drizzle-orm/pg-core";
import { getPackageDataFromUrl, generatePackageId, omitId } from "../packageUtils";
// Define types using Zod schemas
type CreatePackageData = z.infer<typeof insertPackageDataSchema>;
type CreatePackageMetadata = z.infer<typeof createPackageMetadataSchema>;


export const packageRoutes = new Hono()
  // get all packages
  .get("/", async (c) => {
    const packages = await db.select().from(packagesTable).limit(10);
    return c.json({ packages: packages });
  })

  .post("/", zValidator("json", insertPackageDataSchema), async (c) => {
    // Validates the request body using the schema provided in the zValidator.
    // If the payload is invalid, it will automatically return an error response with a 400 status code.
    const newPackage = await c.req.valid("json");
  
    // Check if content or url is provided
    if (!newPackage.Content && !newPackage.URL) {
      c.status(400);
      return c.json({ error: "Content or URL is required" });
    }
  
    // If both content and url are provided, return an error
    if (newPackage.Content && newPackage.URL) {
      c.status(400);
      return c.json({ error: "Content and URL cannot be provided at the same time" });
    }
  
    // Initialize metadata
    let metadata: CreatePackageMetadata | null = null;
    if (newPackage.URL) {
      const packageData = await getPackageDataFromUrl(newPackage.URL!);
      if (!packageData) {
        c.status(400);
        return c.json({ error: "Invalid URL" });
      }

      // If the version is not provided, set it to 1.0.0
      const Version = packageData.Version || "1.0.0";

      // If the name is not provided, set it to "Default Name"
      const Name = packageData.Name || "Default Name";

      metadata = { Name, Version };
    }
  
    // Create meta data id with a UUID
    const dataId = uuidv4();
    const data = {
      ...newPackage, // Copy the newPackage object
      ID: dataId,    // Add the UUID to the newPackage object
    };
  
    // Create meta data id with a UUID
    const metaDataId = uuidv4();
    const metaData = {
      ID: metaDataId,
      Name: metadata?.Name || "Default Name",    // Use the name from metadata
      Version: metadata?.Version || "1.0.0",    // Use the version from metadata
    };
    
    // Generate a package ID using the metadata name and version
    // Create a package object with the metadata and data
    const packageId = generatePackageId(metaData.Name, metaData.Version);
    const packageObject = {
      ID: packageId,
      metadataId: metaData.ID,
      dataId: data.ID,
    };
    
    // Check if the package already exists
    try {
      const existingPackage = await db
        .select()
        .from(packagesTable)
        .where(eq(packagesTable.ID, packageId))
        .then((res) => res[0]);
  
      if (existingPackage) {
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



  // Get a package by id
  .get("/:ID", async (c) => {
    const id = c.req.param("ID");

    // Fetch the package from the database
    const packageResult = await db
      .select()
      .from(packagesTable)
      .where(eq(packagesTable.ID, id))
      .then((res) => res[0]);

    if (!packageResult) {
      c.status(404);
      return c.json({ error: "Package not found" });
    }

    // Fetch the metadata and data using the IDs from the packageResult
    const metaDataResult = await db
      .select()
      .from(packageMetadataTable)
      .where(eq(packageMetadataTable.ID, packageResult.metadataId))
      .then((res) => res[0]);

    const dataResult = await db
      .select()
      .from(packageDataTable)
      .where(eq(packageDataTable.ID, packageResult.dataId))
      .then((res) => res[0]);

    // Omit 'id' field from dataResult
    const dataWithoutId = omitId(dataResult);

    // Return the package data
    c.status(200);
    return c.json({
      package: packageResult,
      metadata: metaDataResult,
      data: dataWithoutId,
    });
  });
