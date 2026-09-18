import { beforeEach, describe, expect, it, vi } from 'vitest';

const isTagBlacklistedMock = vi.hoisted(() => vi.fn());
const transactionMock = vi.hoisted(() => vi.fn());
const readRelatedTagsMock = vi.hoisted(() => vi.fn());
const readTagArtistsMock = vi.hoisted(() => vi.fn());
const saveTagDescriptionMock = vi.hoisted(() => vi.fn());
const enqueueMock = vi.hoisted(() => vi.fn());
const openaiMock = vi.hoisted(() => ({ responses: { create: vi.fn() } }));

vi.mock('@ymh8/database', () => ({
  isTagBlacklisted: isTagBlacklistedMock,
}));
vi.mock('@ymh8/queues', () => ({
  enqueue: enqueueMock,
  telegramQueue: {},
}));
vi.mock('../database2/index.js', () => ({
  default: { transaction: transactionMock },
}));
vi.mock('../database2/read-related-tags.js', () => ({
  default: readRelatedTagsMock,
}));
vi.mock('../database2/read-tag-artists.js', () => ({
  default: readTagArtistsMock,
}));
vi.mock('../database2/save-tag-description.js', () => ({
  default: saveTagDescriptionMock,
}));
vi.mock('../llm.js', () => ({ default: openaiMock }));

import generateTagDescription from './generate-tag-description.js';

describe('generateTagDescription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isTagBlacklistedMock.mockReturnValue(true);
    transactionMock.mockReturnValue({
      execute: async (callback: (transaction: unknown) => unknown) =>
        callback({}),
    });
  });

  it('short-circuits blacklisted tags before calling the LLM', async () => {
    await expect(
      generateTagDescription({ data: { name: 'bad tag' } } as never),
    ).resolves.toBeUndefined();

    expect(isTagBlacklistedMock).toHaveBeenCalledWith('bad tag');
    expect(transactionMock).not.toHaveBeenCalled();
    expect(openaiMock.responses.create).not.toHaveBeenCalled();
  });

  it('generates, saves, and publishes a description with OpenAI', async () => {
    isTagBlacklistedMock.mockReturnValue(false);
    const selectTag = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        executeTakeFirst: vi.fn().mockResolvedValue({ description: null }),
      }),
    });
    transactionMock.mockReturnValue({
      execute: async (callback: (transaction: unknown) => unknown) =>
        callback({
          selectFrom: vi.fn().mockReturnValue({ select: selectTag }),
        }),
    });
    readTagArtistsMock.mockResolvedValue([{ name: 'Artist' }]);
    readRelatedTagsMock.mockResolvedValue([{ name: 'Neighbor' }]);
    openaiMock.responses.create.mockResolvedValue({
      output_text: 'A concise genre description.',
    });

    await expect(
      generateTagDescription({
        data: { name: 'genre' },
        log: vi.fn(),
      } as never),
    ).resolves.toBe('A concise genre description.');

    expect(openaiMock.responses.create).toHaveBeenCalledWith({
      model: 'gpt-5.6-luna',
      instructions: expect.any(String),
      input: `TARGET_GENRE:
genre

NEIGHBORING GENRES (Context):
Neighbor

CANDIDATE ARTISTS (Raw Data):
Artist`,
      max_output_tokens: 1024,
    });
    expect(saveTagDescriptionMock).toHaveBeenCalledWith(
      expect.anything(),
      'genre',
      'A concise genre description.',
    );
    expect(enqueueMock).toHaveBeenCalledOnce();
  });

  it('skips persisted descriptions without calling OpenAI or publishing', async () => {
    isTagBlacklistedMock.mockReturnValue(false);
    const executeTakeFirst = vi.fn().mockResolvedValue({
      description: 'Already written',
    });
    transactionMock.mockReturnValue({
      execute: async (callback: (transaction: unknown) => unknown) =>
        callback({
          selectFrom: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({ executeTakeFirst }),
            }),
          }),
        }),
    });

    await expect(
      generateTagDescription({ data: { name: 'genre' } } as never),
    ).resolves.toBeUndefined();

    expect(openaiMock.responses.create).not.toHaveBeenCalled();
    expect(saveTagDescriptionMock).not.toHaveBeenCalled();
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it('does not persist or publish an empty provider response', async () => {
    isTagBlacklistedMock.mockReturnValue(false);
    transactionMock.mockReturnValue({
      execute: async (callback: (transaction: unknown) => unknown) =>
        callback({
          selectFrom: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                executeTakeFirst: vi
                  .fn()
                  .mockResolvedValue({ description: null }),
              }),
            }),
          }),
        }),
    });
    readTagArtistsMock.mockResolvedValue([]);
    readRelatedTagsMock.mockResolvedValue([]);
    openaiMock.responses.create.mockResolvedValue({ output_text: ' ' });

    await expect(
      generateTagDescription({
        data: { name: 'genre' },
        log: vi.fn(),
      } as never),
    ).rejects.toThrow('OpenAI response did not contain non-empty text');

    expect(saveTagDescriptionMock).not.toHaveBeenCalled();
    expect(enqueueMock).not.toHaveBeenCalled();
  });
});
