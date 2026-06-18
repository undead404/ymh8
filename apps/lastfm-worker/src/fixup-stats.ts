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
  .where((eb) =>
    eb.or([
      // eb('Album.listeners', '=', 0),
      // eb('Album.playcount', '=', 0),
      eb('statsUpdatedAt', 'is', null),
      eb('statsUpdatedAt', '<', sql<Date>`NOW() - INTERVAL '1 month'`),
    ]),
  )
  .orderBy(sql<boolean>`"statsUpdatedAt" IS NULL DESC`)
  .orderBy('statsUpdatedAt', 'asc')
  // .where(sql`"statsUpdatedAt" < interval '1' month`)
  .select(['Album.artist', 'Album.name'])
  .execute();

for (const record of result) {
  console.log(`${record.artist} - ${record.name}`);
  await enqueue(
    lastfmQueue,
    'album:update:stats',
    `${record.artist} - ${record.name}`,
    record,
  );
}
console.log(result.length, 'in total');

await closeQueues();
process.exit(0);
