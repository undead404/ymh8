import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import getDescriptionlessTags from '../../database2/get-descriptionless-tags.js';
import getTagsNeedingJustification from '../../database2/get-tags-needing-justification.js';
import readTagJustificationContext from '../../database2/read-tag-justification-context.js';

import addLlmWork from './llm.js';

vi.mock('../../database2/get-descriptionless-tags.js', () => ({
  default: vi.fn(),
}));
vi.mock('../../database2/get-tags-needing-justification.js', () => ({
  default: vi.fn(),
}));
vi.mock('../../database2/read-tag-justification-context.js', () => ({
  default: vi.fn(),
}));

const transaction = {} as Transaction<DB>;

describe('addLlmWork', () => {
  beforeEach(() => {
    vi.mocked(getDescriptionlessTags).mockReset();
    vi.mocked(getTagsNeedingJustification).mockReset();
    vi.mocked(readTagJustificationContext).mockReset();
    vi.mocked(getTagsNeedingJustification).mockResolvedValue([]);
    vi.mocked(getDescriptionlessTags).mockResolvedValue([]);
  });

  it('adds at most one justification job and uses remaining capacity for descriptions', async () => {
    vi.mocked(getTagsNeedingJustification).mockResolvedValue([
      { name: 'target' },
    ]);
    vi.mocked(readTagJustificationContext).mockResolvedValue({
      target_tag: { name: 'target', weight: 100 },
      top_artists: ['Artist'],
      adjacent_tags: [],
    });
    vi.mocked(getDescriptionlessTags).mockResolvedValue([
      { name: 'descriptionless' },
    ]);

    const jobs = await addLlmWork(transaction, 2);

    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toMatchObject({
      name: 'tag:justification:generate',
      data: expect.objectContaining({
        target_tag: { name: 'target', weight: 100 },
      }),
    });
    expect(jobs[1]).toMatchObject({
      name: 'tag:description:generate',
      data: { name: 'descriptionless' },
    });
    expect(getTagsNeedingJustification).toHaveBeenCalledWith(transaction, 1);
    expect(getDescriptionlessTags).toHaveBeenCalledWith(transaction, 1);
  });

  it('does not reserve capacity when no tag needs justification', async () => {
    vi.mocked(getDescriptionlessTags).mockResolvedValue([
      { name: 'descriptionless' },
    ]);

    const jobs = await addLlmWork(transaction, 1);

    expect(jobs).toHaveLength(1);
    expect(getDescriptionlessTags).toHaveBeenCalledWith(transaction, 1);
  });
});
