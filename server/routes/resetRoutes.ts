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
} from "../db/schemas/packageSchemas";
import { db } from "../db";

export const resetRoutes = new Hono()
    .delete("/", async (c) => {
        try {
            // Perform the reset: Clear all related tables
            await db.delete(packagesTable);
            await db.delete(packageMetadataTable);
            await db.delete(packageDataTable);
        
            // Return a success response
            return c.json({ message: "All data successfully reset." }, 200);
          } catch (error) {
            console.error("Error resetting database:", error);
        
            // Return an error response if something goes wrong
            return c.json({ message: "Failed to reset data." }, 500);
          }
    });