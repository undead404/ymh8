import { FlowProducer } from 'bullmq';

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
import getQueueCapacity from '../../utils/get-queue-capacity.js';

import addInternalWork from './internal.js';
import addItunesWork from './itunes.js';
import { summarizeWork, type Work, type WorkJob } from './jobs.js';
import addLastfmWork from './lastfm.js';
import addLlmWork from './llm.js';

const flowProducer = new FlowProducer({
  connection: internalQueue.opts.connection,
});

async function enqueueWork(work: Work[]) {
  const queueJobs = new Map<WorkJob['queue'], WorkJob[]>();
  for (const item of work) {
    if ('flow' in item) {
      await flowProducer.add(item.flow);
      continue;
    }
    const jobs = queueJobs.get(item.queue) ?? [];
    jobs.push(item);
    queueJobs.set(item.queue, jobs);
  }
  await Promise.all(
    [...queueJobs].map(([queue, jobs]) =>
      queue.addBulk(
        jobs.map(({ name, data, opts }) =>
          opts === undefined ? { name, data } : { name, data, opts },
        ),
      ),
    ),
  );
}

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

  const [internalCapacity, itunesCapacity, lastfmCapacity, llmCapacity] =
    await Promise.all([
      getQueueCapacity(internalQueue, 100),
      getQueueCapacity(itunesQueue, 3000),
      getQueueCapacity(lastfmQueue, 5000),
      getQueueCapacity(llmQueue, 60),
    ]);
  const work = await kysely.transaction().execute(async (trx) => {
    const jobs = await Promise.all([
      addInternalWork(trx, internalCapacity),
      addItunesWork(trx, itunesCapacity),
      addLastfmWork(trx, lastfmCapacity),
      addLlmWork(trx, llmCapacity),
    ]);
    return jobs.flat();
  });
  const summary = summarizeWork(work);
  await enqueueWork(work);
  return summary;
}
