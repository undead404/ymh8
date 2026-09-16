import { describe, expect, it, vi } from 'vitest';

import { createKyselyMock } from '@ymh8/database';

import getDailyReportState from './get-daily-report-state.js';

describe('getDailyReportState', () => {
  it('returns current and rolling-window aggregates', async () => {
    const { db, builder } = createKyselyMock();
    vi.mocked(builder.executeTakeFirstOrThrow)
      .mockResolvedValueOnce({
        albums: 12,
        pendingStats: 2,
        pendingTags: 3,
        overdueStats: 1,
        overdueTags: 2,
        albumsRegistered: 5,
        hiddenAlbumsRegistered: 1,
        statsUpdated: 6,
        tagsUpdated: 7,
        itunesChecked: 8,
      })
      .mockResolvedValueOnce({
        tags: 9,
        tagsWithLists: 10,
        tagAlbumsScraped: 11,
        listsChanged: 12,
        listsUnchanged: 13,
      })
      .mockResolvedValueOnce({ albumsInAtLeastOneList: 14 })
      .mockResolvedValueOnce({ albumsWithItunesPreview: 15 });
    vi.mocked(builder.execute).mockResolvedValueOnce([
      { artist: 'Artist', name: 'Album', playcount: 100 },
    ]);

    const start = new Date('2026-09-15T06:00:00.000Z');
    const end = new Date('2026-09-16T06:00:00.000Z');

    await expect(getDailyReportState(db, { start, end })).resolves.toEqual({
      current: {
        albums: 12,
        tags: 9,
        tagsWithLists: 10,
        albumsInAtLeastOneList: 14,
        pendingStats: 2,
        pendingTags: 3,
        overdueStats: 1,
        overdueTags: 2,
      },
      activity: {
        albumsRegistered: 5,
        hiddenAlbumsRegistered: 1,
        statsUpdated: 6,
        tagsUpdated: 7,
        itunesChecked: 8,
        albumsWithItunesPreview: 15,
        tagAlbumsScraped: 11,
        listsChanged: 12,
        listsUnchanged: 13,
        topRegisteredAlbums: [
          { artist: 'Artist', name: 'Album', playcount: 100 },
        ],
      },
    });
    expect(builder.executeTakeFirstOrThrow).toHaveBeenCalledTimes(4);
  });

  it('propagates aggregate query failures', async () => {
    const { db, builder } = createKyselyMock();
    const failure = new Error('database unavailable');
    vi.mocked(builder.executeTakeFirstOrThrow).mockRejectedValue(failure);

    await expect(
      getDailyReportState(db, {
        start: new Date('2026-09-15T06:00:00.000Z'),
        end: new Date('2026-09-16T06:00:00.000Z'),
      }),
    ).rejects.toBe(failure);
  });
});
