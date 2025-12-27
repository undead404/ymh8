import { closeQueues, enqueue, lastfmQueue } from '@ymh8/queues';

import kysely from './database2/index.js';

const result = await kysely
  .selectFrom('TagListItem')
  .select([
    'albumArtist',
    'albumName',
    (eb) => eb.fn.countAll().as('places_count'),
    // sql<string>`STRING_AGG("tagName", ', ')`.as('tags'),
  ])
  .groupBy(['albumArtist', 'albumName'])
  .having((eb) => eb.fn.countAll(), '>', 5)
  .orderBy('places_count', 'desc')
  .execute();

for (const record of result) {
  await enqueue(
    lastfmQueue,
    'album:update:tags',
    `${record.albumArtist} - ${record.albumName}`,
    {
      artist: record.albumArtist,
      name: record.albumName,
    },
  );
}

await closeQueues();
process.exit(0);
