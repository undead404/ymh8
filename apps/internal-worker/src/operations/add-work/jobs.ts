import type { BulkJobOptions, FlowJob, Queue } from 'bullmq';

import { generateJobId } from '@ymh8/queues';

export type WorkJob = {
  queue: Queue;
  name: string;
  data: unknown;
  opts?: BulkJobOptions;
};

export type WorkFlow = {
  flow: FlowJob;
};

export type Work = WorkJob | WorkFlow;

export type WorkSummary = Record<string, Record<string, number>>;

export function createWorkJob(
  queue: Queue,
  name: string,
  identity: string,
  data: unknown,
  priority?: number,
): WorkJob {
  const jobId = generateJobId(name, identity);
  return {
    queue,
    name,
    data,
    opts: {
      jobId,
      deduplication: { id: jobId },
      ...(priority === undefined ? {} : { priority }),
    },
  };
}

export function summarizeWork(work: Work[]): WorkSummary {
  const summary: WorkSummary = {};

  function add(queueName: string, jobName: string) {
    const queueSummary = (summary[queueName] ??= {});
    queueSummary[jobName] = (queueSummary[jobName] ?? 0) + 1;
  }

  function visitFlow(flow: FlowJob) {
    add(flow.queueName, flow.name);
    for (const child of flow.children ?? []) {
      visitFlow(child);
    }
  }

  for (const item of work) {
    if ('flow' in item) {
      visitFlow(item.flow);
    } else {
      add(item.queue.name, item.name);
    }
  }
  return summary;
}
