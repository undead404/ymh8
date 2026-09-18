import type { Job } from 'bullmq';
import * as v from 'valibot';

import { isTagBlacklisted } from '@ymh8/database';
import { enqueue, telegramQueue } from '@ymh8/queues';
import { bareTagSchema, type TelegramPost } from '@ymh8/schemata';
import { escapeForTelegram } from '@ymh8/utils';
import kysely from '../database2/index.js';
import readRelatedTags from '../database2/read-related-tags.js';
import readTagArtists from '../database2/read-tag-artists.js';
import saveTagDescription from '../database2/save-tag-description.js';
import openai from '../llm.js';
import systemPrompt from '../system-prompt.js';
import extractTextContent from '../utils/extract-text-content.js';

export default async function generateTagDescription(job: Job<unknown>) {
  const bareTag = v.parse(bareTagSchema, job.data);
  if (isTagBlacklisted(bareTag.name)) return;

  return kysely.transaction().execute(async (trx) => {
    const existingTag = await trx
      .selectFrom('Tag')
      .select('description')
      .where('name', '=', bareTag.name)
      .executeTakeFirst();

    if (existingTag?.description != null) return;

    const topArtists = await readTagArtists(trx, bareTag, 30);
    await job.log(
      'top artists: ' + topArtists.map((artist) => artist.name).join(', '),
    );

    const relatedTags = await readRelatedTags(trx, bareTag.name, 5);
    // console.log('related tags:', relatedTags.map((tag) => tag.name).join(', '));

    const response = await openai.responses.create({
      model: 'gpt-5.6-luna',
      instructions: systemPrompt,
      input: `TARGET_GENRE:
${bareTag.name}

NEIGHBORING GENRES (Context):
${relatedTags.map((tag) => tag.name).join('\n')}

CANDIDATE ARTISTS (Raw Data):
${topArtists.map((artist) => artist.name).join('\n')}`,
      max_output_tokens: 1024,
    });

    const tagDescription = extractTextContent(response);

    // console.log(tagDescription);

    await saveTagDescription(trx, bareTag.name, tagDescription);

    await enqueue(
      telegramQueue,
      'post',
      `tag-description-${bareTag.name}`,
      {
        text: escapeForTelegram(tagDescription),
      } satisfies TelegramPost,
      100,
    );
    return tagDescription;
  });
}
