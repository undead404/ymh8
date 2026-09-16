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
      return `${name}: ${total}`;
    })
    .join(', ');
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
  return [
    '📊 <b>Щоденний звіт You Must Hear</b>',
    '',
    '<b>Поточний стан</b>',
    `Альбоми: ${current.albums}`,
    `Теги: ${current.tags}`,
    `Списки: ${current.lists}`,
    `У чергах: ${formatQueueBacklogs(backlogs)}`,
    `Очікують статистики / тегів / iTunes: ${current.pendingStats} / ${current.pendingTags} / ${current.pendingItunes}`,
    `Прострочені оновлення статистики / тегів: ${current.overdueStats} / ${current.overdueTags}`,
    '',
    '<b>За останні 24 години</b>',
    `Зареєстровано альбомів: ${activity.albumsRegistered}`,
    `Оновлено статистику / теги: ${activity.statsUpdated} / ${activity.tagsUpdated}`,
    `Перевірено в iTunes: ${activity.itunesChecked}`,
    `Зібрано альбомів для тегів: ${activity.tagAlbumsScraped}`,
    `Змінено списків: ${activity.listsChanged}`,
    `Списків без змін: ${activity.listsUnchanged}`,
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
