# 461-team
**Members:**
- Alex Pienkowski (apienkow@purdue.edu)
- Aryana Lynch (amlynch@purdue.edu)
- Niki Vakil (nvakil@purdue.edu)
- Shaan Chanchani (schancha@purdue.edu)

## Project Overview
This project is a GitHub utility tool designed to analyze repository responsiveness, manage API interactions, and provide insights into open-source projects. It includes the following key functionalities:
1. Responsiveness Metrics: Calculates responsiveness scores based on the average closure and response times for issues and pull requests. It fetches data from GitHub and computes scores to help assess project engagement.
2. GitHub API Integration: Utilizes the GitHub API to retrieve information about repositories, including open and closed pull requests, issues, commits, and contributors. It handles authentication and logs interactions for monitoring.
3. NPM Package Management: Extracts GitHub URLs from NPM packages, retrieves README content, and verifies the existence of associated repositories, aiding in dependency management.
4. Utilities for URL Parsing: Classifies URLs, parses GitHub links to extract owner and repository information, and manages various types of links for efficient handling of requests.
5. Error Handling and Logging: Implements robust error handling for API calls and logs relevant information for troubleshooting, ensuring a smooth user experience.

This tool aims to enhance the process of analyzing GitHub repositories and their responsiveness, making it easier for developers to assess project health and community engagement.


## Files
### src/index.ts
#### Command-Line Program Setup:

Uses the commander package to create CLI commands and arguments.
Main command processes a file containing URLs, analyzing the repositories based on predefined metrics.
Includes an optional test command to run test suites using jest.

#### Metrics Calculation:

Metrics include NetScore, Ramp-Up Time, Correctness, Bus Factor, License Compatibility, and Responsiveness.
For each URL, the tool fetches or calculates these metrics using imported functions like get_bus_factor, getCorrectnessMetric, etc.

#### Repository Cloning:

If the URL is for a GitHub repo, the tool clones it locally to gather data for metrics.
For NPM package URLs, it attempts to extract the corresponding GitHub repository.

#### Output:

Outputs the metrics as a JSON object with calculated scores and latencies for each URL in the file.
Handles errors gracefully by returning an empty result for failed URLs.

### src/url.ts
#### Environment Setup:

Uses dotenv to load environment variables, including the GitHub API token.

#### GitHub API Functions:

Fetches repository data, including the number of open/closed pull requests, issues, and commits.
Retrieves and decodes the README file content from a repository.
Calculates average closure time and response time for pull requests and issues.
Retrieves commit history and contributors.

#### NPM Package Functions:

Fetches GitHub URLs from NPM package data by querying the NPM registry.

#### Utility Functions:

classifyURL: Classifies URLs as GitHub, NPM, or other.

getToken: Retrieves the GitHub API token from environment variables.

Provides helper functions for constructing Axios request headers and extracting information from URLs.

#### Logging:

Uses a logger for detailed logging of each action, including errors, warnings, and debugging information.

### src/logger.ts
#### Environment Setup:

Loads environment variables from a .env file using dotenv.
Retrieves log level (LOG_LEVEL) and log file path (LOG_FILE) from environment variables, with default values if they're not set.

#### Log Directory Creation:

Ensures that the directory for logs exists. If not, it creates the directory using Node's fs module.

#### Logger Configuration:

Creates a logger using winston, configured with:
- A log level (e.g., info, error) determined by the environment variable.
- Formats for log output: timestamps, error stack traces, and JSON formatting.

Two transport mechanisms:
- Logs of level info and below are written to the main log file (package-evaluator.log).
- Logs of level error are written to a separate error.log file.

#### Export:

The logger is exported for use in other parts of the application.

### src/metrics/bus-factor.ts
#### Calculate Bus Factor:

Commits and Contributors: The calculateBusFactor function processes the commit history and contributor data of a repository.
It counts the number of commits per contributor, sorts contributors by their commit counts, and calculates the bus factor by determining how many contributors are responsible for 80% of the total commits.
A normalized score is computed, adjusting for the number of contributors and commits.

#### Normalization:

The normalizeScore function adjusts the raw bus factor based on contributor ratios, penalizing repositories with few contributors or low commit counts to produce a final score between 0 and 1.

#### Main Function:

