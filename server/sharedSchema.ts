import { z } from "zod";

// Schema for uploading and creating a new package
export const uploadRequestValidation = z.object({
  Content: z.string().optional(), // Required string field for Content
  URL: z.string().url().optional(), // Required string field for URL
  JSProgram: z.string().optional(), // Required string field for JSProgram
  debloat: z.boolean().optional(), // Required boolean field for debloat
  Name: z.string().optional(), // Required string field for Name with a minimum length of 3
});

// Schema for updating a package
export const updateRequestValidation = z.object({
  metadata: z.object({
    Name: z
      .string()
      .min(3, { message: "Name must be at least 3 characters long" }), // Required string field for Name with a minimum length of 3
    Version: z.string(), // Required string field for Version
    ID: z.string(), // Required string field for ID
  }),
  data: z.object({
    Content: z.string().optional(), // Optional string field for Content
    URL: z.string().url().optional(), // Optional string field for URL
    JSProgram: z.string().optional(), // Optional string field for JSProgram
    debloat: z.boolean().optional(), // Optional boolean field for debloat
  }),
});

