import type { Job } from 'bullmq';

import scrapeLink from './scrape-link.js';

const operationsMapping: Record<
  string,
  (data: Job<unknown>) => Promise<unknown>
> = {
  'album:preview:scrape': scrapeLink,
};

export default operationsMapping;
