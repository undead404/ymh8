import { createJobProcessor } from '@ymh8/queues';

import operationsMapping from './operations/index.js';

// export default async function processJob(job: Job): Promise<unknown> {
//   //   console.log(operationsMapping);
//   // await writeFile('job.json', JSON.stringify(job, null, 2));
//   for (const [prefix, operate] of Object.entries(operationsMapping)) {
//     if (job.name.startsWith(prefix)) {
//       return operate(job.data);
//     }
//   }
//   throw new Error('No operation to handle this job');
// }

const processJob = createJobProcessor(operationsMapping);

export default processJob;
