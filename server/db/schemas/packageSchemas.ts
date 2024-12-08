import { pgTable, varchar, text, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// Packages Table with References
export const packages = pgTable(
  "packages",
  {
    ID: varchar("id", { length: 255 }).primaryKey()
  }
);

export const packageMetadata = pgTable(
  "package_metadata",
  {
    ID: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => uuidv4()), // Automatically generates a UUID at runtime
    Name: varchar("name", { length: 255 }).notNull(),
    Version: varchar("version", { length: 20 }).notNull(),
  },
  (package_metadata) => [
    index("name_version_idx").on(
      package_metadata.Name,
      package_metadata.Version,
    ), // Ensures unique name/version pair
  ],
);

// Package Data Table
export const packageData = pgTable(
  "package_data",
  {
    ID: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => uuidv4()), // Automatically generates a UUID at runtime
    S3: text("S3_Path"), // Optional field for direct package content
    URL: varchar("url", { length: 255 }), // Optional field for package URL
    debloat: boolean("debloat").default(false), // Indicates if debloating is enabled
    JSProgram: text("js_program"), // Optional field for JavaScript program
  },
  (package_data) => [
    index("url_idx").on(package_data.ID), // Index for id lookups
  ],
);

// Pacakge rate table
export const packageRating = pgTable(
  "package_rate",
  {
    ID: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => uuidv4()), // Automatically generates a UUID at runtime
    URL: varchar("url", { length: 255 }).notNull(),
    NetScore: varchar("net_score", { length: 255 }),
    NetScore_Latency: varchar("net_score_latency", { length: 255 }),
    RampUp: varchar("ramp_up", { length: 255 }),
    RampUp_Latency: varchar("ramp_up_latency", { length: 255 }),
    Correctness: varchar("correctness", { length: 255 }),
    Correctness_Latency: varchar("correctness_latency", { length: 255 }),
    BusFactor: varchar("bus_factor", { length: 255 }),
    BusFactor_Latency: varchar("bus_factor_latency", { length: 255 }),
    ResponsiveMaintainer: varchar("responsive_maintainer", { length: 255 }),
    ResponsiveMaintainer_Latency: varchar("responsive_maintainer_latency", { length: 255 }),
    License: varchar("license", { length: 255 }),
    License_Latency: varchar("license_latency", { length: 255 }),
    PR_Code_Reviews: varchar("pr_code_reviews", { length: 255 }),
    PR_Code_Reviews_Latency: varchar("pr_code_reviews_latency", { length: 255 }),
    DependencyMetric: varchar("dependency_metric", { length: 255 }),
    DependencyMetric_Latency: varchar("dependency_metric_latency", { length: 255 }),
  },
  (package_rate) => [
    index("package_id").on(package_rate.ID), // Index for id lookups
  ],
);
