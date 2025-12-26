import type { Job } from 'bullmq';

import generateTagDescription from './generate-tag-description.js';

const operationsMapping: Record<
  string,
  (job: Job<unknown>) => Promise<unknown>
> = {
  'tag:description:generate': generateTagDescription,
};

export default operationsMapping;
