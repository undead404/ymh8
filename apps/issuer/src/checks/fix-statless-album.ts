import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import { hideAlbum } from '@ymh8/database';
import { enqueue, lastfmQueue } from '@ymh8/queues';
import { isAlbumNegligible } from '@ymh8/utils';
import findStatlessAlbum from '../database2/find-statless-album.js';

export default async function fixStatlessAlbum(transaction: Transaction<DB>) {
  // const statlessAlbum = await findStatlessAlbum();
  const statlessAlbum = await findStatlessAlbum(transaction);
  if (!statlessAlbum) {
    return;
  }
  console.log('statlessAlbum', statlessAlbum);
  if (isAlbumNegligible(statlessAlbum)) {
    await hideAlbum(transaction, statlessAlbum);
    // await database.update(SQL`
    //     UPDATE "Album"
    //     SET "hidden" = TRUE
    //     WHERE "artist" = ${statlessAlbum.artist}
    //     AND "name" = ${statlessAlbum.name}
    //   `);
    return;
  }
  await enqueue(
    lastfmQueue,
    'album:update:stats',
    statlessAlbum.artist + ' - ' + statlessAlbum.name,
    statlessAlbum,
    1,
  );
}
