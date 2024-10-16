import { get_license_compatibility, checkLicenseCompatibility, getLicense} from "../metrics/license-compatibility";
import * as fs from "fs";
import * as path from "path";


jest.mock("../logger");
jest.mock("fs");
jest.mock('path');

describe('License Compatibility Tests', () => {
    const testCases = [
    // Valid licenses
      { licenseText: 'MIT License', expected: true },
      { licenseText: 'Apache License 2.0', expected: true },
      { licenseText: 'APache 2.0', expected: true },
      { licenseText: 'GNU General Public License v3.0', expected: true },
      { licenseText: 'BSD 3-Clause License', expected: true },
      { licenseText: 'GNU Lesser General Public License v2.1', expected: true },
      { licenseText: 'This software is released under the MIT License.', expected: true },
      { licenseText: 'Licensed under Apache 2.0', expected: true },
      { licenseText: 'This project uses the GNU GPL v3', expected: true },
      { licenseText: 'Distributed under the terms of the BSD 3-Clause License', expected: true },
      { licenseText: 'LGPL 2.1 applies to this software', expected: true },
      // Invalid licenses
      { licenseText: 'spicy mcchicken v2', expected: false },
      { licenseText: 'Np license', expected: false },
      { licenseText: 'No license specified', expected: false },
      { licenseText: '', expected: false },
      { licenseText: 'This is not a valid open-source license', expected: false },
    ];
  
    test('should determine if a license is valid or invalid', () => {
        testCases.forEach(({ licenseText, expected }) => {
          const result = checkLicenseCompatibility(licenseText);
          expect(result).toBe(expected);
        });
      });
    });
  describe('getLicense', () => {
    const repoPath = 'mock-repo-path';
  
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    it('should return license content from License file', async () => {
      const licenseContent = 'MIT License';
      (fs.readdirSync as jest.Mock).mockReturnValue(['LICENSE']);
      (fs.readFileSync as jest.Mock).mockReturnValue(licenseContent);
  
      const result = await getLicense(repoPath);
      expect(result).toEqual(licenseContent);
      expect(fs.readdirSync).toHaveBeenCalledWith(repoPath);
      expect(fs.readFileSync).toHaveBeenCalledWith(path.join(repoPath, 'LICENSE'), 'utf-8');
    });
    it('should extract license information from README.md when no LICENSE file exists', async () => {
        const readmeContent = `# Project
    
    sample stuff
    
    ## Usage
    
    hello there
    
    ## License
    
     the MIT License ladi ladi da`;
    
        (fs.readdirSync as jest.Mock).mockReturnValue(['README.md']);
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readFileSync as jest.Mock).mockReturnValue(readmeContent);
    
        const result = await getLicense(repoPath);
        expect(result).toEqual('the MIT License ladi ladi da');
        expect(fs.readdirSync).toHaveBeenCalledWith(repoPath);
        expect(fs.existsSync).toHaveBeenCalledWith(path.join(repoPath, 'README.md'));
        expect(fs.readFileSync).toHaveBeenCalledWith(path.join(repoPath, 'README.md'), 'utf-8');
      });
    it('should return null if license is not found', async () => {
        const readmeContent = '# Project\n\nThis is a sample project.\n\n## Usage\n\nUse it wisely.';
        (fs.readdirSync as jest.Mock).mockReturnValue(['README.md']);
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readFileSync as jest.Mock).mockReturnValue(readmeContent);
    
        const result = await getLicense(repoPath);
        expect(result).toBeNull();
        expect(fs.readdirSync).toHaveBeenCalledWith(repoPath);
        expect(fs.existsSync).toHaveBeenCalledWith(path.join(repoPath, 'README.md'));
        expect(fs.readFileSync).toHaveBeenCalledWith(path.join(repoPath, 'README.md'), 'utf-8');
      });
  
  });

  describe('get_license_compatibility', () => {
    const mockRepoPath = '/mock/repo/path';
  
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    it('should return score 1 for valid license', async () => {
      (fs.readdirSync as jest.Mock).mockReturnValue(['LICENSE']);
      (fs.readFileSync as jest.Mock).mockReturnValue('MIT License');
      (path.join as jest.Mock).mockReturnValue('/mock/repo/path/LICENSE');
  
      const result = await get_license_compatibility(mockRepoPath);
  
      expect(result.score).toBe(1);
      expect(fs.readdirSync).toHaveBeenCalledWith(mockRepoPath);
      expect(fs.readFileSync).toHaveBeenCalledWith('/mock/repo/path/LICENSE', 'utf-8');
    });

    it('should return score 0 for incompatible license', async () => {
      (fs.readdirSync as jest.Mock).mockReturnValue(['LICENSE']);
      (fs.readFileSync as jest.Mock).mockReturnValue('Random License');
      (path.join as jest.Mock).mockReturnValue('/mock/repo/path/LICENSE');
  
      const result = await get_license_compatibility(mockRepoPath);
  
      expect(result.score).toBe(0);
    });
  
    it('should return score 0 when no license is found', async () => {
      (fs.readdirSync as jest.Mock).mockReturnValue([]);
      (fs.existsSync as jest.Mock).mockReturnValue(false);
  
      const result = await get_license_compatibility(mockRepoPath);
  
      expect(result.score).toBe(0);
    });
  });