import Bottleneck from 'bottleneck';
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

vi.mock('bottleneck', () => {
  // Use a standard function (not arrow function) so 'new Bottleneck()' works
  const MockBottleneck = vi.fn(function MockBottleneck() {
    return {
      schedule: vi.fn((function_) => function_()), // Immediate execution mock
    };
  });

  return { default: MockBottleneck };
});

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
  const mockProcessJob = vi.fn();

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

  it('initializes Bottleneck with the correct timing', () => {
    const limitMs = 5000;
    createLimitedWorker(mockQueue, mockProcessJob, true, limitMs);

    expect(Bottleneck).toHaveBeenCalledWith({
      minTime: limitMs,
      maxConcurrent: 1,
    });
  });

  it('initializes the BullMQ Worker with correct configuration', () => {
    const limitMs = 3000;
    createLimitedWorker(mockQueue, mockProcessJob, true, limitMs);

    const expectedConnection = (Redis as unknown as Mock).mock.instances[0];

    expect(Worker).toHaveBeenCalledWith(
      'test-queue',
      expect.any(Function), // The processor function
      {
        connection: expectedConnection,
        limiter: {
          max: 1,
          duration: limitMs,
        },
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

  it('wraps the job processor in the Bottleneck limiter', async () => {
    createLimitedWorker(mockQueue, mockProcessJob);

    // 1. Extract the processor function passed to the Worker constructor
    const workerCall = (Worker as unknown as Mock).mock.calls[0];
    const processorFunction = workerCall![1]; // The 2nd arg is the processor

    // 2. Get the Bottleneck instance
    const limiterInstance = (Bottleneck as unknown as Mock).mock.instances[0];

    // 3. Simulate BullMQ calling the processor
    const mockJob = { id: '1' };
    await processorFunction(mockJob);

    // 4. Verify the limiter's schedule method was called
    expect((limiterInstance as any).schedule).toHaveBeenCalled();

    // 5. Verify our actual job processor was called inside the schedule wrapper
    // (Our mock implementation of schedule executes the fn immediately)
    expect(mockProcessJob).toHaveBeenCalledWith(mockJob);
  });

  it('uses default limitMs of 2000 if not provided', () => {
    createLimitedWorker(mockQueue, mockProcessJob);

    expect(Bottleneck).toHaveBeenCalledWith(
      expect.objectContaining({
        minTime: 2000,
      }),
    );
  });
});