The get_bus_factor function orchestrates the process:
Fetches the repository's commit and contributor data using GitHub's API.
Invokes calculateBusFactor to determine the bus factor and normalized score.
Measures the latency (time taken for the calculation) and returns the result.

#### Error Handling:

Logs errors if the repository data can't be fetched or if calculations fail, and returns default values in such cases.

### src/metrics/correctness.ts
#### Main Function (getCorrectnessMetric):

Fetches GitHub data for open/closed issues and PRs using the GitHub API.
These requests are made concurrently for efficiency.
It calculates a correctness score based on how many issues are closed vs. total issues, and how many PRs are merged vs. total PRs.
Logs relevant data and handles errors, returning a score of 0 in case of failure.
Returns the correctness score and the time taken (latency) for the operation.

#### Correctness Score Calculation (calculateCorrectnessScore):

Computes two rates: issue resolution rate and PR merge rate.
Weights the two rates (60% issues, 40% PRs) and applies a logarithmic scaling to favor repositories with higher activity.
Clamps the score between 0 and 1 to ensure it falls within that range.

### src/metrics/license-compatibility.ts
#### Main Function (get_license_compatibility):

Takes a repository path, retrieves its license information (from a LICENSE file or README.md), and checks its compatibility with supported licenses.
If a compatible license is found, it returns a score of 1 (compatible); otherwise, 0 (incompatible).
It logs the start and end times of the process, as well as any errors.

#### License Retrieval (getLicense):

Searches for a LICENSE file in the repository. If not found, it looks for license information in the README.md file.
Extracts license information using regular expressions to locate relevant sections in the README.

#### License Compatibility Check (checkLicenseCompatibility):

Matches the extracted license text against a predefined list of compatible licenses (e.g., MIT, Apache-2.0, GPL, BSD).
Uses regular expressions to perform flexible, case-insensitive matches on the license text.

#### Compatible Licenses:

A list of licenses is defined with patterns (e.g., MIT, Apache-2.0, GPL). Some licenses have multiple patterns to accommodate different variations of the license text.

### src/metrics/ramp-up-time.ts
#### Main Function (get_ramp_up_time_metric):

Takes a GitHub repository URL and retrieves the content of the repository's README.md file.
Calculates a "ramp-up" score based on how easy it would be for a new user or developer to understand and use the repository, based on the README content.
Logs the start and end of the process, as well as any errors, and returns the score along with the latency (processing time).

#### README Content Analysis (calculateRampUpScore):

The score is calculated based on several factors:
- Markdown headers: More headers indicate a well-structured README. (Capped at 0.3).
- Code blocks: Shows examples of usage or implementation. (Capped at 0.2).
- Installation instructions: Adds 0.15 if found.
- Usage examples: Adds 0.15 if present.
- External documentation links: More links add to the score (Capped at 0.2).
- The total score is normalized between 0 and 1.

#### Logging:

The file logs key actions, such as retrieving the README, calculating scores, and handling errors.

### src/metrics/responsiveness.ts
#### Main Function (calculateResponsiveness):

Takes a GitHub repository URL and retrieves average issue closure time and pull request response time using GitHub API.
Calculates a responsiveness score based on how quickly the repository responds to and resolves issues or pull requests.
Logs the start and end of the calculation, returns the score, and measures the latency (processing time).

#### Supporting Functions:
- getTimeDifferenceInHours: Calculates the time difference between two dates in hours.
- normalizeTime: Normalizes the time values into a 0-1 range, where shorter times get a higher score.
- calculateResponsivenessScore: Weighs response time (60%) and closure time (40%) to compute an overall responsiveness score.

#### Constants:

Defines maximum closure time as 5 days and maximum response time as 36 hours, used for normalizing times.

#### Error Handling and Logging:

Logs any errors and returns a score of 0 if no issues or PRs are found or if an error occurs.

### src/tests/bus-factor-test.ts
#### Imports:

It mocks axios, getToken, get_axios_params, getCommitsAndContributors, and logger to isolate the test environment and simulate data and responses.
The get_bus_factor function from the metrics/bus-factor module is the main target of the tests.

#### Test Suite:

The Bus Factor Tests suite includes three test cases that cover different scenarios for calculating the bus factor of a GitHub repository.

#### Test Cases:

