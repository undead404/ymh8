import { beforeEach, describe, expect, it, vi } from 'vitest';

const isTagValidMock = vi.hoisted(() => vi.fn());
const transactionMock = vi.hoisted(() => vi.fn());
const deleteTagMock = vi.hoisted(() => vi.fn());

vi.mock('@ymh8/database', () => ({
  deleteTag: deleteTagMock,
  hideAlbum: vi.fn(),
  isTagValid: isTagValidMock,
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
    isTagValidMock.mockResolvedValue(true);
    transactionMock.mockReturnValue({
      execute: async (callback: (transaction: unknown) => unknown) =>
        callback({}),
    });
  });

  it('deletes blacklisted tags during validation', async () => {
    isTagValidMock.mockResolvedValue(false);

    await expect(
      generateTagList({ data: { name: 'bad tag' } } as never),
    ).resolves.toEqual({ status: 'deleted' });

    expect(isTagValidMock).toHaveBeenCalledWith(expect.anything(), {
      name: 'bad tag',
    });
    expect(deleteTagMock).toHaveBeenCalledWith(expect.anything(), 'bad tag');
  });
});
