import { getToken, parseGitHubUrl, getOpenPRs, getClosedPRs, classifyURL, UrlType, test_API, extractNpmPackageName, getNpmPackageGitHubUrl, getReadmeContent, get_avg_ClosureTime, getCommitsAndContributors, getIssues, get_axios_params } from '../url';
import axios from 'axios';
import logger from '../logger';
import * as url from '../url';
// import * as responsive from '../metrics/responsiveness'; 

// Mocking dotenv.config to prevent loading actual environment variables
jest.mock('dotenv', () => ({
    config: jest.fn(),
}));

// Mocking axios to prevent real API calls
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mocking logger to capture logs
jest.mock('../logger');
const mockedLogger = logger as jest.Mocked<typeof logger>;


describe('Test GitHub utility functions', () => {
    beforeEach(() => {
        jest.clearAllMocks();  // Clears any previous mock data between tests
    });

    // Test for getToken
    it('should return the GitHub token from environment variables', () => {
        process.env.GITHUB_TOKEN = 'test-token';

        const token = getToken();
        expect(token).toBe('test-token');
    });

    it('should log an error if the token is not set', () => {
        mockedLogger.error = jest.fn();

        delete process.env.GITHUB_TOKEN;  // Removing the token
        const token = getToken();

        expect(token).toBeUndefined();
        expect(mockedLogger.error).toHaveBeenCalledWith('GITHUB_TOKEN is not set in .env file');
    });

    // Test for classifyURL
    it('should classify GitHub URLs correctly', () => {
        const githubUrl = 'https://github.com/user/repo';
        const npmUrl = 'https://www.npmjs.com/package/some-package';
        const otherUrl = 'https://example.com';

        expect(classifyURL(githubUrl)).toBe(UrlType.GitHub);
        expect(classifyURL(npmUrl)).toBe(UrlType.NPM);
        expect(classifyURL(otherUrl)).toBe(UrlType.Other);
    });

    // Test for parseGitHubUrl
    it('should correctly parse GitHub URLs', () => {
        const url = 'https://github.com/user/repo';
        const { owner, repo } = parseGitHubUrl(url);

        expect(owner).toBe('user');
        expect(repo).toBe('repo');
    });

    it('should return empty strings if the URL is invalid', () => {
        const url = 'https://invalid-url.com';
        const { owner, repo } = parseGitHubUrl(url);

        expect(owner).toBe('');
        expect(repo).toBe('');
    });
});

