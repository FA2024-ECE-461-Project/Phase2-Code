import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { exec } from "child_process";

const fakePackages: Package[] = [
  {
    metadata: {
      Name: "Package 1 - jimmy",
      Version: "1.0.1",
      ID: "1",
    },
    data: {
      Content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      URL: "http://example.com",
      debloat: true,
      JSProgram: "console.log('Hello, world!');",
    },
  },
  {
    metadata: {
      Name: "Package 2",
      Version: "1.0.2",
      ID: "2",
    },
    data: {
      Content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      URL: "https://github.com/cloudinary/cloudinary_npm",
      debloat: false,
      JSProgram: "alert('Hello, world!');",
    },
  },
  {
    metadata: {
      Name: "Package 3",
      Version: "1.0.3",
      ID: "3",
    },
    data: {
      Content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      URL: "https://github.com/cloudinary/cloudinary_npm",
      debloat: false,
      JSProgram: "alert('Hello, world!');",
    },
  },
];

const packageSchema = z.object({
  metadata: z.object({
    Name: z.string(),
    Version: z.string(),
    ID: z.string(),
  }),
  data: z.object({
    Content: z.string().optional(),
    URL: z.string().optional(),
    debloat: z.boolean().optional(),
    JSProgram: z.string().optional(),
  }).optional(),
});

//get the type of the package schema from zod
type Package = z.infer<typeof packageSchema>;

//Omit the ID field from the metadata object
const packagePostSchema = packageSchema.extend({
  metadata: packageSchema.shape.metadata.omit({ ID: true }),
});

export const packagesRoutes = new Hono()
  // get all packages
  .get("/", async (c) => {
    return c.json({ packages: fakePackages });
  })

  // post a package
  //zValidator('json', packageSchema), middleware to validate the request body
  .post("/", zValidator("json", packagePostSchema), async (c) => {
    const newPackage = await c.req.valid("json");
    const newID = (fakePackages.length + 1).toString(); // Generate a new ID, do I generate a new ID?
    const packageWithID = {
      ...newPackage,
      metadata: { ...newPackage.metadata, ID: newID },
    };

    fakePackages.push(packageWithID);

    // Return the new package with a status code of 201
    c.status(201);
    return c.json(packageWithID);
  })

  // get a package by id
  .get("/:ID", (c) => {
    const id = c.req.param("ID");
    const PackageById = fakePackages.find((pkg) => pkg.metadata.ID === id);
    if (!PackageById) {
      return c.notFound();
    }

    return c.json({ PackageById });
  })

  // delete a package by id
  .delete("/:ID", (c) => {
    const id = c.req.param("ID");
    const foundPackage = fakePackages.find((pkg) => pkg.metadata.ID === id);
    if (!foundPackage) {
      return c.notFound();
    }
    const deletePackages = fakePackages.splice(
      fakePackages.indexOf(foundPackage),1
    );

    return c.json({ Package: deletePackages[0] });
  })

  // get the rating of a package by id
  .get("/:ID/rate", async (c) => {
    const id = c.req.param("ID");
    console.log(`Received request for package ID: ${id}`);

    const foundPackage = fakePackages.find((pkg) => pkg.metadata.ID === id);
    if (!foundPackage) {
      console.log(`Package with ID ${id} not found`);
      return c.notFound();
    }

    // const url = foundPackage.data.URL;
    // it's running the url.txt script, need to change to run url from the package
    const command = `./run url.txt`;

    return new Promise((resolve) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing script: ${error.message}`);
          c.status(500);
          resolve(c.json({ error: "Internal Server Error" }));
        } else {
          if (stderr) {
            console.error(`Script stderr: ${stderr}`);
          }
          try {
            const jsonResponse = JSON.parse(stdout);
            delete jsonResponse.URL;
            resolve(c.json(jsonResponse));
          } catch (parseError) {
            console.error(`Error parsing JSON: ${parseError}`);
            c.status(500);
            resolve(c.json({ error: "Internal Server Error" }));
          }
        }
      });
    });
  });
