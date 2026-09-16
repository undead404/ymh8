import type { Job } from 'bullmq';
import * as v from 'valibot';

import { bareArtistSchema } from '@ymh8/schemata';
import kysely from '../database2/index.js';
import saveArtistScrapeSuccess from '../database2/save-artist-scrape-success.js';

export default function finishArtistScrape(job: Job<unknown>) {
  const artist = v.parse(bareArtistSchema, job.data);
  return kysely
    .transaction()
    .execute((trx) => saveArtistScrapeSuccess(trx, artist.name));
}