- Test 1: Valid Data:
Simulates a repository with commits and contributors. The mocked data returns two authors.
The test verifies that the get_bus_factor function returns the correct busFactor, a normalized score, and the latency.
Ensures that appropriate logging functions are called and no errors are encountered.

- Test 2: No Commits or Contributors:
Simulates a repository with no commits or contributors.
Expects a default bus factor of 1, a normalized score of 0, and logs a warning about the absence of data.

- Test 3: Error Handling:
Simulates an error (e.g., network failure) during the data fetching process.
Expects the function to return default values (busFactor: 1, normalizedScore: 0) and logs an error.

### src/tests/correctness-test.ts
#### Imports:

Mocks several functions from the url module that make API calls, such as getToken, get_axios_params, getOpenIssues, getClosedIssues, getOpenPRs, and getClosedPRs.
Mocks the logger functions like info, debug, warn, and error to track logs during the test process.

#### Test Suite:

The Test getCorrectnessMetric suite focuses on verifying the behavior of the correctness metric calculation for a GitHub repository.

#### Test Cases:

- Error Handling:
Simulates a failure where API calls fail (e.g., due to network issues). It ensures that:
The function returns a score of 0 and logs an error message.
The logger.error function is properly called with details about the failure.

- Correctness Metric Calculation:
Mocks the API calls to return valid data for open and closed issues and pull requests.
Verifies that the function correctly computes the correctness score, logs the repository statistics, and tracks the latency for the calculation.
The test ensures that both the score and latency are valid, and logging functions (logger.debug, logger.info) are called with the appropriate metadata.

### src/tests/license-compatibility-test.ts
#### Functions Tested:
1. checkLicenseCompatibility:

This function checks if a given license text matches a valid open-source license.
A set of test cases with various license texts (both valid and invalid) is provided, and the function is tested to ensure it correctly identifies valid licenses.

2. getLicense:

This function retrieves the license content from a repository's directory.

It tests:
- If the license file (LICENSE) exists, it returns its content.
- If there's no LICENSE file, the license is extracted from the README.md file.
- If neither contains license information, it returns null.
  
3. get_license_compatibility:

This function checks the license compatibility of a repository and returns a compatibility score.

#### Tests ensure:
- A valid license (like MIT) gives a score of 1.
- An incompatible or missing license results in a score of 0.

#### Mocking:
The file mocks modules like fs (for reading files) and path (for file path manipulations).
It mocks API calls and logger functions to simulate different repository structures and license content without relying on actual file system operations.

### src/tests/responsiveness-test.ts
#### Functions Tested:

1. getTimeDifferenceInHours:

Calculates the time difference in hours between two timestamps.

Tests check for:
- Correct time difference (e.g., for 36 hours, 4.5 hours).
- Cases where times are identical (result should be 0).

2. calculateResponsivenessScore:

Computes a responsiveness score based on average closure and response times.

Tests ensure:
- Proper score for average times.
- Maximum score for fast response and closure times.
- Minimum score for slow times.

3. calculateResponsiveness:

Integrates API calls to fetch average closure and response times for a GitHub repo.

#### Tests check:
- Correct score and latency when issues/PRs exist.
- Proper handling when there are no issues/PRs (score 0, warning logged).
- Handling of API call failures (score 0, error logged).

#### Mocking:

The file mocks external dependencies like logger and API calls (url) to simulate GitHub responses without making actual HTTP requests.

### src/tests/url-test.ts
#### Mocks:

Mocks environment variables, axios (to avoid real API calls), and a custom logger.
Mocking ensures the tests are isolated and don't rely on real API interactions or actual environment settings.

#### Tests:
- Environment Token Handling: Tests the getToken function to ensure it retrieves the GitHub token from environment variables or logs an error if it's not found.
- URL Classification and Parsing: Verifies that URLs are classified correctly (GitHub, NPM, or other) and that GitHub URLs are parsed into owner and repository parts.
- API Calls: Tests functions like getOpenPRs, getClosedPRs, getIssues, and others to ensure they correctly call the GitHub API and handle responses or errors.
- NPM Package Utilities: Tests functions that extract package names from NPM URLs and retrieve GitHub URLs from NPM package metadata.
- README Content Retrieval: Verifies that README content is fetched and decoded from the GitHub API.
- Commits, Contributors, and Closure Times: Ensures functions properly fetch commit history, contributor data, and calculate average issue closure time.

## License
MIT
