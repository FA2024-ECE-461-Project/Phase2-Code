// this route handles all operations related to the package metadata
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import {
  createPackageDataSchema,
  createPackageMetadata,
  createPackageMetadataSchema,
} from "../sharedSchema";
import {
  packages as packagesTable,
  packageMetadata as packageMetadataTable,
  packageData as packageDataTable,
} from "../db/schemas/packageSchemas";
import { db } from "../db";

//zod schema for query parameter of the POST endpoint
const packageQuerySchema = z.object({
  name: z.string(),
  version: z.string(),
});

export const metadataRoutes = new Hono()

  // get packages
  // Get the pacakages from the database in the packages table with pagination of 10
  .get("/", async (c) => {
    const packages = await db.select().from(packageMetadataTable).limit(10);

    return c.json({ packages: packages });
  })

  // POST request: use zValidator to validate the request body fits the schema for the db
  // TODO: return all packages that fit the query parameters
  .post("/", zValidator("json", packageQuerySchema), async (c) => {
    // should handle the "*" case differently

    // the validator middleware will send an error message if the request isn't a valid JSON
    const request = await c.req.valid("json");
    const { name, version } = request;

    // do a search in the database for the package with the name and version
    const response = await db

  });
