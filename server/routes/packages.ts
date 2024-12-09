import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { packageMetadata as packageMetadataTable } from "../db/schemas/packageSchemas";
import { db } from "../db";
import * as semver from "semver";
import { eq, and, gte, lt } from "drizzle-orm";
import { log } from "../logger";

// regex for version checking
const exactRegex = /^\d+\.\d+\.\d+$/;
const rangeRegex = /^\d+\.\d+\.\d+-\d+\.\d+\.\d+$/;
const caretRegex = /^\^\d+\.\d+\.\d+$/;
const tildeRegex = /^~\d+\.\d+\.\d+$/;
const versionRegex = new RegExp(
  `(${exactRegex.source})|(${rangeRegex.source})|(${caretRegex.source})|(${tildeRegex.source})`,
);

const packageQuerySchema = z.object({
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
        return true; // allow empty version
      },
      {
        message:
          "Version must be in the format x.y.z, x.y.z-x.y.z, ^x.y.z, or ~x.y.z",
      },
    ),
});

const postPackagesRequestSchema = z.array(packageQuerySchema);

type PackageQuery = z.infer<typeof packageQuerySchema>;
type ResponseSchema = {
  Name: string;
  Version: string;
  ID: string;
};

export const metadataRoutes = new Hono()
  .get("/", async (c) => {
    const packages = await db.select().from(packageMetadataTable).limit(10);
    // Return first 10 packages without ID omission here (the spec only applies to the POST route)
    return c.json(packages);
  })
  .post(
    "/",
    zValidator("json", postPackagesRequestSchema),
    async (c) => {
      // Authorization check (if required by spec)
      const authHeader = c.req.header("X-Authorization");
      if (!authHeader) {
        return c.text("Forbidden", 403);
      }
      // Implement actual auth logic as needed

      const queries = c.req.valid("json"); // Array of PackageQuery
      const offsetParam = c.req.query("offset");
      const offset = offsetParam ? parseInt(offsetParam) : 0;
      const pageLimit = 10;
      const nextOffset = offset + 1;

      log.info("Incoming queries:", queries, "Offset:", offset);

      // If no queries provided, return empty array
      if (queries.length === 0) {
        c.header("offset", nextOffset.toString());
        return c.json([]);
      }

      // Process each query and union results
      let allResults: ResponseSchema[] = [];

      for (const query of queries) {
        let { Name, Version } = query;
        let packages: ResponseSchema[] = [];

        // Fetch packages based on query
        if (!Version) {
          // No version specified
          if (Name === "*") {
            packages = await db
              .select({
                Name: packageMetadataTable.Name,
                Version: packageMetadataTable.Version,
                ID: packageMetadataTable.ID,
              })
              .from(packageMetadataTable)
              .limit(100); // limit large for pre-filtering
          } else {
            packages = await db
              .select({
                Name: packageMetadataTable.Name,
                Version: packageMetadataTable.Version,
                ID: packageMetadataTable.ID,
              })
              .from(packageMetadataTable)
              .where(eq(packageMetadataTable.Name, Name))
              .limit(100);
          }
        } else {
          // Version specified
          const versionType = getVersionType(Version);

          if (Name === "*") {
            // If Name is "*", we fetch all packages and then filter by version
            packages = await db
              .select({
                Name: packageMetadataTable.Name,
                Version: packageMetadataTable.Version,
                ID: packageMetadataTable.ID,
              })
              .from(packageMetadataTable)
              .limit(100);
            packages = packages.filter(
              (pkg) => pkg.Version && semver.satisfies(pkg.Version, Version),
            );
          } else if (versionType == "exact") {
            packages = await db
              .select({
                Name: packageMetadataTable.Name,
                Version: packageMetadataTable.Version,
                ID: packageMetadataTable.ID,
              })
              .from(packageMetadataTable)
              .where(
                and(
                  eq(packageMetadataTable.Name, Name),
                  eq(packageMetadataTable.Version, Version),
                ),
              )
              .limit(100);
          } else if (versionType == "range") {
            const [start, end] = Version.split("-");
            packages = await db
              .select({
                Name: packageMetadataTable.Name,
                Version: packageMetadataTable.Version,
                ID: packageMetadataTable.ID,
              })
              .from(packageMetadataTable)
              .where(
                and(
                  eq(packageMetadataTable.Name, Name),
                  and(
                    gte(packageMetadataTable.Version, start),
                    lt(packageMetadataTable.Version, end),
                  ),
                ),
              )
              .limit(100);
            packages = packages.filter(
              (pkg) => pkg.Version && semver.satisfies(pkg.Version, Version),
            );
          } else if (versionType == "caret") {
            packages = await db
              .select({
                Name: packageMetadataTable.Name,
                Version: packageMetadataTable.Version,
                ID: packageMetadataTable.ID,
              })
              .from(packageMetadataTable)
              .where(eq(packageMetadataTable.Name, Name))
              .limit(100);
            packages = packages.filter(
              (pkg) => pkg.Version && semver.satisfies(pkg.Version, Version),
            );
          } else if (versionType == "tilde") {
            packages = await db
              .select({
                Name: packageMetadataTable.Name,
                Version: packageMetadataTable.Version,
                ID: packageMetadataTable.ID,
              })
              .from(packageMetadataTable)
              .where(eq(packageMetadataTable.Name, Name))
              .limit(100);
            packages = packages.filter(
              (pkg) => pkg.Version && semver.satisfies(pkg.Version, Version),
            );
          }
        }

        // Combine results (union) - remove duplicates by ID
        // If ID is unique per package version, we can use a map
        const existingIDs = new Set(allResults.map((r) => r.ID));
        for (const p of packages) {
          if (!existingIDs.has(p.ID)) {
            allResults.push(p);
            existingIDs.add(p.ID);
          }
        }
      }

      // Apply pagination via offset
      const startIndex = offset * pageLimit;
      const endIndex = startIndex + pageLimit;
      const pagedResults = allResults.slice(startIndex, endIndex);

      // If results exceed what we can return in one page, we set next offset
      c.header("offset", nextOffset.toString());

      // If no packages found, return empty
      if (pagedResults.length === 0) {
        return c.json([]);
      }

      return c.json(pagedResults);
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