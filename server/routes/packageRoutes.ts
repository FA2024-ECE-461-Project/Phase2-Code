import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { exec } from "child_process";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db";
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
         createPackageDataSchema, 
         createPackageMetadataSchema 
        } from "../sharedSchema";
// import { getPackageDataFromGithub } from "../utils";
import { uuid } from "drizzle-orm/pg-core";

export const packageRoutes = new Hono()
  // get all packages
  .get("/", async (c) => {
    const packages = await db.select().from(packagesTable).limit(10);
    return c.json({ packages: packages });
  })

  // post request
  .post("/", zValidator("json", createPackageDataSchema), async (c) => {

    // Validates the request body using the schema provided in the zValidator.
    // If the payload is invalid, it will automatically return an error response with a 400 status code.
    const newPackage = await c.req.valid("json");

    // check if content or url is provided
    if (!newPackage.content && !newPackage.url) {
      c.status(400);
      return c.json({ error: "Content or URL is required" });
    }

    //if both content and url are provided, return an error
    if (newPackage.content && newPackage.url) {
      c.status(400);
      return c.json({ error: "Content and URL cannot be provided at the same time" });
    }

    // Create meta data id with a UUID
    const dataId = uuidv4();
    const data = {
      ...newPackage, // Copy the newPackage object
      id: dataId,    // Add the UUID to the newPackage object
    };

    // If the URL is provided, fetch the package data from GitHub
    let metadata: { name: string; version: string } = { name: "Default Name", version: "1.0.0" };

    if (newPackage.url) {
      // const packageData = await getPackageDataFromGithub(newPackage.url!);
      // if (!packageData) {
      //   c.status(400);
      //   return c.json({ error: "Invalid URL" });
      // }
      // metadata = {packageData.metadata};
    }

    // Create meta data id with a UUID
    const metaDataId = uuidv4();
    const metaData = {
      id: metaDataId,
      name: metadata.name,    // Use the name from metadata
      version: metadata.version,    // Use the version from metadata
    };

    // Create a package object with the metadata and data
    const packageObject = {
      metadataId: metaData.id,
      dataId: data.id,
    };

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
    
    // // construct the result object
    // const package = {
    //   metadata: metaDataResult,
    //   data: dataResult,
    // };

    // Return the new package with a status code of 201
    c.status(201);
    return c.json({
      metadata: metaDataResult,
      data: dataResult,
    });
  });

  // get a package by id
  // .get("/:ID", (c) => {
  //   const id = c.req.param("ID");
  //   const PackageById = fakePackages.find((pkg) => pkg.metadata.ID === id);
  //   if (!PackageById) {
  //     return c.notFound();
  //   }

  //   return c.json({ PackageById });
  // })

  // delete a package by id
  // .delete("/:ID", (c) => {
  //   const id = c.req.param("ID");
  //   const foundPackage = fakePackages.find((pkg) => pkg.metadata.ID === id);
  //   if (!foundPackage) {
  //     return c.notFound();
  //   }
  //   const deletePackages = fakePackages.splice(
  //     fakePackages.indexOf(foundPackage),
  //     1
  //   );

  //   return c.json({ Package: deletePackages[0] });
  // })

  // // get the rating of a package by id
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
