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
    lists: number;
    pendingStats: number;
    pendingTags: number;
    pendingItunes: number;
    overdueStats: number;
    overdueTags: number;
  };
  activity: {
    albumsRegistered: number;
    statsUpdated: number;
    tagsUpdated: number;
    itunesChecked: number;
    tagAlbumsScraped: number;
    listsChanged: number;
    listsUnchanged: number;
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
          .as('pendingStats'),
        fn
          .count<number>('artist')
          .filterWhere('tagsUpdatedAt', 'is', null)
          .as('pendingTags'),
        fn
          .count<number>('artist')
          .filterWhere('itunesCheckedAt', 'is', null)
          .as('pendingItunes'),
        fn
          .count<number>('artist')
          .filterWhere('nextStatsUpdateAt', '<', sql<Date>`NOW()`)
          .as('overdueStats'),
        fn
          .count<number>('artist')
          .filterWhere('nextTagsUpdateAt', '<', sql<Date>`NOW()`)
          .as('overdueTags'),
        withinWindow('registeredAt', window).as('albumsRegistered'),
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
          .as('lists'),
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

  return {
    current: {
      albums: Number(albums.albums),
      tags: Number(tags.tags),
      lists: Number(tags.lists),
      pendingStats: Number(albums.pendingStats),
      pendingTags: Number(albums.pendingTags),
      pendingItunes: Number(albums.pendingItunes),
      overdueStats: Number(albums.overdueStats),
      overdueTags: Number(albums.overdueTags),
    },
    activity: {
      albumsRegistered: Number(albums.albumsRegistered),
      statsUpdated: Number(albums.statsUpdated),
      tagsUpdated: Number(albums.tagsUpdated),
      itunesChecked: Number(albums.itunesChecked),
      tagAlbumsScraped: Number(tags.tagAlbumsScraped),
      listsChanged: Number(tags.listsChanged),
      listsUnchanged: Number(tags.listsUnchanged),
    },
  };
}
