import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';
import { describe, expect, it, vi } from 'vitest';

import { createKyselyMock } from '@ymh8/database';

import getDescriptionlessTags from './get-descriptionless-tags.js';

describe('getDescriptionlessTags', () => {
  it('only selects tags whose lists have been unchanged for at least 24 hours', async () => {
    const { db, builder } = createKyselyMock();
    vi.mocked(builder.execute).mockResolvedValue([]);

    await expect(
      getDescriptionlessTags(db as unknown as Transaction<DB>, 10),
    ).resolves.toEqual([]);

    expect(builder.where).toHaveBeenCalledWith('description', 'is', null);
    expect(builder.where).toHaveBeenCalledWith('listUpdatedAt', 'is not', null);
    expect(builder.where).toHaveBeenCalledWith(
      'listUpdatedAt',
      '<=',
      expect.objectContaining({}),
    );
  });
});
