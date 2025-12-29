import { sql, Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

export default function getNewTagListItems(
  transaction: Transaction<DB>,
  tagName: string,
) {
  return (
    transaction
      // 1. Helper CTE for the global average
      .with('GlobalStats', (qb) =>
        qb
          .selectFrom('Album')
          .where('numberOfTracks', 'is not', null)
          .select(sql<number>`AVG("numberOfTracks")`.as('avg')),
      )
      // 2. The Inner Subquery (X)
      .selectFrom(
        (eb) =>
          eb
            .selectFrom('AlbumTag')
            .innerJoin('Album', (join) =>
              join
                .onRef('Album.artist', '=', 'AlbumTag.albumArtist')
                .onRef('Album.name', '=', 'AlbumTag.albumName'),
            )
            .where('Album.hidden', 'is not', true)
            .where('AlbumTag.count', '>', 0)
            .where('AlbumTag.tagName', '=', tagName)
            .select([
              'Album.artist',
              'Album.name',
              // The Weight Calculation
              // referencing (SELECT avg FROM "GlobalStats") simplifies the SQL string
              sql<number>`(
                COALESCE("Album"."playcount", 0)::NUMERIC
                / COALESCE(
                    CASE WHEN "Album"."numberOfTracks" = 0 THEN 1 ELSE "Album"."numberOfTracks" END,
                    (SELECT avg FROM "GlobalStats")
                )
                * COALESCE("Album"."listeners", 0)
                / COALESCE(
                    CASE WHEN "Album"."numberOfTracks" = 0 THEN 1 ELSE "Album"."numberOfTracks" END,
                    (SELECT avg FROM "GlobalStats")
                )
              )
              * "AlbumTag"."count"::NUMERIC / 100`.as('weight'),
            ])
            .orderBy(sql`weight`, 'desc')
            .limit(100)
            .as('X'), // This defines the alias "X" for the subquery
      )
      // 3. The Outer Select
      .select([
        'artist as albumArtist',
        'name as albumName',
        sql<number>`(ROW_NUMBER() OVER (ORDER BY "weight" DESC))::INT`.as(
          'place',
        ),
      ])
      .execute()
  );
}
