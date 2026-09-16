import type { Job } from 'bullmq';
import * as v from 'valibot';

import {
  discogsQueue,
  enqueue,
  internalQueue,
  itunesQueue,
  lastfmQueue,
  llmQueue,
  telegramQueue,
} from '@ymh8/queues';
import type { TelegramPost } from '@ymh8/schemata';
import getDailyReportState, {
  type DailyReportState,
} from '../database2/get-daily-report-state.js';
import kysely from '../database2/index.js';

const emptyPayloadSchema = v.object({});

async function getQueueBacklogs() {
  const queues = [
    discogsQueue,
    internalQueue,
    itunesQueue,
    lastfmQueue,
    llmQueue,
    telegramQueue,
  ];
  const entries = await Promise.all(
    queues.map(async (queue) => {
      const counts = await queue.getJobCounts('wait', 'active', 'prioritized');
      return [
        queue.name,
        {
          active: counts.active ?? 0,
          prioritized: counts.prioritized ?? 0,
          waiting: counts.wait ?? 0,
        },
      ] as const;
    }),
  );
  return Object.fromEntries(entries);
}

const numberFormatter = new Intl.NumberFormat('uk-UA');

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatQueueBacklogs(
  backlogs: Record<
    string,
    {
      active: number;
      prioritized: number;
      waiting: number;
    }
  >,
) {
  return Object.entries(backlogs)
    .map(([name, counts]) => {
      const total = counts.active + counts.prioritized + counts.waiting;
      return `${name}: ${formatNumber(total)}`;
    })
    .join(', ');
}

function formatPercentage(value: number, total: number) {
  return new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 1 }).format(
    total === 0 ? 0 : (value / total) * 100,
  );
}

export function formatDailyReport(
  state: DailyReportState,
  backlogs: Record<
    string,
    {
      active: number;
      prioritized: number;
      waiting: number;
    }
  >,
) {
  const { activity, current } = state;
  const topAlbums = activity.topRegisteredAlbums.map(
    ({ artist, name, playcount }, index) =>
      `${index + 1}. ${artist} — ${name}: ${formatNumber(playcount)}`,
  );
  const hiddenAlbums = `Серед них прихованих: ${formatNumber(activity.hiddenAlbumsRegistered)}`;
  return [
    '📊 <b>Щоденний звіт You Must Hear</b>',
    '',
    '<b>Поточний стан</b>',
    `Альбоми: ${formatNumber(current.albums)}`,
    `Теги: ${formatNumber(current.tags)}`,
    `Теги зі списками: ${formatNumber(current.tagsWithLists)}`,
    `Альбоми хоча б в одному списку: ${formatNumber(current.albumsInAtLeastOneList)}`,
    `У чергах: ${formatQueueBacklogs(backlogs)}`,
    `Очікують статистики / тегів: ${formatNumber(current.pendingStats)} / ${formatNumber(current.pendingTags)}`,
    `Прострочені оновлення статистики / тегів: ${formatNumber(current.overdueStats)} / ${formatNumber(current.overdueTags)}`,
    '',
    '<b>За останні 24 години</b>',
    `Зареєстровано альбомів: ${formatNumber(activity.albumsRegistered)}`,
    activity.albumsRegistered === 0
      ? hiddenAlbums
      : `${hiddenAlbums} (${formatPercentage(activity.hiddenAlbumsRegistered, activity.albumsRegistered)}%)`,
    ...(topAlbums.length > 0
      ? ['Найпопулярніші зареєстровані:', ...topAlbums]
      : []),
    `Оновлено статистику / теги: ${formatNumber(activity.statsUpdated)} / ${formatNumber(activity.tagsUpdated)}`,
    `Перевірено в iTunes: ${formatNumber(activity.itunesChecked)}`,
    `Альбомів із iTunes-прев’ю: ${formatNumber(activity.albumsWithItunesPreview)}`,
    `Зібрано альбомів для тегів: ${formatNumber(activity.tagAlbumsScraped)}`,
    `Змінено списків: ${formatNumber(activity.listsChanged)}`,
    `Списків без змін: ${formatNumber(activity.listsUnchanged)}`,
  ].join('\n');
}

export default async function dailyReport(job: Job<unknown>) {
  v.parse(emptyPayloadSchema, job.data);

  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  const [state, backlogs] = await Promise.all([
    getDailyReportState(kysely, { start, end }),
    getQueueBacklogs(),
  ]);
  const text = formatDailyReport(state, backlogs);
  const periodIdentity = `daily-report-${end.toISOString().slice(0, 10)}`;

  await enqueue(telegramQueue, 'post', periodIdentity, {
    text,
  } satisfies TelegramPost);
}
