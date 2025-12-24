import { Worker } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { enqueue, telegramQueue } from '../index.js';

import formatJobFail from './format-job-fail.js';
import getFailHandler from './get-fail-handler.js';

// 1. Mock Dependencies
vi.mock('../index.js', () => ({
  enqueue: vi.fn().mockResolvedValue(undefined),
  telegramQueue: { name: 'mock-telegram-queue' },
}));

vi.mock('./format-job-fail.js', () => ({
  default: vi.fn(() => 'Formatted Error Message'),
}));

// Mock BullMQ Worker static method
vi.mock('bullmq', async (importOriginal) => {
  const actual = await importOriginal<typeof import('bullmq')>();
  return {
    ...actual,
    Worker: {
      RateLimitError: vi.fn(() => new Error('MockRateLimitError')),
    },
  };
});

// Standard Mock Job
const createMockJob = (overrides = {}) =>
  ({
    id: 'job-123',
    name: 'test-job',
    attemptsMade: 1,
    opts: { attempts: 3 },
    failedReason: 'Some error',
    stacktrace: [],
    priority: 1,
    ...overrides,
  }) as any;

describe('getFailHandler', () => {
  // Mock Queue Object
  const mockQueue = {
    name: 'test-queue',
    rateLimit: vi.fn().mockResolvedValue(undefined),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns early if job is undefined', () => {
    const handler = getFailHandler(mockQueue, true);
    expect(() => handler(undefined, new Error())).not.toThrow();
    expect(enqueue).not.toHaveBeenCalled();
    expect(mockQueue.rateLimit).not.toHaveBeenCalled();
  });

  describe('Rate Limiting Logic', () => {
    it('detects rate limit errors, pauses queue, and throws RateLimitError', () => {
      const handler = getFailHandler(mockQueue, true);

      const job = createMockJob({ failedReason: 'API Rate Limit Exceeded' });

      // Mock an error object with response headers (like Axios)
      const errorWithHeaders = {
        message: 'Too Many Requests',
        response: {
          headers: { 'retry-after': '30' }, // 30 seconds
        },
      };

      // The handler is expected to throw Worker.RateLimitError
      expect(() => handler(job, errorWithHeaders as any)).toThrow(
        'MockRateLimitError',
      );

      // Verify Queue Pausing Logic
      // 30 seconds * 1000 = 30,000ms
      expect(mockQueue.rateLimit).toHaveBeenCalledWith(30_000);

      // Verify the BullMQ special error was created
      expect(Worker.RateLimitError).toHaveBeenCalled();
    });

    it('defaults to 60s delay if retry-after header is missing', () => {
      const handler = getFailHandler(mockQueue, true);
      const job = createMockJob({ failedReason: 'Global Rate Limit' });
      const errorWithoutHeaders = { response: { headers: {} } };

      expect(() => handler(job, errorWithoutHeaders as any)).toThrow();

      // Default is 60_000ms
      expect(mockQueue.rateLimit).toHaveBeenCalledWith(60_000);
    });

    it('does not trigger rate limiting for standard errors', () => {
      const handler = getFailHandler(mockQueue, true);
      const job = createMockJob({ failedReason: 'Connection Refused' });

      // Should not throw RateLimitError
      handler(job, new Error());

      expect(mockQueue.rateLimit).not.toHaveBeenCalled();
    });
  });

  describe('Notification Logic', () => {
    it('does NOT notify if job has retries remaining', () => {
      const handler = getFailHandler(mockQueue, true);
      // 1 attempt made, 3 total -> should retry silently (except log)
      const job = createMockJob({ attemptsMade: 1, opts: { attempts: 3 } });

      handler(job, new Error('Fail'));

      expect(enqueue).not.toHaveBeenCalled();
    });

    it('does NOT notify if postErrors is false', () => {
      const handler = getFailHandler(mockQueue, false); // Disabled
      // Retries exhausted
      const job = createMockJob({ attemptsMade: 3, opts: { attempts: 3 } });

      handler(job, new Error('Fail'));

      expect(enqueue).not.toHaveBeenCalled();
    });

    it('enqueues notification when retries are exhausted and postErrors is true', () => {
      const handler = getFailHandler(mockQueue, true);
      // Retries exhausted
      const job = createMockJob({
        id: '999',
        attemptsMade: 3,
        opts: { attempts: 3 },
        priority: 5,
      });

      handler(job, new Error('Fail'));

      expect(formatJobFail).toHaveBeenCalledWith(job);
      expect(enqueue).toHaveBeenCalledWith(
        telegramQueue,
        'post',
        'error-999',
        expect.objectContaining({ text: 'Formatted Error Message' }),
        5, // Priority
      );
    });
  });

  describe('Edge Cases', () => {
    it('handles queue.rateLimit failure gracefully', async () => {
      // Setup queue.rateLimit to fail
      mockQueue.rateLimit.mockRejectedValue(new Error('Redis Error'));

      const handler = getFailHandler(mockQueue, true);
      const job = createMockJob({ failedReason: 'rate limit' });
      const error = { response: { headers: {} } };

      // It should still throw the worker error, but catch the inner promise rejection
      expect(() => handler(job, error as any)).toThrow();

      // Allow the floating promise catch block to run
      await new Promise(process.nextTick);

      expect(console.error).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
