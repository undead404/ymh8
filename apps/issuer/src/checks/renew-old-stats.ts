import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import { hideAlbum } from '@ymh8/database';
import { enqueue, lastfmQueue } from '@ymh8/queues';
import { isAlbumNegligible } from '@ymh8/utils';
import findOldStatsAlbum from '../database2/find-old-stats-album.js';

export default async function renewOldStats(transaction: Transaction<DB>) {
  // const oldStatsAlbum = await findOldStatsBareAlbum();
  const oldStatsAlbum = await findOldStatsAlbum(transaction);
  if (!oldStatsAlbum) {
    return;
  }
  console.log('oldStatsAlbum', oldStatsAlbum);
  if (isAlbumNegligible(oldStatsAlbum)) {
    // await database.update(SQL`
    //   UPDATE "Album"
    //   SET "hidden" = TRUE
    //   WHERE "artist" = ${oldStatsAlbum.artist}
    //   AND "name" = ${oldStatsAlbum.name}
    // `);
    await hideAlbum(transaction, oldStatsAlbum);
    return;
  }
  await enqueue(
    lastfmQueue,
    'album:update:stats',
    oldStatsAlbum.artist + ' - ' + oldStatsAlbum.name,
    oldStatsAlbum,
    1,
  );
}
