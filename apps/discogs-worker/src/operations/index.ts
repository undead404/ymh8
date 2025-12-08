import enrich from './enrich.js';

const operationsMapping: Record<string, (data: unknown) => Promise<unknown>> = {
  'album:enrich': enrich,
};

export default operationsMapping;
