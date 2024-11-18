import { pgTable, varchar, text, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// Packages Table with References
export const packages = pgTable(
  "packages",
  {
    ID: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => uuidv4()), // Automatically generates a UUID at runtime
    metadataId: varchar("metadata_id", { length: 255 })
      .notNull()
      .references(() => packageMetadata.ID),
    dataId: varchar("data_id", { length: 255 })
      .notNull()
      .references(() => packageData.ID),
  },
  (packages) => [
    index("metadata_idx").on(packages.metadataId), // Index for metadataId
    index("data_idx").on(packages.dataId), // Index for dataId
  ]
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
      package_metadata.Version
    ), // Ensures unique name/version pair
  ]
);

// Package Data Table
export const packageData = pgTable(
  "package_data",
  {
    ID: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => uuidv4()), // Automatically generates a UUID at runtime
    Content: text("content"), // Optional field for direct package content
    URL: varchar("url", { length: 255 }), // Optional field for package URL
    debloat: boolean("debloat").default(false), // Indicates if debloating is enabled
    JSProgram: text("js_program"), // Optional field for JavaScript program
  },
  (package_data) => [
    index("url_idx").on(package_data.ID), // Index for id lookups
  ]
);

// Schema for inserting a user - can be used to validate API requests
export const insertPackagesSchema = createInsertSchema(packages, {
  metadataId: z.string().uuid({ message: "metadataId must be a valid UUID" }), // Ensures metadataId is a valid UUID
  dataId: z.string().uuid({ message: "dataId must be a valid UUID" }), // Ensures dataId is a valid UUID
});

export const insertPackageMetadataSchema = createInsertSchema(packageMetadata, {
  Name: z
    .string()
    .min(3, { message: "Name must be at least 3 characters long" }),
  Version: z.string().regex(/^\d+\.\d+\.\d+$/, {
    message: "Version must follow semantic versioning (e.g., 1.0.0)",
  }), // Semantic versioning
});

export const insertPackageDataSchema = createInsertSchema(packageData, {
  Content: z.string().optional(), // Optional content field
  URL: z.string().url({ message: "URL must be a valid URL" }).optional(), // Optional URL field with validation
  debloat: z.boolean().default(false), // Default value for debloat
  JSProgram: z.string().optional(), // Optional JS program
});

// Schema for selecting a user - can be used to validate API responses
// Custom select schema for `packages`
export const selectPackagesSchema = createSelectSchema(packages, {
  metadataId: z.string().uuid(), // Ensure metadataId is always a valid UUID
  dataId: z.string().uuid(), // Ensure dataId is always a valid UUID
});

export const selectPackageMetadataSchema = createSelectSchema(packageMetadata, {
  Name: z.string(),
  Version: z.string(),
});

export const selectPackageDataSchema = createSelectSchema(packageData, {
  Content: z.string().optional(),
  URL: z.string().optional(),
  debloat: z.boolean(),
  JSProgram: z.string().optional(),
});
