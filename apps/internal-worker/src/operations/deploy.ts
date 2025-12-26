import type { Job } from 'bullmq';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { uk } from 'date-fns/locale/uk';
import * as v from 'valibot';

import { enqueue, telegramQueue } from '@ymh8/queues';
import { buildMetadataSchema, type TelegramPost } from '@ymh8/schemata';
import { escapeForTelegram } from '@ymh8/utils';
import { FRONTEND_FOLDER } from '../constants.js';
import { runCommandInFolder } from '../utils/run-command-in-folder.js';

export default async function deploy(job: Job<unknown>) {
  const { triggerDateTime } = v.parse(buildMetadataSchema, job.data);
  await runCommandInFolder(FRONTEND_FOLDER, 'bash', [
    '-lc',
    'source "$NVM_DIR/nvm.sh" || source ~/.nvm/nvm.sh; nvm use && yarn deploy',
  ]);
  const triggerDate = triggerDateTime.slice(0, 10);
  const triggerDateTimeObject = parseISO(triggerDateTime);
  await enqueue(telegramQueue, 'post', 'deploy-' + triggerDate, {
    text: escapeForTelegram(
      '🚀 Розгорнуто статичні файли за ' +
        triggerDate +
        '\n\n⏱️ Витрачено часу: ' +
        formatDistanceToNow(triggerDateTimeObject, { locale: uk }),
    ),
  } satisfies TelegramPost);
}
