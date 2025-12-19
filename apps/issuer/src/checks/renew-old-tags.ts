import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import { hideAlbum } from '@ymh8/database';
import { enqueue, lastfmQueue } from '@ymh8/queues';
import { isAlbumNegligible } from '@ymh8/utils';
import findOldTagsAlbum from '../database2/find-old-tags-album.js';

export default async function renewOldTags(transaction: Transaction<DB>) {
  // const oldTagsAlbum = await findOldTagsBareAlbum();
  const oldTagsAlbum = await findOldTagsAlbum(transaction);
  if (oldTagsAlbum) {
    console.log('oldTagsAlbum', oldTagsAlbum);
    if (isAlbumNegligible(oldTagsAlbum)) {
      // await database.update(SQL`
      //   UPDATE "Album"
      //   SET "hidden" = TRUE
      //   WHERE "artist" = ${oldTagsAlbum.artist}
      //   AND "name" = ${oldTagsAlbum.name}
      // `);
      await hideAlbum(transaction, oldTagsAlbum);
      return;
    }
    await enqueue(
      lastfmQueue,
      'album:update:tags',
      oldTagsAlbum.artist + ' - ' + oldTagsAlbum.name,
      oldTagsAlbum,
      1,
    );
  }
}
