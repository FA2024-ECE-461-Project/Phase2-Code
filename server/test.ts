// test.ts
// https://github.com/cloudinary/cloudinary_npm
// https://www.npmjs.com/package/wat4hjs
// https://github.com/mrdoob/three.js/
// https://www.npmjs.com/package/socket.io
// https://github.com/prathameshnetake/libvlc
// https://www.npmjs.com/package/react
// https://www.npmjs.com/package/unlicensed

import { getPackageDataFromUrl } from "./packageUtils";

(async () => {
  console.log("--- Testing getPackageDataFromUrl ---\n");

  // Test with a valid GitHub URL
  const githubUrl = "https://github.com/expressjs/express";
  console.log(`Testing with GitHub URL: ${githubUrl}`);
  const result1 = await getPackageDataFromUrl(githubUrl);
  console.log("Result:", result1);
  console.log("--------------------------------------\n");

  // Test with a valid npm package URL
  const npmUrl = "https://www.npmjs.com/package/express";
  console.log(`Testing with npm package URL: ${npmUrl}`);
  const result2 = await getPackageDataFromUrl(npmUrl);
  console.log("Result:", result2);
  console.log("--------------------------------------\n");

  // Test with an invalid GitHub URL
  const invalidGithubUrl =
    "https://github.com/nonexistent-user/nonexistent-repo";
  console.log(`Testing with invalid GitHub URL: ${invalidGithubUrl}`);
  const result3 = await getPackageDataFromUrl(invalidGithubUrl);
  console.log("Result:", result3);
  console.log("--------------------------------------\n");

  // Test with an invalid npm package URL
  const invalidNpmUrl = "https://www.npmjs.com/package/nonexistent-package-xyz";
  console.log(`Testing with invalid npm package URL: ${invalidNpmUrl}`);
  const result4 = await getPackageDataFromUrl(invalidNpmUrl);
  console.log("Result:", result4);
  console.log("--------------------------------------\n");

  // Test with a non-GitHub, non-npm URL
  const otherUrl = "https://example.com";
  console.log(`Testing with other URL: ${otherUrl}`);
  const result5 = await getPackageDataFromUrl(otherUrl);
  console.log("Result:", result5);
  console.log("--------------------------------------\n");

  console.log("--- Testing Completed ---");
})();
