import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import { enqueue, lastfmQueue } from '@ymh8/queues';
import findOldScrapedTag from '../database2/find-old-scraped-tag.js';
// import pickOldScrapedTag from '../database/pick-old-scraped-tag.js';

export default async function scrapeOldScrapedTag(
  transaction: Transaction<DB>,
) {
  // const oldScrapedTag = await pickOldScrapedTag();
  const oldScrapedTag = await findOldScrapedTag(transaction);
  if (!oldScrapedTag) {
    return;
  }
  console.log('oldScrapedTag', oldScrapedTag);
  await enqueue(lastfmQueue, 'tag:scrape', oldScrapedTag.name, oldScrapedTag);
}
