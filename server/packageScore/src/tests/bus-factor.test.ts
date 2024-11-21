import axios from 'axios';
import { getToken, get_axios_params, getCommitsAndContributors } from '../url';
import logger from '../logger';
import { get_bus_factor } from '../metrics/bus-factor';

jest.mock('axios');
jest.mock('../url');
jest.mock('../logger');

describe('Bus Factor Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks(); // Clear all mocks before each test
    });

    test('should calculate bus factor with valid data', async () => {
        const mockCommits = [
            { commit: { author: { name: 'Author1' } } },
            { commit: { author: { name: 'Author2' } } },
            { commit: { author: { name: 'Author1' } } }
        ];
        const mockContributors = [{ login: 'Author1' }, { login: 'Author2' }];
    
        (axios.get as jest.Mock).mockResolvedValue({ data: mockCommits });
        (getToken as jest.Mock).mockReturnValue('mock-token');
        (get_axios_params as jest.Mock).mockReturnValue({
            owner: 'owner',
            repo: 'repo',
            headers: { Authorization: 'token mock-token' }
        });
        (getCommitsAndContributors as jest.Mock).mockResolvedValue({
            commits: mockCommits,
            contributors: mockContributors
        });
    
        const result = await get_bus_factor('https://github.com/owner/repo');
    
        expect(result).toEqual({
            busFactor: 2, // Adjusted based on actual calculation
            normalizedScore: expect.any(Number),
            latency: expect.any(Number)
        });
        expect(logger.info).toHaveBeenCalledWith('Starting bus factor calculation', { url: 'https://github.com/owner/repo' });
        expect(logger.debug).toHaveBeenCalled();
        expect(logger.error).not.toHaveBeenCalled();
    });
    

    test('should return default values if no commits or contributors', async () => {
        (axios.get as jest.Mock).mockResolvedValue({ data: [] });
        (getToken as jest.Mock).mockReturnValue('mock-token');
        (get_axios_params as jest.Mock).mockReturnValue({
            owner: 'owner',
            repo: 'repo',
            headers: { Authorization: 'token mock-token' }
        });
        (getCommitsAndContributors as jest.Mock).mockResolvedValue({
            commits: [],
            contributors: []
        });

        const result = await get_bus_factor('https://github.com/owner/repo');

        expect(result).toEqual({
            busFactor: 1,
            normalizedScore: 0,
            latency: expect.any(Number)
        });
        expect(logger.warn).toHaveBeenCalledWith('Repository has no commits or contributors', { totalCommits: 0, totalContributors: 0 });
    });

    test('should handle errors and return default values', async () => {
        (getToken as jest.Mock).mockReturnValue('mock-token');
        (get_axios_params as jest.Mock).mockReturnValue({
            owner: 'owner',
            repo: 'repo',
            headers: { Authorization: 'token mock-token' }
        });
        (getCommitsAndContributors as jest.Mock).mockRejectedValue(new Error('Network Error'));

        const result = await get_bus_factor('https://github.com/owner/repo');

        expect(result).toEqual({
            busFactor: 1,
            normalizedScore: 0,
            latency: expect.any(Number)
        });
        expect(logger.error).toHaveBeenCalledWith('Error calculating bus factor', { url: 'https://github.com/owner/repo', error: 'Network Error' });
    });
});
