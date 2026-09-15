import {
  enqueue,
  internalQueue,
  itunesQueue,
  lastfmQueue,
  llmQueue,
  telegramQueue,
} from '@ymh8/queues';
import type { TelegramPost } from '@ymh8/schemata';
import kysely from '../../database2/index.js';
import checkSystemHealth from '../../services/check-system-health.js';

import addInternalWork from './internal.js';
import addItunesWork from './itunes.js';
import addLastfmWork from './lastfm.js';
import addLlmWork from './llm.js';

export default async function addWork() {
  // 1. Concurrent evaluation of all physical hardware constraints
  const { isThermallyThrottled, isCpuSaturated } = await checkSystemHealth();

  // Deterministic, timezone-agnostic idempotency key prefix (YYYY-MM-DDTHH)
  const hourEpoch = new Date().toISOString().slice(0, 13);

  if (isThermallyThrottled) {
    await enqueue(telegramQueue, 'post', `throttle-${hourEpoch}`, {
      text: `Перегрів. Даємо апаратурі відпочити.`,
    } satisfies TelegramPost);
    return;
  }

  if (isCpuSaturated) {
    await enqueue(telegramQueue, 'post', `cpu-${hourEpoch}`, {
      text: `Compute saturated. Workload deferred.`,
    } satisfies TelegramPost);
    return;
  }

  return kysely.transaction().execute(async (trx) => ({
    [internalQueue.name]: await addInternalWork(trx),
    [itunesQueue.name]: await addItunesWork(trx),
    [lastfmQueue.name]: await addLastfmWork(trx),
    [llmQueue.name]: await addLlmWork(trx),
  }));
}
