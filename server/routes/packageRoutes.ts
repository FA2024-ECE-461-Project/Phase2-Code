import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { exec } from "child_process";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db";
import { eq, desc, sum, and } from "drizzle-orm";
import {
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
         createPackageSchema,
         createPackageDataSchema, 
         createPackageMetadataSchema 
        } from "../sharedSchema";
import { getPackageDataFromUrl, generatePackageId, omitId } from "../packageUtils";

export const packageRoutes = new Hono()
  // get all packages
  .get("/", async (c) => {
    const packages = await db.select().from(packagesTable).limit(10);
    return c.json({ packages: packages });
  })

  .post("/", zValidator("json", createPackageDataSchema), async (c) => {
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
    let metadata: createPackageMetadata | undefined;
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
      // package: packageResult, // temp, need to remove
      metadata: metaDataResult,
      data: dataWithoutId,
    });
  })


  .post("/:ID", zValidator("json", createPackageSchema), async (c) => {
    const id = c.req.param("ID");
    const body = await c.req.json();
  
    // Validate incoming data
    const { metadata, data } = body;
    if (!metadata && !data) {
      c.status(400);
      return c.json({ error: "Invalid input: Must provide metadata or data to update." });
    }
  
    // Fetch the existing package from the database
    const packageResult = await db
      .select()
      .from(packagesTable)
      .where(eq(packagesTable.ID, id))
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
  });

  // .delete("/:ID", (c) => {
  //   const id = c.req.param("ID");
  //   const foundPackage = fakePackages.find((pkg) => pkg.metadata.ID === id);
  //   if (!foundPackage) {
  //     return c.notFound();
  //   }
  //   const deletePackages = fakePackages.splice(
  //     fakePackages.indexOf(foundPackage),
  //     1,
  //   );
  //   return c.json({ Package: deletePackages[0] });
  // })
  // // get the rating of a package by id by executing run script
  // .get("/:ID/rate", async (c) => {
  //   const id = c.req.param("ID");
  //   console.log(`Received request for package ID: ${id}`);
  //   const foundPackage = fakePackages.find((pkg) => pkg.metadata.ID === id);
  //   if (!foundPackage) {
  //     console.log(`Package with ID ${id} not found`);
  //     return c.notFound();
  //   }
  //   // const url = foundPackage.data.URL;
  //   // it's running the url.txt script, need to change to run url from the package
  //   // TODO: change the script to run the URL from the package
  //   const command = `./run url.txt`;
  //   return new Promise((resolve) => {
  //     exec(command, (error, stdout, stderr) => {
  //       if (error) {
  //         console.error(`Error executing script: ${error.message}`);
  //         c.status(500);
  //         resolve(c.json({ error: "Internal Server Error" }));
  //       } else {
  //         if (stderr) {
  //           console.error(`Script stderr: ${stderr}`);
  //         }
  //         try {
  //           const jsonResponse = JSON.parse(stdout);
  //           delete jsonResponse.URL;
  //           resolve(c.json(jsonResponse));
  //         } catch (parseError) {
  //           console.error(`Error parsing JSON: ${parseError}`);
  //           c.status(500);
  //           resolve(c.json({ error: "Internal Server Error" }));
  //         }
  //       }
  //     });
  //   });
  // });