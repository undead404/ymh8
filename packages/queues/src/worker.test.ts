import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from 'vitest';

import createLimitedWorker from './worker.js';

// 1. Mock External Libraries
vi.mock('bullmq', () => ({
  Worker: vi.fn(function MockWorker() {
    return {
      on: vi.fn(),
    };
  }),
  Queue: vi.fn(),
}));

vi.mock('ioredis', () => ({
  Redis: vi.fn(),
}));

// 2. Mock Internal Utilities
vi.mock('./utils/get-error-handler.js', () => ({
  default: vi.fn(() => 'mock-error-handler'),
}));
vi.mock('./utils/get-fail-handler.js', () => ({
  default: vi.fn(() => 'mock-fail-handler'),
}));

// Import mocks to inspect calls
import getErrorHandler from './utils/get-error-handler.js';
import getFailHandler from './utils/get-fail-handler.js';

// Helper to get the mocked instance of the Worker
const getMockWorkerInstance = () =>
  (Worker as unknown as Mock).mock.results[0]!.value;

describe('createLimitedWorker', () => {
  const mockQueue = { name: 'test-queue' } as any;
  const mockProcessJob = './process-job.js';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {}); // Silence logs

    // Setup Worker mock to return an object with .on()
    (Worker as unknown as Mock).mockImplementation(function () {
      return {
        on: vi.fn(),
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes a dedicated Redis connection with strict settings', () => {
    createLimitedWorker(mockQueue, mockProcessJob);

    // BullMQ requires maxRetriesPerRequest: null for workers
    expect(Redis).toHaveBeenCalledWith({ maxRetriesPerRequest: null });
  });

  it('initializes the BullMQ Worker with correct configuration', () => {
    const limitMs = 3000;
    createLimitedWorker(mockQueue, mockProcessJob, true, limitMs);

    const expectedConnection = (Redis as unknown as Mock).mock.instances[0];

    expect(Worker).toHaveBeenCalledWith(
      'test-queue',
      './process-job.js', // The processor function
      {
        connection: expectedConnection,
        limiter: {
          max: 1,
          duration: limitMs,
        },
        maxStalledCount: 3,
        stalledInterval: 1000,
      },
    );
  });

  it('attaches error and failure handlers correctly', () => {
    createLimitedWorker(mockQueue, mockProcessJob, false); // postErrors = false

    const workerInstance = getMockWorkerInstance();

    // Verify handlers were generated with correct arguments
    expect(getFailHandler).toHaveBeenCalledWith(mockQueue, false);
    expect(getErrorHandler).toHaveBeenCalledWith(mockQueue, false);

    // Verify handlers were attached to the worker
    expect(workerInstance.on).toHaveBeenCalledWith(
      'failed',
      'mock-fail-handler',
    );
    expect(workerInstance.on).toHaveBeenCalledWith(
      'error',
      'mock-error-handler',
    );
  });
});
