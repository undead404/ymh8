import type { Job } from 'bullmq';

import enrich from './enrich.js';

const operationsMapping: Record<
  string,
  (data: Job<unknown>) => Promise<unknown>
> = {
  'album:enrich': enrich,
};

export default operationsMapping;
