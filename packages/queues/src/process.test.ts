import { type Job, UnrecoverableError } from 'bullmq';
import { describe, expect, it, vi } from 'vitest';

import { createJobProcessor } from './process.js';

function validatePayload(data: unknown): unknown {
  if (
    typeof data !== 'object' ||
    data === null ||
    !('name' in data) ||
    typeof data.name !== 'string'
  ) {
    throw new Error('name must be a string');
  }
  return data;
}

function jobWithData(data: unknown): Job<unknown> {
  return {
    data,
    name: 'test-operation',
  } as Job<unknown>;
}

describe('createJobProcessor', () => {
  it('validates data before invoking the operation', async () => {
    const operate = vi.fn(async (job: Job<unknown>) => job.data);
    const processJob = createJobProcessor({
      'test-operation': {
        operate,
        schema: validatePayload,
      },
    });

    const job = jobWithData({ name: 'validated' });
    await expect(processJob(job)).resolves.toEqual({ name: 'validated' });
    expect(operate).toHaveBeenCalledWith(job);
  });

  it('rejects invalid data without invoking the operation or retrying', async () => {
    const operate = vi.fn(async () => undefined);
    const processJob = createJobProcessor({
      'test-operation': {
        operate,
        schema: validatePayload,
      },
    });

    await expect(processJob(jobWithData({ name: 42 }))).rejects.toBeInstanceOf(
      UnrecoverableError,
    );
    expect(operate).not.toHaveBeenCalled();
  });

  it('preserves retryable operation failures', async () => {
    const failure = new Error('temporary failure');
    const processJob = createJobProcessor({
      'test-operation': {
        operate: vi.fn(async () => {
          throw failure;
        }),
        schema: validatePayload,
      },
    });

    await expect(processJob(jobWithData({ name: 'valid' }))).rejects.toBe(
      failure,
    );
  });

  it('rejects unknown operations', async () => {
    const processJob = createJobProcessor({});

    await expect(
      processJob({ name: 'missing-operation', data: {} } as Job<unknown>),
    ).rejects.toThrow('No operation to handle this job');
  });
});
