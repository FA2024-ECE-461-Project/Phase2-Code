// Description: This file defines the routes for uploading, downloading, and deleting packages
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { exec } from "child_process";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db";
import { packages as pacakagesTable } from "../db/schemas/packageSchemas";
import {
  createPackageData,
  createPackageMetadata,
  createPackages,
  createPackageDataSchema,
  createPackageMetadataSchema,
} from "../sharedSchema";
import { PackageQuery } from "../../schema/schema";

// convert PackageQuery interface to ZodSchema
const PackageQuerySchema = z.object({
  name: z.string().optional(),
  version: z.string().optional(),
  description: z.string().optional(),
});

export const packageRoutes = new Hono()
  // get all packages
  .get("/", async (c) => {
    const packages = await db.select().from(pacakagesTable).limit(10);
    return c.json({ packages: packages });
  });
  // POST endpoint: retrieving all packages fitting query parameters
  .post("/", zValidator("json", PackageQuerySchema), async (c) => {


// post request
// .post("/", zValidator("json", createPackageMetadataSchema), async (c) => {
//   const newPackage = await c.req.valid("json");

//   // Create a new package with a UUID
//   const packageWithID = {
//     ...newPackage,
//     id: uuidv4(),
//   };
//   // Insert the new package into the database
//   // Insert into the packageMetadata table
//   const result = await db
//     .insert(packageMetadataTable)
//     .values(packageWithID)
//     .returning()
//     .then((res) => res[0]);

//   // Return the new package with a status code of 201
//   c.status(201);
//   return c.json({result: result});
// });
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
