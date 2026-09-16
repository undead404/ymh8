import type { Job } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const enqueueMock = vi.hoisted(() => vi.fn());
const getDailyReportStateMock = vi.hoisted(() => vi.fn());

function createQueue(name: string) {
  return {
    name,
    getJobCounts: vi.fn().mockResolvedValue({
      active: 1,
      prioritized: 2,
      wait: 3,
    }),
  };
}

vi.mock('@ymh8/queues', () => ({
  discogsQueue: createQueue('DiscogsQueue'),
  enqueue: enqueueMock,
  internalQueue: createQueue('InternalQueue'),
  itunesQueue: createQueue('ItunesQueue'),
  lastfmQueue: createQueue('LastfmQueue'),
  llmQueue: createQueue('LlmQueue'),
  telegramQueue: createQueue('TelegramQueue'),
}));
vi.mock('../database2/index.js', () => ({ default: {} }));
vi.mock('../database2/get-daily-report-state.js', () => ({
  default: getDailyReportStateMock,
}));

import dailyReport, { formatDailyReport } from './daily-report.js';

const state = {
  current: {
    albums: 100,
    tags: 20,
    tagsWithLists: 10,
    albumsInAtLeastOneList: 14,
    pendingStats: 2,
    pendingTags: 3,
    overdueStats: 5,
    overdueTags: 6,
  },
  activity: {
    albumsRegistered: 7,
    hiddenAlbumsRegistered: 2,
    statsUpdated: 8,
    tagsUpdated: 9,
    itunesChecked: 10,
    albumsWithItunesPreview: 11,
    tagAlbumsScraped: 11,
    listsChanged: 12,
    listsUnchanged: 13,
    topRegisteredAlbums: [
      { artist: 'Artist', name: 'Album', playcount: 1_234_567 },
    ],
  },
};

describe('dailyReport', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-16T06:00:00.000Z'));
    getDailyReportStateMock.mockClear();
    enqueueMock.mockClear();
    getDailyReportStateMock.mockResolvedValue(state);
    enqueueMock.mockResolvedValue(undefined);
  });

  it('formats an aggregate Ukrainian report without itemized details', () => {
    const report = formatDailyReport(state, {
      DiscogsQueue: { active: 1, prioritized: 2, waiting: 3 },
    });

    expect(report).toContain('Щоденний звіт You Must Hear');
    expect(report).toContain('Альбоми: 100');
    expect(report).toContain('Теги зі списками: 10');
    expect(report).toContain('Альбоми хоча б в одному списку: 14');
    expect(report).toContain('Серед них прихованих: 2 (28,6%)');
    expect(report).toContain('Artist — Album: 1 234 567');
    expect(report).toContain('Змінено списків: 12');
    expect(report).toContain('Альбомів із iTunes-прев’ю: 11');
    expect(report).not.toContain('Очікують статистики / тегів / iTunes');
    expect(report).not.toContain('artist');
    expect(report).not.toContain('Посилання');
    expect(report).not.toContain('опис');
  });

  it('reads a rolling 24-hour window and enqueues one deterministic report', async () => {
    await dailyReport({ data: {} } as Job<unknown>);

    expect(getDailyReportStateMock).toHaveBeenCalledWith(
      {},
      {
        start: new Date('2026-09-15T06:00:00.000Z'),
        end: new Date('2026-09-16T06:00:00.000Z'),
      },
    );
    expect(enqueueMock).toHaveBeenCalledTimes(1);
    expect(enqueueMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'TelegramQueue' }),
      'post',
      'daily-report-2026-09-16',
      expect.objectContaining({
        text: expect.stringContaining('За останні 24 години'),
      }),
    );
  });

  it('propagates database and enqueue failures', async () => {
    const failure = new Error('database unavailable');
    getDailyReportStateMock.mockRejectedValueOnce(failure);
    await expect(dailyReport({ data: {} } as Job<unknown>)).rejects.toBe(
      failure,
    );

    getDailyReportStateMock.mockResolvedValueOnce(state);
    enqueueMock.mockRejectedValueOnce(failure);
    await expect(dailyReport({ data: {} } as Job<unknown>)).rejects.toBe(
      failure,
    );
  });

  it('rejects an invalid payload before reading the database', async () => {
    await expect(dailyReport({ data: null } as Job<unknown>)).rejects.toThrow();
    expect(getDailyReportStateMock).not.toHaveBeenCalled();
  });
});
