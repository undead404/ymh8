import type { Job } from 'bullmq';
import * as v from 'valibot';

import { bareArtistSchema } from '@ymh8/schemata';
import { isArtistNegligible } from '@ymh8/utils';
import kysely from '../database2/index.js';
import saveArtistScrapeSuccess from '../database2/save-artist-scrape-success.js';

export default async function finishArtistScrape(job: Job<unknown>) {
  const artist = v.parse(bareArtistSchema, job.data);
  if (isArtistNegligible(artist)) return;

  await kysely
    .transaction()
    .execute((trx) => saveArtistScrapeSuccess(trx, artist.name));
}
