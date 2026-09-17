import { beforeEach, describe, expect, it, vi } from 'vitest';

const isTagBlacklistedMock = vi.hoisted(() => vi.fn());
const transactionMock = vi.hoisted(() => vi.fn());

vi.mock('@ymh8/database', () => ({
  deleteTag: vi.fn(),
  hideAlbum: vi.fn(),
  isTagBlacklisted: isTagBlacklistedMock,
  isTagValid: vi.fn(),
}));
vi.mock('@ymh8/queues', () => ({
  discogsQueue: {},
  enqueue: vi.fn(),
  internalQueue: {},
  telegramQueue: {},
}));
vi.mock('../database2/index.js', () => ({
  default: { transaction: transactionMock },
}));

import generateTagList from './generate-tag-list.js';

describe('generateTagList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isTagBlacklistedMock.mockReturnValue(true);
  });

  it('short-circuits blacklisted tags before database work', async () => {
    await expect(
      generateTagList({ data: { name: 'bad tag' } } as never),
    ).resolves.toEqual({ status: 'blacklisted' });

    expect(isTagBlacklistedMock).toHaveBeenCalledWith('bad tag');
    expect(transactionMock).not.toHaveBeenCalled();
  });
});
