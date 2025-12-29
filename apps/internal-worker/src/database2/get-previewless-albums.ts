import { type Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

export default function getPreviewlessAlbums(
  transaction: Transaction<DB>,
  limit: number,
) {
  return (
    transaction
      // .selectFrom('TagListItem')
      // .innerJoin('Album', (join) =>
      //   join
      //     .onRef('TagListItem.albumArtist', '=', 'Album.artist')
      //     .onRef('TagListItem.albumName', '=', 'Album.name'),
      // )
      // .leftJoin('AlbumLink', (join) =>
      //   join
      //     .onRef('Album.artist', '=', 'AlbumLink.albumArtist')
      //     .onRef('Album.name', '=', 'AlbumLink.albumName'),
      // )
      // .where('AlbumLink.url', 'is', null)
      // .where('Album.itunesCheckedAt', 'is', null)
      // .groupBy(['Album.artist', 'Album.name'])
      // .select(['Album.artist', 'Album.name'])
      // .orderBy(sql<string>`MIN("TagListItem"."updatedAt")`, 'asc')
      // .limit(limit)
      // .execute();
      .selectFrom('TagListItem')
      .innerJoin('Album', (join) =>
        join
          .onRef('TagListItem.albumArtist', '=', 'Album.artist')
          .onRef('TagListItem.albumName', '=', 'Album.name'),
      )
      .groupBy(['Album.artist', 'Album.name', 'Album.itunesCheckedAt'])
      .select(['Album.artist', 'Album.name'])
      .where('Album.itunesCheckedAt', 'is', null)
      .limit(limit)
      .execute()
  );
}
