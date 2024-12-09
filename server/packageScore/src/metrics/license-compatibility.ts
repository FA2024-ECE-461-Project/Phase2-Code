import fs from "fs";
import path from "path";
import logger from "../logger";

type LicenseDefinition =
  | {
      // Define the license patterns
      name: string;
      pattern: RegExp;
    }
  | {
      name: string;
      patterns: RegExp[];
    };

const COMPATIBLE_LICENSES: LicenseDefinition[] = [
  { name: "MIT", pattern: /\bMIT\b/i }, // match MIT
  {
    name: "Apache-2.0",
    pattern: /\bAPACHE(?:\s+LICENSE)?(?:,?\s+V(?:ERSION)?)?\s*2(?:\.0)?\b/i,
  }, // match APACHE (2, 2.0) (v2 or version 2)
  {
    name: "GPL-3.0",
    patterns: [
      /\bGPL[\s-]?(?:V(?:ERSION)?\s*)?3(?:\.0)?\b/i, // match GPL (3, 3.0, V3, V3.0, version 3)
      /\bGNU\s+GENERAL\s+PUBLIC\s+LICENSE\s+(?:V(?:ERSION)?\s*)?3(?:\.0)?\b/i, //match GNU GENERAL PUBLIC LICENSE (3, 3.0, V3, V3.0, version 3)
    ],
  },
  {
    name: "GPL-2.0",
    patterns: [
      /\bGPL[\s-]?(?:V(?:ERSION)?\s*)?2(?:\.0)?\b/i, // match GPL (2, 2.0, V2, V2.0)
      /\bGNU\s+GENERAL\s+PUBLIC\s+LICENSE\s+(?:V(?:ERSION)?\s*)?2(?:\.0)?\b/i, // match GNU GENERAL PUBLIC LICENSE (2, 2.0, V2, V2.0, version 2)
    ],
  },
  { name: "BSD-3-Clause", pattern: /\bBSD[\s-]3[\s-]CLAUSE\b/i }, // match BSD 3-CLAUSE
  { name: "BSD-2-Clause", pattern: /\bBSD[\s-]2[\s-]CLAUSE\b/i }, // match BSD 2-CLAUSE
  {
    name: "LGPL-2.1",
    patterns: [
      /\bLGPL[\s-]?(?:V(?:ERSION)?\s*)?2\.1\b/i, // match LGPL (2.1, V2.1, version 2.1)
      /\bGNU\s+LESSER\s+GENERAL\s+PUBLIC\s+LICENSE\s+(?:V(?:ERSION)?\s*)?2\.1\b/i, // match GNU LESSER GENERAL PUBLIC LICENSE (2.1, V2.1, version 2.1)
    ],
  },
  { name: "Zlib", pattern: /\bZLIB\b/i }, // match ZLIB
];

interface LicenseResult {
  score: number;
  latency: number;
}

export async function get_license_compatibility(
  repoPath: string,
): Promise<LicenseResult> {
  const startTime = Date.now();
  logger.info("Starting license compatibility check", { repoPath });

  try {
    const license = await getLicense(repoPath);
    logger.debug("Extracted License Text:", { license });

    const compatible = license ? checkLicenseCompatibility(license) : false;
    logger.debug(`Is Compatible: ${compatible}`);

    const score = compatible ? 1 : 0;

    const endTime = Date.now();
    const latency = endTime - startTime;

    logger.info("License compatibility check complete", {
      repoPath,
      score,
      latency,
      compatible,
      licenseFound: !!license,
    });

    return { score, latency };
  } catch (error) {
    logger.error("Error in get_license_compatibility", {
      repoPath,
      error: (error as Error).message,
    });
    return { score: 0, latency: 0 };
  }
}

export async function getLicense(repoPath: string): Promise<string | null> {
  logger.debug("Searching for license file", { repoPath });

  // Use recursive search to find LICENSE files and README.md
  const licenseFiles = findFiles(repoPath, /^LICENSE/i);
  if (licenseFiles.length > 0) {
    const licenseFilePath = licenseFiles[0];
    logger.debug("License file found", { licenseFilePath });

    const licenseContent = fs.readFileSync(licenseFilePath, "utf-8");
    logger.debug(`License content from ${licenseFilePath}`, { licenseContent });
    return licenseContent;
  }

  // If no LICENSE file, search for README.md files and extract license info
  const readmeFiles = findFiles(repoPath, /^README\.md$/i);
  if (readmeFiles.length > 0) {
    const readmeFilePath = readmeFiles[0];
    logger.debug("README.md file found", { readmeFilePath });

    const readmeContent = fs.readFileSync(readmeFilePath, "utf-8");
    logger.debug(`README.md content from ${readmeFilePath}`, { readmeContent });

    const license = extractLicenseFromReadme(readmeContent);
    if (license) {
      logger.debug("License information extracted from README.md", { license });
      return license;
    } else {
      logger.warn("No license information found in README.md");
    }
  }

  logger.warn("No license information found in repository", { repoPath });
  return null;
}

// Helper function to recursively find files matching a pattern
function findFiles(dir: string, pattern: RegExp): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findFiles(filePath, pattern));
    } else {
      if (pattern.test(file)) {
        results.push(filePath);
      }
    }
  });
  return results;
}

function extractLicenseFromReadme(readmeContent: string): string | null {
  const licenseRegex = /#+\s*Licen[cs]e\s*([\s\S]*?)(?=#+|$)/i;
  const match = readmeContent.match(licenseRegex);
  if (match) {
    logger.debug("License information extracted from README.md", { licenseSection: match[1].trim() });
    return match[1].trim();
  }
  logger.debug("No license information found in README.md");
  return null;
}

export function checkLicenseCompatibility(licenseText: string): boolean {
  if (!licenseText) return false; // If no license text, return false

  logger.debug("Checking license compatibility for license text", { licenseText });

  const compatibilityResult = COMPATIBLE_LICENSES.some((license) => {
    if ("patterns" in license) {
      // Check if license has multiple patterns
      const match = license.patterns.some((pattern) => pattern.test(licenseText));
      logger.debug(`Checking against ${license.name} with multiple patterns: ${match}`, { licenseName: license.name });
      return match; // Check if any pattern matches
    }
    const match = license.pattern.test(licenseText);
    logger.debug(`Checking against ${license.name}: ${match}`, { licenseName: license.name });
    return match; // Check if the pattern matches
  });

  logger.debug(`License compatibility result: ${compatibilityResult}`);
  return compatibilityResult;
}
