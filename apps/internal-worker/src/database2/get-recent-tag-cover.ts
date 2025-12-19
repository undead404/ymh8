import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

export default async function getRecentTagCover(
  transaction: Transaction<DB>,
  tagName: string,
) {
  const result = await transaction
    .selectFrom('TagListItem')
    .innerJoin('Album', (join) =>
      join
        .onRef('TagListItem.albumArtist', '=', 'Album.artist')
        .onRef('TagListItem.albumName', '=', 'Album.name'),
    )
    .where('TagListItem.tagName', '=', tagName)
    .where('Album.cover', 'is not', null)
    .where('Album.cover', '<>', '')
    .orderBy('TagListItem.updatedAt', 'desc')
    .orderBy('TagListItem.place', 'asc')
    .select(['Album.cover as cover'])
    .limit(1)
    .executeTakeFirst();

  return result?.cover || undefined;
}
