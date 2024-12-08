import { log } from "./server/logger";

function isMoreRecentVersion(newVersion: string, latestVersion: string): boolean {
    log.info(`Comparing versions: ${newVersion} and ${latestVersion}`);
    console.log(process.env.SERVER_LOG_FILE);
    const newParts = newVersion.split(".").map(Number);
    const latestParts = latestVersion.split(".").map(Number);
  
    for (let i = 0; i < Math.max(newParts.length, latestParts.length); i++) {
      const newPart = newParts[i] || 0; // Default to 0 if undefined
      const latestPart = latestParts[i] || 0;
  
      if (newPart > latestPart) {
        return true;
      } else if (newPart < latestPart) {
        return false;
      }
    }
  
    // If all parts are equal
    return false;
  }


const latestVersion = "1.2.3";
const newVersion1 = "1.3.0"; // Should return true (more recent)
const newVersion2 = "2.2.1"; // Should return false (older)
const newVersion3 = "1.2.3"; // Should return false (same)

console.log(isMoreRecentVersion(newVersion1, latestVersion)); // true
console.log(isMoreRecentVersion(newVersion2, latestVersion)); // false
console.log(isMoreRecentVersion(newVersion3, latestVersion)); // false