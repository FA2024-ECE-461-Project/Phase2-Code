import logger from '../logger';
import { getCorrectnessMetric } from '../metrics/correctness';
import * as url from '../url';

// Mock the functions that make API calls
jest.mock('../url', () => ({
    getToken: jest.fn(),
    get_axios_params: jest.fn(),
    getOpenIssues: jest.fn(),
    getClosedIssues: jest.fn(),
    getOpenPRs: jest.fn(),
    getClosedPRs: jest.fn(),
}));

// Mock the logger
jest.mock('../logger', () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));

describe('Test getCorrectnessMetric', () => {
    const mockGitHubUrl = 'https://github.com/nikivakil/461-team';
    const mockToken = 'mocked_token';
    const mockOwner = 'nikivakil';
    const mockRepo = '461-team';
    const mockHeaders = { Authorization: `token ${mockToken}` };

    beforeEach(() => {
        jest.clearAllMocks();

        // Mocking the token and axios parameters
        (url.getToken as jest.Mock).mockReturnValue(mockToken);
        (url.get_axios_params as jest.Mock).mockReturnValue({ owner: mockOwner, repo: mockRepo, headers: mockHeaders });
    });

    it('should handle errors and return 0 on failure', async () => {
        // Mock logger.error
        const loggerErrorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {
            return logger;
        });
    
        // Mock API calls to throw an error
        (url.getOpenIssues as jest.Mock).mockRejectedValue(new Error('Error calculating correctness metric'));
    
        const result = await getCorrectnessMetric(mockGitHubUrl);
    
        expect(result).toEqual({
            score: 0,
            latency: expect.any(Number),
        });
    
        // Check the actual logged error message and metadata
        expect(loggerErrorSpy).toHaveBeenCalledWith(
            'Error calculating correctness metric',
            { error: 'Error calculating correctness metric', url: mockGitHubUrl }
        );
    
        loggerErrorSpy.mockRestore();
    });

    it('should fetch repository statistics and calculate correctness score', async () => {
        // Mock the API calls to return valid data
        (url.getOpenIssues as jest.Mock).mockResolvedValue(10);
        (url.getClosedIssues as jest.Mock).mockResolvedValue(20);
        (url.getOpenPRs as jest.Mock).mockResolvedValue(5);
        (url.getClosedPRs as jest.Mock).mockResolvedValue(15);

        const startTime = Date.now();

        const result = await getCorrectnessMetric(mockGitHubUrl);

        expect(result).toEqual({
            score: expect.any(Number), // This depends on the actual calculation logic
            latency: expect.any(Number)
        });

        // Check if the repository statistics were logged correctly
        expect(logger.debug).toHaveBeenCalledWith('Fetched repository statistics', {
            openIssues: 10,
            closedIssues: 20,
            totalIssues: 30,
            openPRs: 5,
            closedPRs: 15,
            totalPRs: 20
        });

        // Ensure the correctness metric calculation is logged
        expect(logger.info).toHaveBeenCalledWith('Correctness metric calculation complete', {
            url: mockGitHubUrl,
            score: expect.any(Number), // Match the calculated score
            latency: expect.any(Number) // Check that latency was logged
        });

        // Check if the latency was calculated and logged
        const latency = result.latency;
        const expectedLatency = Date.now() - startTime;
        expect(latency).toBeGreaterThanOrEqual(0);
        expect(latency).toBeLessThanOrEqual(expectedLatency);
    });
});
