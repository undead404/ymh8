import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';
import { describe, expect, it, vi } from 'vitest';

import { createKyselyMock } from '@ymh8/database';

import readTagJustificationContext from './read-tag-justification-context.js';

describe('readTagJustificationContext', () => {
  it('returns finite target and adjacent weights with bounded context', async () => {
    const { db, builder } = createKyselyMock();
    vi.mocked(builder.executeTakeFirstOrThrow).mockResolvedValue({
      weight: 100,
    });
    vi.mocked(builder.execute)
      .mockResolvedValueOnce([{ name: 'Artist' }])
      .mockResolvedValueOnce([{ name: 'neighbor', weight: 50 }])
      .mockResolvedValueOnce([
        { name: 'A' },
        { name: 'B' },
        { name: 'C' },
        { name: 'D' },
        { name: 'E' },
      ]);

    await expect(
      readTagJustificationContext(db as unknown as Transaction<DB>, 'target'),
    ).resolves.toEqual({
      target_tag: { name: 'target', weight: 100 },
      top_artists: ['Artist'],
      adjacent_tags: [
        {
          name: 'neighbor',
          weight: 50,
          top_artists: ['A', 'B', 'C', 'D', 'E'],
        },
      ],
    });

    expect(builder.limit).toHaveBeenCalledWith(30);
    expect(builder.limit).toHaveBeenCalledWith(10);
    expect(builder.limit).toHaveBeenCalledWith(5);
    expect(builder.having).toHaveBeenCalled();
  });

  it('rejects a missing target weight', async () => {
    const { db, builder } = createKyselyMock();
    vi.mocked(builder.executeTakeFirstOrThrow).mockResolvedValue({
      weight: null,
    });

    await expect(
      readTagJustificationContext(db as unknown as Transaction<DB>, 'target'),
    ).rejects.toThrow('Could not calculate a finite weight');
  });
});
