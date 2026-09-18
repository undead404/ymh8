import type { Job } from 'bullmq';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { uk } from 'date-fns/locale/uk';
import * as v from 'valibot';

import { enqueue, telegramQueue } from '@ymh8/queues';
import { buildMetadataSchema, type TelegramPost } from '@ymh8/schemata';
import { escapeForTelegram } from '@ymh8/utils';
import { FRONTEND_FOLDER } from '../constants.js';
import { environment } from '../environment.js';
import { resolveNvmRuntime } from '../services/resolve-nvm-runtime.js';
import { runCommandInFolder } from '../utils/run-command-in-folder.js';

export default async function deploy(job: Job<unknown>) {
  const { triggerDateTime } = v.parse(buildMetadataSchema, job.data);

  const { nodeExecutable, yarnExecutable, nodeBinDirectory } =
    await resolveNvmRuntime(FRONTEND_FOLDER);

  const childEnvironment = {
    ...process.env,
    PATH: `${nodeBinDirectory}:${process.env.PATH}`,
    JFROG_USER: 'isolated-bypass',
    CLOUDFLARE_API_TOKEN: environment.CLOUDFLARE_API_TOKEN,
  };

  const probeScript = `
    (async () => {
    const dnsModule = await import('node:dns');
    const dns = dnsModule.promises;
    const { getDefaultResultOrder } = dnsModule;
    const hosts = ['api.cloudflare.com', 'dash.cloudflare.com'];
    const result = {
      node: process.version,
      execPath: process.execPath,
      cwd: process.cwd(),
      defaultDnsResultOrder: getDefaultResultOrder(),
      envKeys: Object.keys(process.env).sort(),
    };
    for (const host of hosts) {
      result[host] = {};
      for (const operation of ['lookup', 'resolve4', 'resolve6']) {
        try {
          result[host][operation] = await dns[operation](host);
        } catch (error) {
          result[host][operation] = {
            code: error.code,
            message: error.message,
          };
        }
      }
    }
    for (const url of ['https://api.cloudflare.com/client/v4/user', 'https://dash.cloudflare.com']) {
      try {
        const response = await fetch(url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(10000),
        });
        result[url] = { status: response.status, headers: [...response.headers.keys()] };
      } catch (error) {
        result[url] = {
          name: error.name,
          code: error.code,
          causeCode: error.cause?.code,
          message: error.message,
        };
      }
    }
    console.log(JSON.stringify(result, null, 2));
    })().catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
  `;

  try {
    await runCommandInFolder(
      FRONTEND_FOLDER,
      nodeExecutable,
      ['-e', probeScript],
      {
        env: childEnvironment,
      },
    );
  } catch (error) {
    console.error('[deploy] child runtime probe failed', error);
  }

  await runCommandInFolder(FRONTEND_FOLDER, yarnExecutable, ['deploy'], {
    env: childEnvironment,
  });

  const triggerDate = triggerDateTime.slice(0, 10);
  const triggerDateTimeObject = parseISO(triggerDateTime);

  await enqueue(telegramQueue, 'post', `deploy-${triggerDate}`, {
    text: escapeForTelegram(
      `🚀 Розгорнуто статичні файли за ${triggerDate}\n\n⏱️ Витрачено часу: ${formatDistanceToNow(
        triggerDateTimeObject,
        { locale: uk },
      )}`,
    ),
  } satisfies TelegramPost);
}
