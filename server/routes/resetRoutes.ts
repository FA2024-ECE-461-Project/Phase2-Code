import { Hono } from "hono";
import {
  packageMetadata as packageMetadataTable,
  packageData as packageDataTable,
  packageRating as packageRatingTable,
  packages as packagesTable,
} from "../db/schemas/packageSchemas";
import { db } from "../db";

export const resetRoutes = new Hono().delete("/", async (c) => {
  try {
    // Perform the reset: Clear all related tables
    await db.delete(packageMetadataTable);
    await db.delete(packageDataTable);
    await db.delete(packageRatingTable);
    await db.delete(packagesTable);

    // Return a success response
    return c.json({ message: "All data successfully reset." }, 200);
  } catch (error) {
    console.error("Error resetting database:", error);

    // Return an error response if something goes wrong
    return c.json({ message: "Failed to reset data." }, 500);
  }
});
