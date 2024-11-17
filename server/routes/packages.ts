import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import {
  createPackageDataSchema,
  createPackageMetadataSchema,
} from "../sharedSchema";
import {
  packages as packagesTable,
  packageMetadata as packageMetadataTable,
  packageData as packageDataTable,
} from "../db/schemas/packageSchemas";
import { db } from "../db";

export const metadataRoutes = new Hono()

  // get packages
  // Get the pacakages from the database in the packages table with pagination of 10
  .get("/", async (c) => {

    const packages = await db
      .select()
      .from(packageMetadataTable)
      .limit(10);

    return c.json({ packages: packages });
  })

  // post request
  .post("/", zValidator("json", createPackageMetadataSchema), async (c) => {
    const newPackage = await c.req.valid("json");

    // Create a new package with a UUID
    const packageWithID = {
      ...newPackage,
      id: uuidv4(),
    };
    // Insert the new package into the database
    // Insert into the packageMetadata table
    const result = await db
      .insert(packageMetadataTable)
      .values(packageWithID)
      .returning()
      .then((res) => res[0]);
    
    // Return the new package with a status code of 201
    c.status(201);
    return c.json({result: result});
  });
