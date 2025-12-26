import type { Job } from 'bullmq';

import post from './post.js';

const operationsMapping: Record<
  string,
  (data: Job<unknown>) => Promise<unknown>
> = {
  post: post,
};

export default operationsMapping;
