import { beforeEach, describe, expect, it, vi } from 'vitest';

const isTagBlacklistedMock = vi.hoisted(() => vi.fn());
const transactionMock = vi.hoisted(() => vi.fn());
const anthropicMock = vi.hoisted(() => ({ messages: { create: vi.fn() } }));

vi.mock('@ymh8/database', () => ({
  isTagBlacklisted: isTagBlacklistedMock,
}));
vi.mock('@ymh8/queues', () => ({
  enqueue: vi.fn(),
  telegramQueue: {},
}));
vi.mock('../database2/index.js', () => ({
  default: { transaction: transactionMock },
}));
vi.mock('../database2/read-related-tags.js', () => ({ default: vi.fn() }));
vi.mock('../database2/read-tag-artists.js', () => ({ default: vi.fn() }));
vi.mock('../database2/save-tag-description.js', () => ({ default: vi.fn() }));
vi.mock('../llm.js', () => ({ default: anthropicMock }));

import generateTagDescription from './generate-tag-description.js';

describe('generateTagDescription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isTagBlacklistedMock.mockReturnValue(true);
  });

  it('short-circuits blacklisted tags before calling the LLM', async () => {
    await expect(
      generateTagDescription({ data: { name: 'bad tag' } } as never),
    ).resolves.toBeUndefined();

    expect(isTagBlacklistedMock).toHaveBeenCalledWith('bad tag');
    expect(transactionMock).not.toHaveBeenCalled();
    expect(anthropicMock.messages.create).not.toHaveBeenCalled();
  });
});
