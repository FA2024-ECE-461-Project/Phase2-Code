import logger from '../logger';
import * as url from '../url';
import { calculateResponsiveness, getTimeDifferenceInHours, calculateResponsivenessScore } from '../metrics/responsiveness';


//mocking the logger and url module
jest.mock('../logger');
jest.mock('../url');

describe('Responsiveness Tests', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
   
  describe('getTimeDifferenceInHours', () => {
    test('calculates correct time difference for positive case', () => {
      const start = '2023-01-01T00:00:00Z';
      const end = '2023-01-02T12:00:00Z';
      expect(getTimeDifferenceInHours(start, end)).toBe(36);
    });

    test('calculates correct time difference for same day', () => {
      const start = '2023-01-01T10:00:00Z';
      const end = '2023-01-01T14:30:00Z';
      expect(getTimeDifferenceInHours(start, end)).toBe(4.5);
    });

    test('returns 0 for same time', () => {
      const time = '2023-01-01T10:00:00Z';
      expect(getTimeDifferenceInHours(time, time)).toBe(0);
    });

  });
  describe('calculateResponsivenessScore', () => {
    test('calculates correct score for average times', () => {
      const score = calculateResponsivenessScore(72, 24); // 3 days closure, 1 day response
      expect(score).toBeCloseTo(0.36, 2); 
    });

    test('returns maximum score for very fast times', () => {
      const score = calculateResponsivenessScore(1, 0.1); // 1 hour closure, 6 minutes response
      expect(score).toBeCloseTo(1, 1);
    });

    test('returns minimum score for very slow times', () => {
      const score = calculateResponsivenessScore(240, 72); // 10 days closure, 3 days response
      expect(score).toBeCloseTo(0, 1);
    });

  });
  
    test('calculateResponsiveness returns correct score and latency', async () => {
      // Mock the required functions
      (url.getToken as jest.Mock).mockReturnValue('mock-token');
      (url.get_axios_params as jest.Mock).mockReturnValue({
        owner: 'mock-owner',
        repo: 'mock-repo',
        headers: { Authorization: 'token mock-token' }
      });
      (url.get_avg_ClosureTime as jest.Mock).mockResolvedValue(48); // 2 days
      (url.get_avg_Responsetime as jest.Mock).mockResolvedValue(12); // 12 hours
  
      const result = await calculateResponsiveness('https://github.com/mock-owner/mock-repo');
  
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('latency');
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(result.latency).toBeGreaterThanOrEqual(0);
  
      expect(logger.info).toHaveBeenCalledWith('Starting responsiveness calculation', { url: 'https://github.com/mock-owner/mock-repo' });
      expect(logger.info).toHaveBeenCalledWith('Responsiveness calculation complete', expect.any(Object));
    });

  
    test('calculateResponsiveness handles case with no issues or pull requests', async () => {
      (url.getToken as jest.Mock).mockReturnValue('mock-token');
      (url.get_axios_params as jest.Mock).mockReturnValue({
        owner: 'mock-owner',
        repo: 'mock-repo',
        headers: { Authorization: 'token mock-token' }
      });
      (url.get_avg_ClosureTime as jest.Mock).mockResolvedValue(0);
      (url.get_avg_Responsetime as jest.Mock).mockResolvedValue(0);
  
      const result = await calculateResponsiveness('https://github.com/mock-owner/mock-repo');
  
      expect(result).toEqual({ score: 0, latency: expect.any(Number) });
      expect(logger.warn).toHaveBeenCalledWith('No issues or pull requests found', { url: 'https://github.com/mock-owner/mock-repo' });
    });

      test('handles API call failure', async () => {
        (url.getToken as jest.Mock).mockReturnValue('mock-token');
        (url.get_axios_params as jest.Mock).mockReturnValue({
          owner: 'mock-owner',
          repo: 'mock-repo',
          headers: { Authorization: 'token mock-token' }
        });
        (url.get_avg_ClosureTime as jest.Mock).mockRejectedValue(new Error('API call failed'));
  
        const result = await calculateResponsiveness('https://github.com/mock-owner/mock-repo');
  
        expect(result).toEqual({ score: 0, latency: expect.any(Number) });
        expect(logger.error).toHaveBeenCalledWith('Error calculating responsiveness', expect.any(Object));
      });
  });
