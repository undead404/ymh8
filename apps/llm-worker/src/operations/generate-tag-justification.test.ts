import { beforeEach, describe, expect, it, vi } from 'vitest';

const isTagBlacklistedMock = vi.hoisted(() => vi.fn());
const transactionMock = vi.hoisted(() => vi.fn());
const saveTagJustificationMock = vi.hoisted(() => vi.fn());
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
vi.mock('../database2/save-tag-justification.js', () => ({
  default: saveTagJustificationMock,
}));
vi.mock('../llm.js', () => ({ default: openaiMock }));

import generateTagJustification from './generate-tag-justification.js';

const context = {
  target_tag: { name: 'genre', weight: 100 },
  top_artists: ['Artist'],
  adjacent_tags: [
    { name: 'neighbor', weight: 50, top_artists: ['A', 'B', 'C', 'D', 'E'] },
  ],
};

function configureTransaction(justification: string | null) {
  transactionMock.mockReturnValue({
    execute: async (callback: (transaction: unknown) => unknown) =>
      callback({
        selectFrom: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              executeTakeFirst: vi.fn().mockResolvedValue({ justification }),
            }),
          }),
        }),
      }),
  });
}

describe('generateTagJustification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isTagBlacklistedMock.mockReturnValue(false);
    saveTagJustificationMock.mockResolvedValue(undefined);
    openaiMock.responses.create.mockResolvedValue({
      status: 'completed',
      output_text: 'Keep this tag because it has a distinct sonic identity.',
    });
  });

  it('validates context, saves a plain-text justification, and reports success', async () => {
    configureTransaction(null);

    await expect(
      generateTagJustification({ data: context, log: vi.fn() } as never),
    ).resolves.toBe('Keep this tag because it has a distinct sonic identity.');

    expect(openaiMock.responses.create).toHaveBeenCalledWith({
      model: 'gpt-5.6-luna',
      instructions: expect.any(String),
      input: JSON.stringify(context),
      max_output_tokens: 4096,
      reasoning: { effort: 'xhigh' },
    });
    expect(saveTagJustificationMock).toHaveBeenCalledWith(
      expect.anything(),
      'genre',
      'Keep this tag because it has a distinct sonic identity.',
    );
    expect(enqueueMock).toHaveBeenCalledWith(
      expect.anything(),
      'post',
      'tag-justification-genre',
      {
        text: '<b>🏷️ Tag justification</b>\n\n<b>Tag:</b> genre\n\n<b>Artists</b>\nArtist\n\n<b>Adjacent tags</b>\nneighbor\n\n<b>Justification</b>\nKeep this tag because it has a distinct sonic identity.',
      },
      100,
    );
  });

  it('regenerates tags that already have a justification', async () => {
    configureTransaction('Already reviewed');

    await expect(
      generateTagJustification({ data: context, log: vi.fn() } as never),
    ).resolves.toBe('Keep this tag because it has a distinct sonic identity.');

    expect(openaiMock.responses.create).toHaveBeenCalled();
    expect(saveTagJustificationMock).toHaveBeenCalled();
    expect(enqueueMock).toHaveBeenCalled();
  });

  it('rejects invalid payloads before calling OpenAI', async () => {
    await expect(
      generateTagJustification({
        data: { target_tag: context.target_tag },
      } as never),
    ).rejects.toThrow();

    expect(openaiMock.responses.create).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('does not save or report an empty provider response', async () => {
    configureTransaction(null);
    openaiMock.responses.create.mockResolvedValue({
      status: 'completed',
      output_text: ' ',
    });

    await expect(
      generateTagJustification({ data: context, log: vi.fn() } as never),
    ).rejects.toThrow('OpenAI response did not contain non-empty text');

    expect(saveTagJustificationMock).not.toHaveBeenCalled();
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it('logs and rejects a response that did not complete', async () => {
    configureTransaction(null);
    const log = vi.fn();
    openaiMock.responses.create.mockResolvedValue({
      status: 'incomplete',
      incomplete_details: { reason: 'max_output_tokens' },
    });

    await expect(
      generateTagJustification({ data: context, log } as never),
    ).rejects.toThrow('OpenAI response was not completed: incomplete');

    expect(log).toHaveBeenNthCalledWith(
      1,
      'OpenAI response status: incomplete',
    );
    expect(log).toHaveBeenNthCalledWith(
      2,
      'OpenAI response was not completed: {"reason":"max_output_tokens"}',
    );
    expect(saveTagJustificationMock).not.toHaveBeenCalled();
    expect(enqueueMock).not.toHaveBeenCalled();
  });
});
