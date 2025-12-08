import { enqueue, lastfmQueue } from '@ymh8/queues';
import pickUnscrapedTag from '../database/pick-unscraped-tag.js';

export default async function scrapeUnscrapedTag() {
  const unscrapedTag = await pickUnscrapedTag();
  if (unscrapedTag) {
    console.log('unscrapedTag', unscrapedTag);
    await enqueue(lastfmQueue, 'tag:scrape', unscrapedTag.name, unscrapedTag);
  }
}
