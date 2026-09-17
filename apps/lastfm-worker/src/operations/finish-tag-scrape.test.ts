import { beforeEach, describe, expect, it, vi } from 'vitest';

const isTagBlacklistedMock = vi.hoisted(() => vi.fn());
const transactionMock = vi.hoisted(() => vi.fn());
const saveAlbumScrapeSuccessMock = vi.hoisted(() => vi.fn());
const isTagListfulMock = vi.hoisted(() => vi.fn());

vi.mock('@ymh8/database', () => ({
  isTagBlacklisted: isTagBlacklistedMock,
}));
vi.mock('@ymh8/queues', () => ({
  enqueue: vi.fn(),
  internalQueue: {},
  telegramQueue: {},
}));
vi.mock('../database2/index.js', () => ({
  default: { transaction: transactionMock },
}));
vi.mock('../database2/is-tag-listful.js', () => ({
  default: isTagListfulMock,
}));
vi.mock('../database2/save-tag-scrape-success.js', () => ({
  default: saveAlbumScrapeSuccessMock,
}));

import finishTagScrape from './finish-tag-scrape.js';

describe('finishTagScrape', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isTagBlacklistedMock.mockReturnValue(true);
  });

  it('short-circuits blacklisted tags before database work', async () => {
    await expect(
      finishTagScrape({ data: { name: 'bad tag' } } as never),
    ).resolves.toBeUndefined();

    expect(isTagBlacklistedMock).toHaveBeenCalledWith('bad tag');
    expect(transactionMock).not.toHaveBeenCalled();
    expect(saveAlbumScrapeSuccessMock).not.toHaveBeenCalled();
  });
});
