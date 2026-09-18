import { sql, type Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';
import * as v from 'valibot';

import { type TagJustification, tagJustificationSchema } from '@ymh8/schemata';

const targetWeight = sql<number>`SUM(
  "Album"."playcount"::FLOAT / 1000
  * "Album"."listeners" / 100
  * "AlbumTag"."count"
)`;

const relatedWeight = sql<number>`SUM(
  "Album"."playcount"::FLOAT / 1000
  * "Album"."listeners" / 100
  * "second_tag"."count"
)`;

export default async function readTagJustificationContext(
  transaction: Transaction<DB>,
  tagName: string,
): Promise<TagJustification> {
  const target = await transaction
    .selectFrom('Album')
    .innerJoin('AlbumTag', (join) =>
      join
        .onRef('Album.artist', '=', 'AlbumTag.albumArtist')
        .onRef('Album.name', '=', 'AlbumTag.albumName'),
    )
    .where('AlbumTag.tagName', '=', tagName)
    .where('Album.hidden', 'is not', true)
    .where('Album.artist', '<>', 'Various Artists')
    .select(targetWeight.as('weight'))
    .executeTakeFirstOrThrow();

  if (typeof target.weight !== 'number' || !Number.isFinite(target.weight)) {
    throw new TypeError(
      `Could not calculate a finite weight for tag ${tagName}`,
    );
  }

  const [artists, adjacentTags] = await Promise.all([
    transaction
      .selectFrom('Album')
      .innerJoin('AlbumTag', (join) =>
        join
          .onRef('Album.artist', '=', 'AlbumTag.albumArtist')
          .onRef('Album.name', '=', 'AlbumTag.albumName'),
      )
      .where('AlbumTag.tagName', '=', tagName)
      .where('Album.hidden', 'is not', true)
      .where('Album.artist', '<>', 'Various Artists')
      .groupBy('Album.artist')
      .select('Album.artist as name')
      .orderBy(
        sql<number>`SUM(COALESCE("Album"."listeners", 0) * "AlbumTag"."count")`,
        'desc',
      )
      .limit(30)
      .execute(),
    transaction
      .selectFrom('Album')
      .innerJoin('AlbumTag as first_tag', (join) =>
        join
          .onRef('Album.artist', '=', 'first_tag.albumArtist')
          .onRef('Album.name', '=', 'first_tag.albumName'),
      )
      .innerJoin('AlbumTag as second_tag', (join) =>
        join
          .onRef('second_tag.albumArtist', '=', 'Album.artist')
          .onRef('second_tag.albumName', '=', 'Album.name'),
      )
      .innerJoin(
        'Tag as second_tag_tag',
        'second_tag_tag.name',
        'second_tag.tagName',
      )
      .where('first_tag.tagName', '=', tagName)
      .where('second_tag_tag.listUpdatedAt', 'is not', null)
      .where('second_tag_tag.name', '<>', tagName)
      .where('Album.hidden', 'is not', true)
      .where('Album.artist', '<>', 'Various Artists')
      .groupBy('second_tag.tagName')
      .having(sql<boolean>`${relatedWeight} IS NOT NULL`)
      .orderBy(sql`weight`, 'desc')
      .limit(10)
      .select(['second_tag.tagName as name', relatedWeight.as('weight')])
      .execute(),
  ]);

  const finiteAdjacentTags = adjacentTags.filter(
    (tag) => typeof tag.weight === 'number' && Number.isFinite(tag.weight),
  );
  const adjacentTagArtists = await Promise.all(
    finiteAdjacentTags.map((tag) =>
      transaction
        .selectFrom('Album')
        .innerJoin('AlbumTag as adjacent_tag', (join) =>
          join
            .onRef('Album.artist', '=', 'adjacent_tag.albumArtist')
            .onRef('Album.name', '=', 'adjacent_tag.albumName'),
        )
        .where('adjacent_tag.tagName', '=', tag.name)
        .where('Album.hidden', 'is not', true)
        .where('Album.artist', '<>', 'Various Artists')
        .groupBy('Album.artist')
        .select('Album.artist as name')
        .orderBy(
          sql<number>`SUM(COALESCE("Album"."listeners", 0) * "adjacent_tag"."count")`,
          'desc',
        )
        .limit(5)
        .execute(),
    ),
  );
  if (adjacentTagArtists.length !== finiteAdjacentTags.length) {
    throw new Error('Could not read artists for every adjacent tag');
  }

  return v.parse(tagJustificationSchema, {
    target_tag: { name: tagName, weight: target.weight },
    top_artists: artists.map((artist) => artist.name),
    adjacent_tags: finiteAdjacentTags.map((tag, index) => ({
      ...tag,
      top_artists:
        adjacentTagArtists[index]?.map((artist) => artist.name) ?? [],
    })),
  });
}
