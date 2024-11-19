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
import { eq, and } from "drizzle-orm";

// extend from insertPackageMetadataSchema for the post endpoint query
const postPackageMetadataSchema = insertPackageMetadataSchema.extend({
  offset: z.string().optional()
});



export const metadataRoutes = new Hono()
  // get packages
  // Get the pacakages from the database in the packages table with pagination of 10
  .get("/", async (c) => {
    const packages = await db.select().from(packageMetadataTable).limit(10);

    return c.json({ packages: packages });
  })
  
  /* POST endpoint: should return list of all packages fitting the query parameters on valid JSON requests
   zValidator to validate the request body fits the schema below: output an error when it doesn't
  insertPacakgeMetadataSchema = {
    name: string
    version: string
  }
   this should return a list of packages (if only one package, return a list with one PackageMetadata Object)
   TODO: implement this and account for the "*" case */
  // c is a request context object that contains info about request and response
  .post("/", zValidator("json", postPackageMetadataSchema), async (c) => {
    // assume we get {name: "package-name", version: "x.y.z"} as request body
    const { Name, Version, offset } = c.req.valid("json");
    if (Name === "*") {
      // enumerate a list of all packages in a list when given "*"
      const query = await db.select().from(packageMetadataTable);
      if(offset) {
        // offset parameter defines the beginning page of the search
        //e.g. offset=10 will start the search from the 10th page
        // go to page *offset* and start returning from there
        const response = query.slice(parseInt(offset, 10));
        return c.json(response);
      }
      return c.json(query);
    }

    // do a search in the database for the package using name and version as parameters
    // equivalent to SELECT * FROM package_metadata WHERE Name = Name AND Version = Version
    const query = await db
      .select()
      .from(packageMetadataTable)
      .where(
        and(
          eq(packageMetadataTable.Name, Name),
          eq(packageMetadataTable.Version, Version),
        ),
      );
      
    if(offset) {
      const response = query.slice(parseInt(offset, 10));
      return c.json(response);
    }

    return c.json(query); 
  });
