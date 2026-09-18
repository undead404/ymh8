import type { Job } from 'bullmq';
import * as v from 'valibot';

import { isTagBlacklisted } from '@ymh8/database';
import { enqueue, telegramQueue } from '@ymh8/queues';
import { tagJustificationSchema, type TelegramPost } from '@ymh8/schemata';
import { escapeForTelegram } from '@ymh8/utils';
import kysely from '../database2/index.js';
import saveTagJustification from '../database2/save-tag-justification.js';
import openai from '../llm.js';
import tagJustificationPrompt from '../tag-justification-prompt.js';
import extractTextContent from '../utils/extract-text-content.js';

export default async function generateTagJustification(job: Job<unknown>) {
  const context = v.parse(tagJustificationSchema, job.data);
  const tagName = context.target_tag.name;

  if (isTagBlacklisted(tagName)) return;

  return kysely.transaction().execute(async (trx) => {
    const existingTag = await trx
      .selectFrom('Tag')
      .select('justification')
      .where('name', '=', tagName)
      .executeTakeFirst();

    if (existingTag?.justification != null) return;

    const response = await openai.responses.create({
      model: 'gpt-5.6-luna',
      instructions: tagJustificationPrompt,
      input: JSON.stringify(context),
      max_output_tokens: 1024,
    });
    const justification = extractTextContent(response);

    await saveTagJustification(trx, tagName, justification);
    await enqueue(
      telegramQueue,
      'post',
      `tag-justification-${tagName}`,
      {
        text: escapeForTelegram(`Justification generated for tag: ${tagName}`),
      } satisfies TelegramPost,
      100,
    );

    return justification;
  });
}
