// this route handles all operations related to the package metadata
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { packageMetadata as packageMetadataTable } from "../db/schemas/packageSchemas";
import { db } from "../db";
import * as semver from "semver";
import { eq, and, gte, lt, sql } from "drizzle-orm";

// regex for version checking
const exactRegex = /^\d+\.\d+\.\d+$/;
const rangeRegex = /^\d+\.\d+\.\d+-\d+\.\d+\.\d+$/;
const caretRegex = /^\^\d+\.\d+\.\d+$/;
const tildeRegex = /^~\d+\.\d+\.\d+$/;
const versionRegex = new RegExp(
  `(${exactRegex.source})|(${rangeRegex.source})|(${caretRegex.source})|(${tildeRegex.source})`,
);

// schema for the post request body
const postPackageMetadataRequestSchema = z.object({
  Name: z.string().refine((name) => name.length >= 3 || name === "*", {
    message: 'Name must be "*" if it\'s shorter than 3 characters',
  }),
  Version: z
    .string()
    .optional()
    .refine(
      (version) => {
        if (version) {
          return versionRegex.test(version);
        }
        return true;    // allow Version field to be empty
      },
      {
        message:
          "Version must be in the format x.y.z, x.y.z-x.y.z, ^x.y.z, or ~x.y.z",
      },
    ),
});

type PostPackageMetadataRequest = z.infer<typeof postPackageMetadataRequestSchema>;
type ResponseSchema = {
  Version: string;
  Name: string;
  ID: string;
}
export const metadataRoutes = new Hono()
  // get packages
  // Get the pacakages from the database in the packages table with pagination of 10
  .get("/", async (c) => {
    const packages = await db.select().from(packageMetadataTable).limit(10);
    console.log("packages:", packages);

    //omit the ID field
    return c.json(packages);
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
      const { Name, Version } = c.req.valid("json");
      const offset: string | undefined = c.req.query("offset"); // offset is undefined when no parameter is given
      const pageLimit = 10; // change this line when there is a spec on page limit

      // set nextOffset
      const nextOffset = offset ? parseInt(offset) + 1 : 1;
      c.header("nextOffset", nextOffset.toString());
      let packages: ResponseSchema[] = [];

      if (!Version) {
        if(Name === "*") {
          packages = await db
            .select({
              Version: packageMetadataTable.Version,
              Name: packageMetadataTable.Name,
              ID: packageMetadataTable.ID
            })
            .from(packageMetadataTable)
            .limit(pageLimit);
        } else {
          packages = await db
            .select({
              Name: packageMetadataTable.Name,
              Version: packageMetadataTable.Version
            })
            .from(packageMetadataTable)
            .where(eq(packageMetadataTable.Name, Name))
            .limit(pageLimit);
        }
        if (offset) {
          const sliceIdx = parseInt(offset) * pageLimit > packages.length ? parseInt(offset) : parseInt(offset) * pageLimit;
          packages = packages.slice(sliceIdx);
        }
        return c.json(packages);
      }

      const versionType = getVersionType(Version);

      // different selection strategy
      if (Name === "*") {
        packages = await db
          .select({
            Name: packageMetadataTable.Name,
            Version: packageMetadataTable.Version
          })
          .from(packageMetadataTable)
          .limit(pageLimit);
      } else if (versionType == "exact") {
        packages = await db
          .select({
            Name: packageMetadataTable.Name,
            Version: packageMetadataTable
          })
          .from(packageMetadataTable)
          .where(
            and(
              eq(packageMetadataTable.Name, Name),
              eq(packageMetadataTable.Version, Version),
            ),
          )
          .limit(pageLimit);
      } else if (versionType == "range") {
        const [start, end] = Version.split("-");
        packages = await db
          .select({
            Name: packageMetadataTable.Name,
            Version: packageMetadataTable.Version
          })
          .from(packageMetadataTable)
          .where(
            and(
              eq(packageMetadataTable.Name, Name),
              and(
                gte(packageMetadataTable.Version, start),
                lt(packageMetadataTable.Version, end),
              ),
            )
          )
          .limit(pageLimit);
        packages = packages.filter((pkg) => pkg.Version && semver.satisfies(pkg.Version, Version));
      } else if (versionType == "caret") {
        packages = await db
          .select({
            Name: packageMetadataTable.Name,
            Version: packageMetadataTable.Version
          })
          .from(packageMetadataTable)
          .where(eq(packageMetadataTable.Name, Name))
          .limit(pageLimit);
        packages = packages.filter((pkg) => pkg.Version && semver.satisfies(pkg.Version, Version));        
        console.log("after filter:", packages);

      } else if (versionType == "tilde") {
        packages = await db
          .select({
            Name: packageMetadataTable.Name,
            Version: packageMetadataTable
          })
          .from(packageMetadataTable)
          .where(eq(packageMetadataTable.Name, Name))
          .limit(pageLimit);
        packages = packages.filter((pkg) => pkg.Version && semver.satisfies(pkg.Version, Version));
      }
      
      console.log("after filter/query:", packages);
      // deal with offset
      if (offset) {
        const sliceIdx = parseInt(offset) * pageLimit > packages.length ? parseInt(offset) : parseInt(offset) * pageLimit;
        packages = packages.slice(sliceIdx);
      }

      //print the packages
      console.log("packages:", packages);
      // return packages
      return c.json(packages);
    },
  );

function getVersionType(version: string) {
  if (exactRegex.test(version)) {
    return "exact";
  } else if (rangeRegex.test(version)) {
    return "range";
  } else if (caretRegex.test(version)) {
    return "caret";
  } else if (tildeRegex.test(version)) {
    return "tilde";
  } else {
    throw new Error("Invalid version format");
  }
}
