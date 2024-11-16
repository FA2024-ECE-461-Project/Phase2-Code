import { pgTable, varchar, text, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// Packages Table with References
export const packages = pgTable(
  "packages",
  {
    metadataId: varchar("metadata_id", { length: 255 })
      .notNull()
      .references(() => packageMetadata.id),
    dataId: varchar("data_id", { length: 255 })
      .notNull()
      .references(() => packageData.id),
  },
  (packages) => [
    index("metadata_idx").on(packages.metadataId), // Index for metadataId
    index("data_idx").on(packages.dataId), // Index for dataId
  ]
);

export const packageMetadata = pgTable(
  "package_metadata",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => uuidv4()), // Automatically generates a UUID at runtime
    name: varchar("name", { length: 255 }).notNull(),
    version: varchar("version", { length: 20 }).notNull(),
  },
  (package_metadata) => [
    index("name_version_idx").on(
      package_metadata.name,
      package_metadata.version
    ), // Ensures unique name/version pair
  ]
);

// Package Data Table
export const packageData = pgTable(
  "package_data",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => uuidv4()), // Automatically generates a UUID at runtime
    content: text("content"), // Optional field for direct package content
    url: varchar("url", { length: 255 }), // Optional field for package URL
    debloat: boolean("debloat").default(false), // Indicates if debloating is enabled
    jsProgram: text("js_program"), // Optional field for JavaScript program
  },
  (package_data) => [
    index("url_idx").on(package_data.id), // Index for id lookups
  ]
);

// Schema for inserting a user - can be used to validate API requests
export const insertPackagesSchema = createInsertSchema(packages, {
  metadataId: z.string().uuid({ message: "metadataId must be a valid UUID" }), // Ensures metadataId is a valid UUID
  dataId: z.string().uuid({ message: "dataId must be a valid UUID" }), // Ensures dataId is a valid UUID
});

export const insertPackageMetadataSchema = createInsertSchema(packageMetadata, {
  name: z
    .string()
    .min(3, { message: "Name must be at least 3 characters long" }),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, {
    message: "Version must follow semantic versioning (e.g., 1.0.0)",
  }), // Semantic versioning
});

export const insertPackageDataSchema = createInsertSchema(packageData, {
  content: z.string().optional(), // Optional content field
  url: z.string().url({ message: "URL must be a valid URL" }).optional(), // Optional URL field with validation
  debloat: z.boolean().default(false), // Default value for debloat
  jsProgram: z.string().optional(), // Optional JS program
});

// Schema for selecting a user - can be used to validate API responses
// Custom select schema for `packages`
export const selectPackagesSchema = createSelectSchema(packages, {
  metadataId: z.string().uuid(), // Ensure metadataId is always a valid UUID
  dataId: z.string().uuid(), // Ensure dataId is always a valid UUID
});

export const selectPackageMetadataSchema = createSelectSchema(packageMetadata, {
  name: z.string(),
  version: z.string(),
});

export const selectPackageDataSchema = createSelectSchema(packageData, {
  content: z.string().optional(),
  url: z.string().optional(),
  debloat: z.boolean(),
  jsProgram: z.string().optional(),
});
