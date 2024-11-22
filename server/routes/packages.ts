// this route handles all operations related to the package metadata
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
import { eq, and } from "drizzle-orm";

// schema for the post request body
// use refine to ensure that the name is at least 1 character long or "*", but nothing else
const postPackageMetadataRequestSchema = z.object({
  Name: z
    .string()
    .min(1, { message: "Name must be at least 1 character long" })
    .refine((name) => name.length >= 3 || name === "*", {
      message: 'Name must be "*" if it\'s shorter than 3 characters',
    }),
  Version: z.string(),
});

export const metadataRoutes = new Hono()
  // get packages
  // Get the pacakages from the database in the packages table with pagination of 10
  .get("/", async (c) => {
    const packages = await db.select().from(packageMetadataTable).limit(10);

    return c.json({ packages: packages });
  })

  /* 
   POST endpoint: should return list of all packages fitting the query parameters on valid JSON requests
   zValidator to validate the request body fits the schema below: output an error when it doesn't
   schema: {
     Name: string (at least 1 character long),
     Version: string,
     offset: string
  }
   this should return a list of packages (if only one package, return a list with one PackageMetadata Object)
   TODO: implement this and account for the "*" case 
  */
  // c is a request context object that contains info about request and response
  .post(
    "/",
    zValidator("json", postPackageMetadataRequestSchema),
    async (c) => {
      // assume we get {name: "package-name", version: "x.y.z"} as request body
      const { Name, Version} = c.req.valid("json");
      const offset: string | undefined = c.req.query("offset"); // offset is undefined when no parameter is given

      const pageLimit = 10; // change this line when there is a spec on page limit
      if (Name === "*") {
        // enumerate a list of all packages in a list when given "*"
        // select all packages from packageMetadataTable, 10 packages per page
        const query = await db
          .select()
          .from(packageMetadataTable)
          .limit(pageLimit);
        if (offset) {
          const query = await db
            .select()
            .from(packageMetadataTable)
            .limit(pageLimit)
            .offset(parseInt(offset, 10));
          return c.json(query);
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
        )
        .limit(pageLimit);

      if (offset) {
        const query = await db
          .select()
          .from(packageMetadataTable)
          .where(
            and(
              eq(packageMetadataTable.Name, Name),
              eq(packageMetadataTable.Version, Version),
            ),
          )
          .limit(pageLimit)
          .offset(parseInt(offset, 10));

        return c.json(query);
      }

      return c.json(query);
    },
  );
