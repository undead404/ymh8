import {
  internalQueue,
  itunesQueue,
  lastfmQueue,
  llmQueue,
} from '@ymh8/queues';
import kysely from '../../database2/index.js';

import addInternalWork from './internal.js';
import addItunesWork from './itunes.js';
import addLastfmWork from './lastfm.js';
import addLlmWork from './llm.js';

export default function addWork() {
  return kysely.transaction().execute(async (trx) => ({
    [internalQueue.name]: await addInternalWork(trx),
    [itunesQueue.name]: await addItunesWork(trx),
    [lastfmQueue.name]: await addLastfmWork(trx),
    [llmQueue.name]: await addLlmWork(trx),
  }));
}
