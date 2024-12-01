// import { extractMetadataFromZip } from '../server/packageUtils';
// import fs from 'fs';
// import path from 'path';

// describe('extractMetadataFromZip', () => {
//   test('should extract metadata when package.json is at root', () => {
//     const buffer = fs.readFileSync(path.join(__dirname, 'temp.zip'));
//     const metadata = extractMetadataFromZip(buffer);
//     expect(metadata.Name).toBe('461-phase2-code');
//     expect(metadata.Version).toBe('1.0.0');
//   });

//   test('should extract metadata when package.json is in subdirectory', () => {
//     const buffer = fs.readFileSync(path.join(__dirname, 'test-zips', 'subdir-package.zip'));
//     const metadata = extractMetadataFromZip(buffer);
//     expect(metadata.Name).toBe('test-package');
//     expect(metadata.Version).toBe('1.2.3');
//   });

//   test('should throw error when package.json is missing', () => {
//     const buffer = fs.readFileSync(path.join(__dirname, 'test-zips', 'no-package.zip'));
//     expect(() => extractMetadataFromZip(buffer)).toThrow('package.json not found in the zip file');
//   });

//   test('should throw error when package.json is invalid', () => {
//     const buffer = fs.readFileSync(path.join(__dirname, 'test-zips', 'invalid-package.zip'));
//     expect(() => extractMetadataFromZip(buffer)).toThrow('Invalid package.json format');
//   });
// });
