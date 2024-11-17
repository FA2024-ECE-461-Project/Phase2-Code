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

//zod provides runtime type check/validation for request body
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

  // POST endpoint: should return all packages that fit the query parameters if valid JSON
  // zValidator to validate the request body fits the schema for the db
  // TODO: implement this and account for the "*" case
  .post("/", zValidator("json", packageQuerySchema), async (c) => {
    // the validator middleware will send an error message if the request isn't a valid JSON
    // assume we get {name: "package-name", version: "x.y.z"} as request body
    const { name, version } = c.req.valid("json");
    if(name ==="*") {
      // enumerate all packages in a list when given "*"
      return await db.select().from(packageMetadataTable);
    }

    /* do a search in the database for the package using name and version as parameters */
    const response = await db.
      select().
      from(packageMetadataTable).
      where({name, version});
    return JSON.stringify(response);
  });
