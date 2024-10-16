import fs from 'fs';
import path from 'path';
import logger from '../logger';

type LicenseDefinition = { // Define the license patterns
    name: string;
    pattern: RegExp;
} | {
    name: string;
    patterns: RegExp[];
};

const COMPATIBLE_LICENSES: LicenseDefinition[] = [
    { name: 'MIT', pattern: /\bMIT\b/i }, // match MIT 
    { name: 'Apache-2.0', pattern: /\bAPACHE(?:\s+LICENSE)?(?:,?\s+V(?:ERSION)?)?\s*2(?:\.0)?\b/i }, // match APACHE (2, 2.0) (v2 or version 2)
    { 
        name: 'GPL-3.0', 
        patterns: [
            /\bGPL[\s-]?(?:V(?:ERSION)?\s*)?3(?:\.0)?\b/i, // match GPL (3, 3.0, V3, V3.0, version 3)
            /\bGNU\s+GENERAL\s+PUBLIC\s+LICENSE\s+(?:V(?:ERSION)?\s*)?3(?:\.0)?\b/i //match GNU GENERAL PUBLIC LICENSE (3, 3.0, V3, V3.0, version 3)
        ]
    },
    { 
        name: 'GPL-2.0', 
        patterns: [
            /\bGPL[\s-]?(?:V(?:ERSION)?\s*)?2(?:\.0)?\b/i, // match GPL (2, 2.0, V2, V2.0)
            /\bGNU\s+GENERAL\s+PUBLIC\s+LICENSE\s+(?:V(?:ERSION)?\s*)?2(?:\.0)?\b/i // match GNU GENERAL PUBLIC LICENSE (2, 2.0, V2, V2.0, version 2)
        ]
    },
    { name: 'BSD-3-Clause', pattern: /\bBSD[\s-]3[\s-]CLAUSE\b/i }, // match BSD 3-CLAUSE
    { name: 'BSD-2-Clause', pattern: /\bBSD[\s-]2[\s-]CLAUSE\b/i }, // match BSD 2-CLAUSE
    { 
        name: 'LGPL-2.1', 
        patterns: [
            /\bLGPL[\s-]?(?:V(?:ERSION)?\s*)?2\.1\b/i, // match LGPL (2.1, V2.1, version 2.1)
            /\bGNU\s+LESSER\s+GENERAL\s+PUBLIC\s+LICENSE\s+(?:V(?:ERSION)?\s*)?2\.1\b/i // match GNU LESSER GENERAL PUBLIC LICENSE (2.1, V2.1, version 2.1)
        ]
    },
    { name: 'Zlib', pattern: /\bZLIB\b/i } // match ZLIB
];

//old const COMPATIBLE_LICENSES = [
//     { name: 'GNU LESSER GENERAL PUBLIC LICENSE V2.1', keywords: ['LGPL', 'GNU LESSER GENERAL PUBLIC LICENSE', '2.1'] },
//     { name: 'GNU GENERAL PUBLIC LICENSE V2', keywords: ['GPL', 'GNU GENERAL PUBLIC LICENSE', '2'] },
//     { name: 'GNU GENERAL PUBLIC LICENSE V3', keywords: ['GPL', 'GNU GENERAL PUBLIC LICENSE', '3'] },
//     { name: 'MIT LICENSE', keywords: ['MIT'] },
//     { name: 'BSD 2-CLAUSE LICENSE', keywords: ['BSD', '2-CLAUSE'] },
//     { name: 'BSD 3-CLAUSE LICENSE', keywords: ['BSD', '3-CLAUSE'] },
//     { name: 'APACHE LICENSE 2.0', keywords: ['APACHE', '2.0'] },
//     { name: 'ZLIB LICENSE', keywords: ['ZLIB'] },
// ];

interface LicenseResult {
    score: number;
    latency: number;
}

export async function get_license_compatibility(repoPath: string): Promise<LicenseResult> {
    const startTime = Date.now();
    logger.info('Starting license compatibility check', { repoPath });

    try {
        const license = await getLicense(repoPath);
        const compatible = license ? checkLicenseCompatibility(license) : false;
        const score = compatible ? 1 : 0;

        const endTime = Date.now();
        const latency = endTime - startTime;

        logger.info('License compatibility check complete', { 
            repoPath, 
            score, 
            latency, 
            compatible, 
            licenseFound: !!license 
        });

        return { score, latency };
    } catch (error) {
        logger.error('Error in get_license_compatibility', { 
            repoPath, 
            error: (error as Error).message 
        });
        return { score: 0, latency: 0 };
    }
}

export async function getLicense(repoPath: string): Promise<string | null> {
    logger.debug('Searching for license file', { repoPath });
    // Check for LICENSE file first
    const files = fs.readdirSync(repoPath);
    const licenseFile = files.find(file => file.toLowerCase().startsWith('license'));
    if (licenseFile) {
        logger.debug('License file found', { licenseFile });
        const licenseContent = fs.readFileSync(path.join(repoPath, licenseFile), 'utf-8');
        return licenseContent;
    }

    // If no LICENSE file, check README.md
    logger.debug('No license file found, checking README.md', { repoPath });
    const readmePath = path.join(repoPath, 'README.md');
    if (fs.existsSync(readmePath)) {
        const readmeContent = fs.readFileSync(readmePath, 'utf-8');
        const license = extractLicenseFromReadme(readmeContent);
        if (license) {
            logger.debug('License information found in README.md');
        } else {
            logger.warn('No license information found in README.md');
        }
        return license;
    }

    logger.warn('No license information found in repository', { repoPath });
    return null;
}

function extractLicenseFromReadme(readmeContent: string): string | null {
    const licenseRegex = /#+\s*Licen[cs]e\s*([\s\S]*?)(?=#+|$)/i;
    const match = readmeContent.match(licenseRegex);
    if (match) {
        logger.debug('License information extracted from README.md');
        return match[1].trim();
    }
    logger.debug('No license information found in README.md');
    return null;
}

// export function checkLicenseCompatibility(licenseText: string): boolean {
//     if(!licenseText) return false;
//     const upperCaseLicense = licenseText.toUpperCase(); // Convert to uppercase for case-insensitive comparison 
   
//     return COMPATIBLE_LICENSES.some(license => {
//         return license.keywords.every(keyword => upperCaseLicense.includes(keyword.toUpperCase()));
//     });
// }

export function checkLicenseCompatibility(licenseText: string): boolean {
    if (!licenseText) return false; // If no license text, return false

    return COMPATIBLE_LICENSES.some(license => {
        if ('patterns' in license) { // Check if license has multiple patterns
            return license.patterns.some(pattern => pattern.test(licenseText)); // Check if any pattern matches
        }
        return license.pattern.test(licenseText); // Check if the pattern matches
    });
}