import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';
import { describe, expect, it, vi } from 'vitest';

import { createKyselyMock } from '@ymh8/database';

import getTagsNeedingJustification from './get-tags-needing-justification.js';

describe('getTagsNeedingJustification', () => {
  it('selects only one old list without a justification', async () => {
    const { db, builder } = createKyselyMock();
    vi.mocked(builder.execute).mockResolvedValue([]);

    await expect(
      getTagsNeedingJustification(db as unknown as Transaction<DB>, 1),
    ).resolves.toEqual([]);

    expect(builder.where).toHaveBeenCalledWith('justification', 'is', null);
    expect(builder.where).toHaveBeenCalledWith('listUpdatedAt', 'is not', null);
    expect(builder.limit).toHaveBeenCalledWith(1);
  });
});
