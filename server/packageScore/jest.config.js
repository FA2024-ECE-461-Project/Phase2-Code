/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  preset: 'ts-jest',  // Use ts-jest to handle TypeScript files
  testEnvironment: 'node',  // Environment for running the tests
  moduleFileExtensions: ['ts', 'tsx', 'js'],  // Handle TS, TSX, and JS files
  testMatch: ['**/?(*.)+(spec|test).ts?(x)'],  // Look for test files with .ts or .tsx extension
  transform: {
    '^.+\\.tsx?$': 'ts-jest',  // Transform TypeScript files using ts-jest
  },
  verbose: true,  // Print individual test results with the test suite hierarchy
  collectCoverage: true,  // Enable coverage collection
  coverageDirectory: 'coverage',  // Directory to output coverage files
  coverageReporters: ['json-summary', 'text', 'lcov'],  // Include 'json-summary' for coverage-summary.json
};