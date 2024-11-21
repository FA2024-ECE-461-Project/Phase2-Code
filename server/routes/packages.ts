import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import {
  uploadRequestValidation,
  updateRequestValidation,
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
    const packages = await db.select().from(packageMetadataTable).limit(10);

    return c.json({ packages: packages });
  })
