import { enqueue, lastfmQueue } from '@ymh8/queues';
import pickOldScrapedTag from '../database/pick-old-scraped-tag.js';

export default async function scrapeOldScrapedTag() {
  const oldScrapedTag = await pickOldScrapedTag();
  if (oldScrapedTag) {
    console.log('oldScrapedTag', oldScrapedTag);
    await enqueue(lastfmQueue, 'tag:scrape', oldScrapedTag.name, oldScrapedTag);
  }
}
