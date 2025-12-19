import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import type { BareAlbum, BareTag } from '@ymh8/schemata';

export default function upsertAlbumTags(
  transaction: Transaction<DB>,
  album: BareAlbum,
  tags: (BareTag & { count: number })[],
) {
  return transaction
    .insertInto('AlbumTag')
    .values(
      tags.map((tag) => ({
        albumArtist: album.artist,
        albumName: album.name,
        tagName: tag.name,
        count: tag.count,
      })),
    )
    .onConflict((oc) =>
      oc
        .column('albumArtist')
        .column('albumName')
        .column('tagName')
        .doUpdateSet({
          count: (eb) => eb.ref('excluded.count'),
        }),
    )
    .execute();
}
