import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import type { BareAlbum } from '@ymh8/schemata';

export default function removeTagsFromAlbum(
  transaction: Transaction<DB>,
  album: BareAlbum,
  tagsToRemove: string[],
) {
  return transaction
    .deleteFrom('AlbumTag')
    .where('albumArtist', '=', album.artist)
    .where('albumName', '=', album.name)
    .where('tagName', 'in', tagsToRemove)
    .execute();
}
