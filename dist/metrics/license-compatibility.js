"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_license_compatibility = get_license_compatibility;
exports.getLicense = getLicense;
exports.checkLicenseCompatibility = checkLicenseCompatibility;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("../logger"));
const COMPATIBLE_LICENSES = [
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
async function get_license_compatibility(repoPath) {
    const startTime = Date.now();
    logger_1.default.info('Starting license compatibility check', { repoPath });
    try {
        const license = await getLicense(repoPath);
        const compatible = license ? checkLicenseCompatibility(license) : false;
        const score = compatible ? 1 : 0;
        const endTime = Date.now();
        const latency = endTime - startTime;
        logger_1.default.info('License compatibility check complete', {
            repoPath,
            score,
            latency,
            compatible,
            licenseFound: !!license
        });
        return { score, latency };
    }
    catch (error) {
        logger_1.default.error('Error in get_license_compatibility', {
            repoPath,
            error: error.message
        });
        return { score: 0, latency: 0 };
    }
}
async function getLicense(repoPath) {
    logger_1.default.debug('Searching for license file', { repoPath });
    // Check for LICENSE file first
    const files = fs_1.default.readdirSync(repoPath);
    const licenseFile = files.find(file => file.toLowerCase().startsWith('license'));
    if (licenseFile) {
        logger_1.default.debug('License file found', { licenseFile });
        const licenseContent = fs_1.default.readFileSync(path_1.default.join(repoPath, licenseFile), 'utf-8');
        return licenseContent;
    }
    // If no LICENSE file, check README.md
    logger_1.default.debug('No license file found, checking README.md', { repoPath });
    const readmePath = path_1.default.join(repoPath, 'README.md');
    if (fs_1.default.existsSync(readmePath)) {
        const readmeContent = fs_1.default.readFileSync(readmePath, 'utf-8');
        const license = extractLicenseFromReadme(readmeContent);
        if (license) {
            logger_1.default.debug('License information found in README.md');
        }
        else {
            logger_1.default.warn('No license information found in README.md');
        }
        return license;
    }
    logger_1.default.warn('No license information found in repository', { repoPath });
    return null;
}
function extractLicenseFromReadme(readmeContent) {
    const licenseRegex = /#+\s*Licen[cs]e\s*([\s\S]*?)(?=#+|$)/i;
    const match = readmeContent.match(licenseRegex);
    if (match) {
        logger_1.default.debug('License information extracted from README.md');
        return match[1].trim();
    }
    logger_1.default.debug('No license information found in README.md');
    return null;
}
// export function checkLicenseCompatibility(licenseText: string): boolean {
//     if(!licenseText) return false;
//     const upperCaseLicense = licenseText.toUpperCase(); // Convert to uppercase for case-insensitive comparison 
//     return COMPATIBLE_LICENSES.some(license => {
//         return license.keywords.every(keyword => upperCaseLicense.includes(keyword.toUpperCase()));
//     });
// }
function checkLicenseCompatibility(licenseText) {
    if (!licenseText)
        return false; // If no license text, return false
    return COMPATIBLE_LICENSES.some(license => {
        if ('patterns' in license) { // Check if license has multiple patterns
            return license.patterns.some(pattern => pattern.test(licenseText)); // Check if any pattern matches
        }
        return license.pattern.test(licenseText); // Check if the pattern matches
    });
}