// Tests for API functions with mocked axios
describe('Test API functions', () => {
    beforeEach(() => {
        jest.clearAllMocks();  // Clear any previous mock data between tests
        process.env.GITHUB_TOKEN = 'test-token';  // Ensure the token is set
    });

    it('should fetch open PRs count', async () => {
        mockedAxios.get.mockResolvedValue({ data: [1, 2, 3] });

        const headers = { Authorization: 'token test-token' };
        const openPRs = await getOpenPRs('owner', 'repo', headers);

        expect(mockedAxios.get).toHaveBeenCalledWith('https://api.github.com/repos/owner/repo/pulls?state=open', { headers });
        expect(openPRs).toBe(3);  // Mocked response has 3 open PRs
    });

    it('should fetch closed PRs count', async () => {
        mockedAxios.get.mockResolvedValue({ data: [1, 2] });

        const headers = { Authorization: 'token test-token' };
        const closedPRs = await getClosedPRs('owner', 'repo', headers);

        expect(mockedAxios.get).toHaveBeenCalledWith('https://api.github.com/repos/owner/repo/pulls?state=closed', { headers });
        expect(closedPRs).toBe(2);  // Mocked response has 2 closed PRs
    });

    // Test for the test_API function
    it('should log the number of pull requests on successful API call', async () => {
        mockedAxios.get.mockResolvedValue({ data: [1, 2, 3] });

        await test_API();

        expect(mockedAxios.get).toHaveBeenCalledWith(
            'https://api.github.com/repos/nikivakil/461-team/pulls?state=all',
            { headers: { Authorization: `token test-token` } }  // Using the test token
        );

        expect(mockedLogger.info).toHaveBeenCalledWith(
            'Number of pull requests: 3',
            { owner: 'nikivakil', repo: '461-team' }
        );
        expect(mockedLogger.error).not.toHaveBeenCalled();
    });

    it('should log an error if the API call fails', async () => {
        const mockError = new Error('API error');
        mockedAxios.get.mockRejectedValue(mockError);

        await test_API();

        expect(mockedLogger.error).toHaveBeenCalledWith(
            'Error fetching pull requests',
            { error: 'API error', owner: 'nikivakil', repo: '461-team' }
        );
        expect(mockedLogger.info).not.toHaveBeenCalled();
    });


describe('extractNpmPackageName', () => {
    beforeEach(() => {
        jest.clearAllMocks();  // Clears any previous mock data between tests
    });

    it('should extract the package name from a valid NPM URL', () => {
        const url = 'https://www.npmjs.com/package/some-package';
        const packageName = extractNpmPackageName(url);

        expect(packageName).toBe('some-package');
        expect(mockedLogger.debug).toHaveBeenCalledWith('Extracting NPM package name', { url });
    });

    it('should return null for a URL that does not contain a package name', () => {
        const url = 'https://www.npmjs.com';
        const packageName = extractNpmPackageName(url);

        expect(packageName).toBeNull();
        expect(mockedLogger.debug).toHaveBeenCalledWith('Extracting NPM package name', { url });
    });

    it('should return null for a completely unrelated URL', () => {
        const url = 'https://example.com';
        const packageName = extractNpmPackageName(url);

        expect(packageName).toBeNull();
        expect(mockedLogger.debug).toHaveBeenCalledWith('Extracting NPM package name', { url });
    });
});

describe('getNpmPackageGitHubUrl', () => {
    beforeEach(() => {
        jest.clearAllMocks();  // Clears any previous mock data between tests
    });

    it('should return the cleaned GitHub URL if it exists', async () => {
        const packageName = 'some-package';
        const mockResponse = {
            data: {
                repository: {
                    url: 'git+https://github.com/user/repo.git'
                }
            }
        };
        mockedAxios.get.mockResolvedValue(mockResponse);

        const gitHubUrl = await getNpmPackageGitHubUrl(packageName);

        expect(gitHubUrl).toBe('https://github.com/user/repo');
        expect(mockedAxios.get).toHaveBeenCalledWith(`https://registry.npmjs.org/${packageName}`);
        expect(mockedLogger.debug).toHaveBeenCalledWith('Fetching GitHub URL for NPM package', { packageName });
        expect(mockedLogger.debug).toHaveBeenCalledWith('GitHub URL fetched for NPM package', { packageName, cleanUrl: 'https://github.com/user/repo' });
    });

    it('should return null if no GitHub URL is found', async () => {
        const packageName = 'some-package-without-repo';
        const mockResponse = {
            data: {
                repository: null
            }
        };
        mockedAxios.get.mockResolvedValue(mockResponse);

        const gitHubUrl = await getNpmPackageGitHubUrl(packageName);

        expect(gitHubUrl).toBeNull();
        expect(mockedAxios.get).toHaveBeenCalledWith(`https://registry.npmjs.org/${packageName}`);
        expect(mockedLogger.warn).toHaveBeenCalledWith('No GitHub URL found for NPM package', { packageName });
    });

    it('should log an error and return null if the API call fails', async () => {
        const packageName = 'nonexistent-package';
        const mockError = new Error('API error');
        mockedAxios.get.mockRejectedValue(mockError);

        const gitHubUrl = await getNpmPackageGitHubUrl(packageName);

        expect(gitHubUrl).toBeNull();
        expect(mockedAxios.get).toHaveBeenCalledWith(`https://registry.npmjs.org/${packageName}`);
        expect(mockedLogger.error).toHaveBeenCalledWith('Error fetching NPM package info', { packageName, error: 'API error' });
    });
});

// Use this to explicitly mock getToken:
const mockedGetToken = jest.fn();
jest.mock('../url', () => ({
  ...jest.requireActual('../url'),  // Preserves other exports from the module
  getToken: mockedGetToken,  // Mock getToken explicitly
}));

describe('getReadmeContent', () => {
    beforeEach(() => {
        jest.clearAllMocks();  // Clears any previous mock data between tests
    });

    it('should fetch and decode the README content successfully', async () => {
        const owner = 'test-owner';
        const repo = 'test-repo';
        const token = 'test-token';
        mockedGetToken.mockReturnValue(token);

        // Mock repository contents including a README file
        const mockRepoContents = [
            { name: 'README.md', url: 'https://api.github.com/repos/test-owner/test-repo/contents/readme' }
        ];
        mockedAxios.get.mockResolvedValueOnce({ data: mockRepoContents });

        // Mock README file content
        const mockReadmeContent = { content: Buffer.from('README content', 'utf-8').toString('base64') };
        mockedAxios.get.mockResolvedValueOnce({ data: mockReadmeContent });

        const readmeContent = await getReadmeContent(owner, repo);

        expect(readmeContent).toBe('README content');
        expect(mockedAxios.get).toHaveBeenCalledWith(`https://api.github.com/repos/${owner}/${repo}/contents`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        expect(mockedLogger.info).toHaveBeenCalledWith('Fetching README content', { owner, repo });
        expect(mockedLogger.debug).toHaveBeenCalledWith('README content fetched successfully', { owner, repo, contentLength: 'README content'.length });
    });

    it('should throw an error if no README file is found', async () => {
        const owner = 'test-owner';
        const repo = 'test-repo';
        const token = 'test-token';
        mockedGetToken.mockReturnValue(token);

        // Mock repository contents with no README file
        const mockRepoContents = [{ name: 'index.js', url: 'https://api.github.com/repos/test-owner/test-repo/contents/index.js' }];
        mockedAxios.get.mockResolvedValueOnce({ data: mockRepoContents });

        await expect(getReadmeContent(owner, repo)).rejects.toThrow('README file not found');
        expect(mockedAxios.get).toHaveBeenCalledWith(`https://api.github.com/repos/${owner}/${repo}/contents`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        expect(mockedLogger.warn).toHaveBeenCalledWith('README file not found', { owner, repo });
    });    
});

describe('get_avg_ClosureTime', () => {
    const owner = 'owner';
    const repo = 'repo';
    const headers = { Authorization: 'token test-token' };

    it('should calculate average closure time correctly when closed issues exist', async () => {
        const mockResponse = {
            data: [
                { created_at: '2024-01-01T00:00:00Z', closed_at: '2024-01-02T00:00:00Z', state: 'closed' },
                { created_at: '2024-01-02T00:00:00Z', closed_at: '2024-01-03T00:00:00Z', state: 'closed' },
            ],
        };
        
        (axios.get as jest.Mock).mockResolvedValue(mockResponse);

        const avgClosureTime = await get_avg_ClosureTime(owner, repo, headers);
        
        expect(avgClosureTime).toBe(24); // Average closure time in hours
        expect(logger.debug).toHaveBeenCalledWith('Average closure time calculated', { owner, repo, avgClosureTime });
    });

    it('should return 0 if no closed issues are found', async () => {
        const mockResponse = {
            data: [],
        };

        (axios.get as jest.Mock).mockResolvedValue(mockResponse);

        const avgClosureTime = await get_avg_ClosureTime(owner, repo, headers);
        
        expect(avgClosureTime).toBe(0);
        expect(logger.warn).toHaveBeenCalledWith('No closed issues found', { owner, repo });
    });

    it('should handle errors from the API request', async () => {
        const errorMessage = 'Network error';
        (axios.get as jest.Mock).mockRejectedValue(new Error(errorMessage));

        await get_avg_ClosureTime(owner, repo, headers);

        expect(logger.error).toHaveBeenCalledWith('Error calculating average closure time', { owner, repo, error: errorMessage });
    });
});


describe('getCommitsAndContributors', () => {
    const owner = 'owner';
    const repo = 'repo';
    const headers = { Authorization: 'token test-token' };

    it('should fetch commits and contributors successfully', async () => {
        const mockCommitsResponse = {
            data: [{ sha: 'abc123' }, { sha: 'def456' }],
        };
        const mockContributorsResponse = {
            data: [{ login: 'contributor1' }, { login: 'contributor2' }],
        };

        (axios.get as jest.Mock).mockResolvedValueOnce(mockCommitsResponse)
                                 .mockResolvedValueOnce(mockContributorsResponse);

        const result = await getCommitsAndContributors(owner, repo, headers);
        
        expect(result).toEqual({
            commits: mockCommitsResponse.data,
            contributors: mockContributorsResponse.data,
        });
        expect(logger.debug).toHaveBeenCalledWith('Commits and contributors fetched', {
            owner,
            repo,
            commitCount: mockCommitsResponse.data.length,
            contributorCount: mockContributorsResponse.data.length,
        });
    });

    it('should handle errors and return empty arrays', async () => {
        const mockError = new Error('Network Error');
        
        (axios.get as jest.Mock).mockRejectedValueOnce(mockError)
                                 .mockRejectedValueOnce(mockError);

        const result = await getCommitsAndContributors(owner, repo, headers);
        
        expect(result).toEqual({
            commits: [],
            contributors: [],
        });
        expect(logger.error).toHaveBeenCalledWith('Error fetching commits and contributors', {
            owner,
            repo,
            error: mockError.message,
        });
    });
});


describe('Test getIssues function', () => {
    const mockOwner = 'testOwner';
    const mockRepo = 'testRepo';
    const mockToken = 'test-token';
    const mockHeaders = { 
        Authorization: `token ${mockToken}`,
        Accept: 'application/vnd.github.v3+json',  
    };
    const mockIssues = [
        { id: 1, state: 'open', title: 'Issue 1' },
        { id: 2, state: 'closed', title: 'Issue 2' },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should fetch issues successfully', async () => {
        // Mock getToken and get_axios_params for this specific test
        jest.spyOn(url, 'getToken').mockReturnValue(mockToken);
        jest.spyOn(url, 'get_axios_params').mockReturnValue({
            owner: mockOwner,
            repo: mockRepo,
            headers: mockHeaders
        });
        

        // Mock axios response
        (axios.get as jest.Mock).mockResolvedValue({ data: mockIssues });

        const result = await url.getIssues(mockOwner, mockRepo);

        // Check that the API call was made with the correct URL and headers
        expect(axios.get).toHaveBeenCalledWith(
            `https://api.github.com/repos/${mockOwner}/${mockRepo}/issues?state=all`,
            { headers: mockHeaders }
        );

        // Check that the returned result matches the mock issues
        expect(result).toEqual(mockIssues);

        // Check that the debug logger was called correctly
        expect(logger.debug).toHaveBeenCalledWith('Fetching all issues', { owner: mockOwner, repo: mockRepo });
        expect(logger.debug).toHaveBeenCalledWith('Issues fetched', { owner: mockOwner, repo: mockRepo, issueCount: mockIssues.length });
    });

    it('should log an error and throw when API call fails', async () => {
        // Mock getToken and get_axios_params for this specific test
        jest.spyOn(url, 'getToken').mockReturnValue(mockToken);
        jest.spyOn(url, 'get_axios_params').mockReturnValue({
            owner: mockOwner,
            repo: mockRepo,
            headers: mockHeaders
        });

        const mockError = new Error('API error');

        // Mock axios to reject with an error
        (axios.get as jest.Mock).mockRejectedValue(mockError);

        // Expect the function to throw an error
        await expect(url.getIssues(mockOwner, mockRepo)).rejects.toThrow('API error');

        // Check that the error logger was called with the correct arguments
        expect(logger.error).toHaveBeenCalledWith(
            'Error fetching issues',
            { owner: mockOwner, repo: mockRepo, error: mockError.message }
        );
    });
});
});