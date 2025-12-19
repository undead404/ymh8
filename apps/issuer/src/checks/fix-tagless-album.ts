import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import { hideAlbum } from '@ymh8/database';
import { enqueue, lastfmQueue } from '@ymh8/queues';
import { isAlbumNegligible } from '@ymh8/utils';
import findTaglessAlbum from '../database2/find-tagless-album.js';

export default async function fixTaglessAlbum(transaction: Transaction<DB>) {
  // const taglessAlbum = await findTaglessAlbum();
  const taglessAlbum = await findTaglessAlbum(transaction);
  if (!taglessAlbum) {
    return;
  }
  console.log('taglessAlbum', taglessAlbum);
  if (isAlbumNegligible(taglessAlbum)) {
    // await database.update(SQL`
    //     UPDATE "Album"
    //     SET "hidden" = TRUE
    //     WHERE "artist" = ${taglessAlbum.artist}
    //     AND "name" = ${taglessAlbum.name}
    //   `);
    await hideAlbum(transaction, taglessAlbum);
    return;
  }
  await enqueue(
    lastfmQueue,
    'album:update:tags',
    taglessAlbum.artist + ' - ' + taglessAlbum.name,
    taglessAlbum,
    1,
  );
}
