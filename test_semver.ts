import { z } from "zod";

// Define the version regex for validation
const versionRegex = /^(?:\d+\.\d+\.\d+|\^?\d+\.\d+\.\d+|\~?\d+\.\d+\.\d+|\d+\.\d+\.\d+-\d+\.\d+\.\d+)$/;

// Define the schema for a single object in the list
const packageMetadataSchema = z.object({
  Name: z.string().min(1, "Name must be at least 1 character long"),
  Version: z
    .string()
    .optional()
    .refine(
      (version) => {
        if (version) {
          return versionRegex.test(version); // Use your existing versionRegex for validation
        }
        return true; // allow Version field to be empty
      },
      {
        message:
          "Version must be in the format Exact (1.2.3), Bounded range (1.2.3-2.1.0), Carat (^1.2.3), or Tilde (~1.2.0)",
      }
    ),
});

// Define the schema for the entire list
const packageMetadataListSchema = z.array(packageMetadataSchema);

// Example request body for validation
const requestBody = [
  {
    Version: "1.2.3",
    Name: "package1",
  },
  {
    Version: "^1.2.3",
    Name: "package2",
  },
  {
    Version: "~1.2.0",
    Name: "package3",
  },
];

try {
  const validatedData = packageMetadataListSchema.parse(requestBody);
  console.log("Validated data:", validatedData);
} catch (e) {
  console.error("Validation errors:", e.errors);
}