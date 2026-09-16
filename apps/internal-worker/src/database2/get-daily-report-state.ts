import { type Kysely, sql } from 'kysely';
import type { DB } from 'kysely-codegen';

export interface DailyReportWindow {
  start: Date;
  end: Date;
}

export interface QueueBacklog {
  active: number;
  prioritized: number;
  waiting: number;
}

export interface DailyReportState {
  current: {
    albums: number;
    tags: number;
    tagsWithLists: number;
    albumsInAtLeastOneList: number;
    pendingStats: number;
    pendingTags: number;
    overdueStats: number;
    overdueTags: number;
  };
  activity: {
    albumsRegistered: number;
    hiddenAlbumsRegistered: number;
    statsUpdated: number;
    tagsUpdated: number;
    itunesChecked: number;
    albumsWithItunesPreview: number;
    tagAlbumsScraped: number;
    listsChanged: number;
    listsUnchanged: number;
    topRegisteredAlbums: Array<{
      artist: string;
      name: string;
      playcount: number;
    }>;
  };
}

function withinWindow(column: string, { start, end }: DailyReportWindow) {
  return sql<number>`COUNT(*) FILTER (
    WHERE ${sql.ref(column)} >= ${start}
      AND ${sql.ref(column)} < ${end}
  )`;
}

export default async function getDailyReportState(
  database: Kysely<DB>,
  window: DailyReportWindow,
): Promise<DailyReportState> {
  const [albums, tags] = await Promise.all([
    database
      .selectFrom('Album')
      .select(({ fn }) => [
        fn.count<number>('artist').as('albums'),
        fn
          .count<number>('artist')
          .filterWhere('statsUpdatedAt', 'is', null)
          .filterWhere('hidden', 'is not', true)
          .as('pendingStats'),
        fn
          .count<number>('artist')
          .filterWhere('tagsUpdatedAt', 'is', null)
          .filterWhere('hidden', 'is not', true)
          .as('pendingTags'),
        fn
          .count<number>('artist')
          .filterWhere('nextStatsUpdateAt', '<=', sql<Date>`NOW()`)
          .filterWhere('hidden', 'is not', true)
          .as('overdueStats'),
        fn
          .count<number>('artist')
          .filterWhere('hidden', 'is not', true)
          .filterWhere('nextTagsUpdateAt', '<=', sql<Date>`NOW()`)
          .as('overdueTags'),
        withinWindow('registeredAt', window).as('albumsRegistered'),
        sql<number>`COUNT(*) FILTER (
          WHERE "registeredAt" >= ${window.start}
            AND "registeredAt" < ${window.end}
            AND "hidden" = true
        )`.as('hiddenAlbumsRegistered'),
        withinWindow('statsUpdatedAt', window).as('statsUpdated'),
        withinWindow('tagsUpdatedAt', window).as('tagsUpdated'),
        withinWindow('itunesCheckedAt', window).as('itunesChecked'),
      ])
      .executeTakeFirstOrThrow(),
    database
      .selectFrom('Tag')
      .select(({ fn }) => [
        fn.count<number>('name').as('tags'),
        fn
          .count<number>('name')
          .filterWhere('listUpdatedAt', 'is not', null)
          .as('tagsWithLists'),
        withinWindow('registeredAt', window).as('tagsRegistered'),
        withinWindow('albumsScrapedAt', window).as('tagAlbumsScraped'),
        withinWindow('listUpdatedAt', window).as('listsChanged'),
        fn
          .count<number>('name')
          .filterWhere('listCheckedAt', '>=', window.start)
          .filterWhere('listCheckedAt', '<', window.end)
          .filterWhere((expression) =>
            expression.or([
              expression('listUpdatedAt', 'is', null),
              expression('listUpdatedAt', '<', window.start),
            ]),
          )
          .as('listsUnchanged'),
      ])
      .executeTakeFirstOrThrow(),
  ]);

  const [listAlbums, itunes, topRegisteredAlbums] = await Promise.all([
    database
      .selectFrom('TagListItem')
      .innerJoin('Album', (join) =>
        join
          .onRef('TagListItem.albumArtist', '=', 'Album.artist')
          .onRef('TagListItem.albumName', '=', 'Album.name'),
      )
      .select(
        sql<number>`COUNT(DISTINCT ("Album"."artist", "Album"."name"))`.as(
          'albumsInAtLeastOneList',
        ),
      )
      .executeTakeFirstOrThrow(),
    database
      .selectFrom('Album')
      .innerJoin('AlbumLink', (join) =>
        join
          .onRef('Album.artist', '=', 'AlbumLink.albumArtist')
          .onRef('Album.name', '=', 'AlbumLink.albumName'),
      )
      .select(
        sql<number>`COUNT(DISTINCT ("Album"."artist", "Album"."name"))`.as(
          'albumsWithItunesPreview',
        ),
      )
      .where('Album.itunesCheckedAt', '>=', window.start)
      .where('Album.itunesCheckedAt', '<', window.end)
      .where('AlbumLink.type', '=', 'itunes_preview')
      .executeTakeFirstOrThrow(),
    database
      .selectFrom('Album')
      .select(['artist', 'name', 'playcount'])
      .where('registeredAt', '>=', window.start)
      .where('registeredAt', '<', window.end)
      .where('playcount', 'is not', null)
      .orderBy('playcount', 'desc')
      .orderBy('artist', 'asc')
      .orderBy('name', 'asc')
      .limit(3)
      .execute(),
  ]);

  return {
    current: {
      albums: Number(albums.albums),
      tags: Number(tags.tags),
      tagsWithLists: Number(tags.tagsWithLists),
      albumsInAtLeastOneList: Number(listAlbums.albumsInAtLeastOneList),
      pendingStats: Number(albums.pendingStats),
      pendingTags: Number(albums.pendingTags),
      overdueStats: Number(albums.overdueStats),
      overdueTags: Number(albums.overdueTags),
    },
    activity: {
      albumsRegistered: Number(albums.albumsRegistered),
      hiddenAlbumsRegistered: Number(albums.hiddenAlbumsRegistered),
      statsUpdated: Number(albums.statsUpdated),
      tagsUpdated: Number(albums.tagsUpdated),
      itunesChecked: Number(albums.itunesChecked),
      albumsWithItunesPreview: Number(itunes.albumsWithItunesPreview),
      tagAlbumsScraped: Number(tags.tagAlbumsScraped),
      listsChanged: Number(tags.listsChanged),
      listsUnchanged: Number(tags.listsUnchanged),
      topRegisteredAlbums: topRegisteredAlbums.map(
        ({ artist, name, playcount }) => ({
          artist,
          name,
          playcount: Number(playcount),
        }),
      ),
    },
  };
}
