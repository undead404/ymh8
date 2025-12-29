import { createJobProcessor } from '@ymh8/queues';

import operationsMapping from './operations/index.js';

const processJob = createJobProcessor(operationsMapping, 6000);

export default processJob;
