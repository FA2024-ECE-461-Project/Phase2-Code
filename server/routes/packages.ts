// this route handles all operations related to the package metadata
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  packageMetadata as packageMetadataTable,
} from "../db/schemas/packageSchemas";
import { db } from "../db";
import { eq, and, or } from "drizzle-orm";

// schema for the post request body
// use refine to ensure that the name is at least 1 character long or "*", but nothing else

const versionRegex = /^(?:\d+\.\d+\.\d+|(?:\d+\.\d+\.\d+)-(?:\d+\.\d+\.\d+)|\^\d+\.\d+\.\d+|~\d+\.\d+\.\d+)$/;
const postPackageMetadataRequestSchema = z.object({
  Name: z
    .string()
    .min(3, { message: "Name must be at least 3 character long" })
    .refine((name) => name.length >= 3 || name === "*", {
      message: 'Name must be "*" if it\'s shorter than 3 characters',
    }),
  Version: z.string().refine((version) => {
    return versionRegex.test(version);
  }, 
  { message: "Version must be in the format x.y.z, x.y.z-x.y.z, ^x.y.z, or ~x.y.z" })
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
  }
    @param c is a request context object that contains info about request and response
    @return return a list of packages (if only one package, return a list with one PackageMetadata Object)
    TODO: 1. ensure response body has an offset parameter: use the c object
  */
  .post(
    "/",
    zValidator("json", postPackageMetadataRequestSchema),
    async (c) => {
      // assume we get {name: "package-name", version: "x.y.z"} as request body
      const { Name, Version} = c.req.valid("json");
      const offset: string | undefined = c.req.query("offset"); // offset is undefined when no parameter is given
      const pageLimit = 10; // change this line when there is a spec on page limit

      // no offset given: then a simple query, nextOffset will be 1 (0 + 1)
      let query = await db.select().from(packageMetadataTable).limit(pageLimit);


    },
  );
  