import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the module where enqueue/telegramQueue live
import { enqueue, telegramQueue } from '../index.js';

import getErrorHandler from './get-error-handler.js';

vi.mock('../index.js', () => ({
  enqueue: vi.fn(),
  telegramQueue: { name: 'mock-telegram-queue' }, // Dummy object
}));

describe('getErrorHandler', () => {
  const mockQueue = { name: 'processing-queue' } as any;
  const testError = new Error('Database connection failed');
  testError.stack = 'Error: Database connection failed\n at db.ts:50';

  beforeEach(() => {
    vi.clearAllMocks();
    // Spy on console.error to suppress noise and verify calls
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // Mock Date.now for deterministic ID testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('logs the error locally regardless of postErrors flag', () => {
    const handler = getErrorHandler(mockQueue, false);
    handler(testError);

    expect(console.error).toHaveBeenCalledWith(testError);
  });

  it('does NOT enqueue a job if postErrors is false', () => {
    const handler = getErrorHandler(mockQueue, false);
    handler(testError);

    expect(enqueue).not.toHaveBeenCalled();
  });

  it('enqueues a Telegram notification if postErrors is true', () => {
    // Setup enqueue to resolve successfully
    vi.mocked(enqueue).mockResolvedValue(undefined as any);

    const handler = getErrorHandler(mockQueue, true);
    handler(testError);

    const expectedId = `worker-error-${Date.now()}`;
    const expectedMessage = `processing-queue error: Error\nDatabase connection failed\n${testError.stack}`;

    expect(enqueue).toHaveBeenCalledWith(telegramQueue, 'post', expectedId, {
      text: expectedMessage,
    });
  });

  it('handles errors when enqueue fails (fire-and-forget)', async () => {
    const queueError = new Error('Redis is down');
    // Simulate enqueue failing
    vi.mocked(enqueue).mockRejectedValue(queueError);

    const handler = getErrorHandler(mockQueue, true);
    handler(testError); // This triggers the async chain

    // Since the handler returns void, we can't await it.
    // We must wait for the microtask queue to process the rejected promise.
    await new Promise(process.nextTick);

    // Verify the catch block logged the queue error
    expect(console.error).toHaveBeenCalledWith(queueError);
    // It should have logged BOTH errors: the original one and the queue one
    expect(console.error).toHaveBeenCalledTimes(2);
  });
});
