// this route handles all operations related to the package metadata
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
  insertPackageMetadataSchema,
} from "../db/schemas/packageSchemas";
import { db } from "../db";
import { eq, desc, sum, and } from "drizzle-orm";

export const metadataRoutes = new Hono()
  // get packages
  // Get the pacakages from the database in the packages table with pagination of 10
  .get("/", async (c) => {
    const packages = await db.select().from(packageMetadataTable).limit(10);

    return c.json({ packages: packages });
  })

  /* POST endpoint: should return all packages that fit the query parameters on valid JSON requests
   zValidator to validate the request body fits the schema below: output an error when it doesn't
  insertPacakgeMetadataSchema = {
    name: string
    version: string
  }
   this should return a list of packages (if only one package, return a list with one PackageMetadata Object)
   TODO: implement this and account for the "*" case */
  .post("/", zValidator("json", insertPackageMetadataSchema), async (c) => {
    // assume we get {name: "package-name", version: "x.y.z"} as request body
    const { name, version } = c.req.valid("json");
    if (name === "*") {
      // enumerate a list of all packages in a list when given "*"
      const response = await db.select().from(packageMetadataTable);
      return c.json(response);
    }

    // do a search in the database for the package using name and version as parameters
    const response = await db
      .select()
      .from(packageMetadataTable)
      .where(
        and(
          eq(packageMetadataTable.name, name),
          eq(packageMetadataTable.version, version),
        ),
      );
    return c.json(response); // this should be a list of packages (can be empty)
  });
