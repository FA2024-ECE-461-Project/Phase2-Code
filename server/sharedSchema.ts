// This file contain the shared schema for the frontend and backend
import { insertPackagesSchema, insertPackageDataSchema, insertPackageMetadataSchema } from "./db/schemas/packageSchemas";
import { z } from "zod";

//mainly use for validation
export const createPackageDataSchema = insertPackageDataSchema.omit({
    ID: true,
});

export const createPackageMetadataSchema = insertPackageMetadataSchema.omit({
    ID: true,
});
  
//get the type of the package schema from zod
export type createPackageData = z.infer<typeof createPackageDataSchema>;
export type createPackageMetadata = z.infer<typeof createPackageMetadataSchema>;
export type createPackages = z.infer<typeof insertPackagesSchema>;