import { sql } from 'kysely';

import { closeQueues, enqueue, lastfmQueue } from '@ymh8/queues';

import kysely from './database2/index.js';

const result = await kysely
  .selectFrom('TagListItem')
  .innerJoin('Album', (join) =>
    join
      .onRef('TagListItem.albumArtist', '=', 'Album.artist')
      .onRef('TagListItem.albumName', '=', 'Album.name'),
  )
  .where('statsUpdatedAt', '<', sql<Date>`NOW() - interval '1 month'`)
  .select(['Album.artist', 'Album.name'])
  .execute();

for (const record of result) {
  console.log(`Update stats: ${record.artist} - ${record.name}`);
  await enqueue(
    lastfmQueue,
    'album:update:stats',
    `${record.artist} - ${record.name}`,
    record,
  );
}

const result2 = await kysely
  .selectFrom('TagListItem')
  .innerJoin('Album', (join) =>
    join
      .onRef('TagListItem.albumArtist', '=', 'Album.artist')
      .onRef('TagListItem.albumName', '=', 'Album.name'),
  )
  .where('tagsUpdatedAt', '<', sql<Date>`NOW() - interval '1 month'`)
  .select(['Album.artist', 'Album.name'])
  .execute();

for (const record of result2) {
  console.log(`Update tags: ${record.artist} - ${record.name}`);
  await enqueue(
    lastfmQueue,
    'album:update:tags',
    `${record.artist} - ${record.name}`,
    record,
  );
}
await closeQueues();
process.exit(0);
