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
  if (
    details.date &&
    (!oldDetails.date || details.date.length > oldDetails.date.length)
  ) {
    if (details.numberOfTracks && !oldDetails.numberOfTracks) {
      const update = {
        date: details.date,
        numberOfTracks: details.numberOfTracks,
      };
      await transaction
        .updateTable('Album')
        .set(update)
        .where('artist', '=', album.artist)
        .where('name', '=', album.name)
        .execute();
      return update;
    } else {
      const update = {
        date: details.date,
      };
      await transaction
        .updateTable('Album')
        .set(update)
        .where('artist', '=', album.artist)
        .where('name', '=', album.name)
        .execute();
      return update;
    }
  } else {
    if (details.numberOfTracks && !oldDetails.numberOfTracks) {
      const update = {
        numberOfTracks: details.numberOfTracks,
      };
      await transaction
        .updateTable('Album')
        .set(update)
        .where('artist', '=', album.artist)
        .where('name', '=', album.name)
        .execute();
      return update;
    }
  }
}
