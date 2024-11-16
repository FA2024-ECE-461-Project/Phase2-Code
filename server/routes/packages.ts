import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { fakePackages } from "./packageRoutes";

const app = new Hono();

const fakeMetadata = fakePackages.map((pkg) => pkg.metadata);

const metadataSchema = z.object({
  Version: z.string(),
  Name: z.string(),
  ID: z.string().optional(),
});

type Packages = z.infer<typeof metadataSchema>;

const metadataPostSchema = metadataSchema.omit({ ID: true });

export const metadataRoutes = app

  // get all packages
  .get("/", async (c) => {
    return c.json({ packages: fakeMetadata });
  })

  // post request
  .post("/", zValidator("json", metadataPostSchema), async (c) => {
    const newPackage = await c.req.valid("json");
    const newID = (fakeMetadata.length + 1).toString(); // Generate a new ID
    const packageWithID = {
      ...newPackage,
      ID: newID,
    };

    fakeMetadata.push(packageWithID);

    // Return the new package with a status code of 201
    c.status(201);
    return c.json(packageWithID);
  });
