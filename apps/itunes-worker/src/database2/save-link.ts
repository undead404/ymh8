import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import type { BareAlbum } from '@ymh8/schemata';

export default function saveLink(
  trx: Transaction<DB>,
  album: BareAlbum,
  update: {
    pageUrl: string;
    url: string;
  },
) {
  return trx
    .insertInto('AlbumLink')
    .values([
      {
        albumArtist: album.artist,
        albumName: album.name,
        type: 'itunes_preview',
        ...update,
      },
    ])
    .onConflict((oc) =>
      oc
        .column('albumArtist')
        .column('albumName')
        .column('type')
        .doUpdateSet({
          url: (eb) => eb.ref('excluded.url'),
        }),
    )
    .execute();
}
