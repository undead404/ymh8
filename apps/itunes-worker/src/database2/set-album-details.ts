import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import type { BareAlbum } from '@ymh8/schemata';

import type getAlbumDetails from './get-album-details.js';

type AlbumDetails = Awaited<ReturnType<typeof getAlbumDetails>>;

export default async function setAlbumDetails(
  transaction: Transaction<DB>,
  album: BareAlbum,
  oldDetails: AlbumDetails,
  details: AlbumDetails,
) {
  const patch: Partial<AlbumDetails> = {};

  // 1. Determine Date Update
  const isDateBetter =
    details.date &&
    (!oldDetails.date || details.date.length > oldDetails.date.length);
  if (isDateBetter) {
    patch.date = details.date;
  }

  // 2. Determine Tracks Update
  const isTracksNew = details.numberOfTracks && !oldDetails.numberOfTracks;
  if (isTracksNew) {
    patch.numberOfTracks = details.numberOfTracks;
  }

  // 3. Execute only if needed
  if (Object.keys(patch).length > 0) {
    await transaction
      .updateTable('Album')
      .set(patch)
      .where('artist', '=', album.artist)
      .where('name', '=', album.name)
      .execute();

    return patch;
  }
}
