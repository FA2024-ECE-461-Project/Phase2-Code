// // test.ts
// // https://github.com/cloudinary/cloudinary_npm
// // https://www.npmjs.com/package/wat4hjs
// // https://github.com/mrdoob/three.js/
// // https://www.npmjs.com/package/socket.io
// // https://github.com/prathameshnetake/libvlc
// // https://www.npmjs.com/package/react
// // https://www.npmjs.com/package/unlicensed

// import { getPackageDataFromUrl } from './packageUtils';

// (async () => {
//   console.log('--- Testing getPackageDataFromUrl ---\n');

//   // Test with a valid GitHub URL
//   const githubUrl = 'https://github.com/expressjs/express';
//   console.log(`Testing with GitHub URL: ${githubUrl}`);
//   const result1 = await getPackageDataFromUrl(githubUrl);
//   console.log('Result:', result1);
//   console.log('--------------------------------------\n');

//   // Test with a valid npm package URL
//   const npmUrl = 'https://www.npmjs.com/package/express';
//   console.log(`Testing with npm package URL: ${npmUrl}`);
//   const result2 = await getPackageDataFromUrl(npmUrl);
//   console.log('Result:', result2);
//   console.log('--------------------------------------\n');

//   // Test with an invalid GitHub URL
//   const invalidGithubUrl = 'https://github.com/nonexistent-user/nonexistent-repo';
//   console.log(`Testing with invalid GitHub URL: ${invalidGithubUrl}`);
//   const result3 = await getPackageDataFromUrl(invalidGithubUrl);
//   console.log('Result:', result3);
//   console.log('--------------------------------------\n');

//   // Test with an invalid npm package URL
//   const invalidNpmUrl = 'https://www.npmjs.com/package/nonexistent-package-xyz';
//   console.log(`Testing with invalid npm package URL: ${invalidNpmUrl}`);
//   const result4 = await getPackageDataFromUrl(invalidNpmUrl);
//   console.log('Result:', result4);
//   console.log('--------------------------------------\n');

//   // Test with a non-GitHub, non-npm URL
//   const otherUrl = 'https://example.com';
//   console.log(`Testing with other URL: ${otherUrl}`);
//   const result5 = await getPackageDataFromUrl(otherUrl);
//   console.log('Result:', result5);
//   console.log('--------------------------------------\n');

//   console.log('--- Testing Completed ---');
// })();

import * as fs from 'fs';
import * as unzipper from 'unzipper';
import * as path from 'path';

async function decodeAndExtract(base64FilePath: string, outputDir: string) {
  try {
    // Read the Base64 file
    const base64Content = fs.readFileSync(base64FilePath, 'utf-8');

    // Decode the Base64 content
    const zipBuffer = Buffer.from(base64Content, 'base64');

    // Ensure the output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save the decoded content as a ZIP file for extraction
    const tempZipPath = path.join(outputDir, 'temp.zip');
    fs.writeFileSync(tempZipPath, zipBuffer);

    // Extract the ZIP file
    const fileContents: { fileName: string; content: string }[] = [];
    await fs
      .createReadStream(tempZipPath)
      .pipe(unzipper.Parse())
      .on('entry', async (entry) => {
        const fileName = entry.path;
        if (entry.type === 'File') {
          const chunks: Buffer[] = [];
          for await (const chunk of entry) {
            chunks.push(chunk);
          }
          const content = Buffer.concat(chunks).toString('utf-8');
          fileContents.push({ fileName, content });
        } else {
          entry.autodrain(); // Skip directories
        }
      })
      .promise();

    // Return the extracted file names and their content
    return fileContents;
  } catch (error) {
    console.error('Error during extraction:', error);
    throw error;
  }
}

// Usage example
(async () => {
  const base64FilePath = '/Users/jimmyho/Desktop/Fall_2024/ECE46100/Phase_2/Project_Repo/Phase2-Code/mnt/data/underscore_base64.sample'; // Your Base64 file path
  const outputDir = '/Users/jimmyho/Desktop/Fall_2024/ECE46100/Phase_2/Project_Repo/Phase2-Code/mnt/data/extracted_files'; // Output directory for extraction

  try {
    const extractedFiles = await decodeAndExtract(base64FilePath, outputDir);
    console.log('Extracted Files:', extractedFiles);
  } catch (err) {
    console.error('Error:', err);
  }
})();
