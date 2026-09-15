import type { Job } from 'bullmq';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { uk } from 'date-fns/locale/uk';
import * as v from 'valibot';

import { enqueue, telegramQueue } from '@ymh8/queues';
import { buildMetadataSchema, type TelegramPost } from '@ymh8/schemata';
import { escapeForTelegram } from '@ymh8/utils';
import { FRONTEND_FOLDER } from '../constants.js';
import { resolveNvmRuntime } from '../services/resolve-nvm-runtime.js';
import { runCommandInFolder } from '../utils/run-command-in-folder.js';

export default async function build(job: Job<unknown>) {
  const { triggerDateTime } = v.parse(buildMetadataSchema, job.data);

  const { yarnExecutable, nodeBinDirectory } =
    await resolveNvmRuntime(FRONTEND_FOLDER);

  await runCommandInFolder(
    FRONTEND_FOLDER,
    yarnExecutable,
    ['build', '--force'],
    {
      env: {
        ...process.env,
        PATH: `${nodeBinDirectory}:${process.env.PATH}`,
        JFROG_USER: 'isolated-bypass',
      },
    },
  );

  const triggerDate = triggerDateTime.slice(0, 10);
  const triggerDateTimeObject = parseISO(triggerDateTime);

  await enqueue(telegramQueue, 'post', `build-${triggerDate}`, {
    text: escapeForTelegram(
      `🛠️ Зібрано статичні файли за ${triggerDate}\n\n⏱️ Витрачено часу: ${formatDistanceToNow(
        triggerDateTimeObject,
        { locale: uk },
      )}`,
    ),
  } satisfies TelegramPost);
}
