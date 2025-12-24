import * as v from 'valibot';

import { enqueue, telegramQueue } from '@ymh8/queues';
import { bareTagSchema, type TelegramPost } from '@ymh8/schemata';
import { escapeForTelegram } from '@ymh8/utils';
import kysely from '../database2/index.js';
import readRelatedTags from '../database2/read-related-tags.js';
import readTagArtists from '../database2/read-tag-artists.js';
import saveTagDescription from '../database2/save-tag-description.js';
import anthropic from '../llm.js';
import systemPrompt from '../system-prompt.js';
import extractTextContent from '../utils/extract-text-content.js';

export default async function generateTagDescription(jobData: unknown) {
  const bareTag = v.parse(bareTagSchema, jobData);
  return kysely.transaction().execute(async (trx) => {
    const topArtists = await readTagArtists(trx, bareTag, 30);
    console.log(
      'top artists:',
      topArtists.map((artist) => artist.name).join(', '),
    );

    const relatedTags = await readRelatedTags(trx, bareTag.name, 5);
    // console.log('related tags:', relatedTags.map((tag) => tag.name).join(', '));

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `TARGET_GENRE:
${bareTag.name}

NEIGHBORING GENRES (Context):
${relatedTags.map((tag) => tag.name).join('\n')}

CANDIDATE ARTISTS (Raw Data):
${topArtists.map((artist) => artist.name).join('\n')}`,
        },
      ],
    });

    const tagDescription = extractTextContent(response.content);

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
