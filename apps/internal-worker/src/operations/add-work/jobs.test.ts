import { describe, expect, it } from 'vitest';

import { createWorkJob } from './jobs.js';

const queue = { name: 'lastfm' } as Parameters<typeof createWorkJob>[0];

describe('createWorkJob', () => {
  it('creates a BullMQ-safe ID for identities containing colons', () => {
    const job = createWorkJob(queue, 'tag:scrape', 'rock:alternative', {
      name: 'rock:alternative',
    });

    expect(job.opts?.jobId).not.toContain(':');
    expect(job.opts?.deduplication).toEqual({
      id: expect.stringMatching(/^tag-scrape-[a-f0-9]{32}$/),
    });
  });

  it('preserves the payload and priority', () => {
    const data = { artist: 'A:B', name: 'Album:C' };
    const job = createWorkJob(
      queue,
      'album:update:stats',
      'A:B - Album:C',
      data,
      1,
    );

    expect(job.data).toBe(data);
    expect(job.name).toBe('album:update:stats');
    expect(job.opts?.priority).toBe(1);
  });

  it('keeps operation IDs distinct for the same identity', () => {
    const identity = 'Artist - Album';

    const statsJob = createWorkJob(queue, 'album:update:stats', identity, {});
    const tagsJob = createWorkJob(queue, 'album:update:tags', identity, {});

    expect(statsJob.opts?.jobId).not.toBe(tagsJob.opts?.jobId);
  });
});
