import type { Job } from 'bullmq';
import TelegramBot from 'node-telegram-bot-api';
import { v4 as uuidv4 } from 'uuid';
import * as v from 'valibot';

import { enqueue, telegramQueue } from '@ymh8/queues';
import { type TelegramPost, telegramPostSchema } from '@ymh8/schemata';
import { environment } from '../environment.js';

const bot = new TelegramBot(environment.TELEGRAM_BOT_TOKEN);

export default async function post(job: Job<unknown>) {
  const { imageUrl, text } = v.parse(telegramPostSchema, job.data);
  await job.log(text);
  if (imageUrl) {
    try {
      await bot.sendPhoto(environment.TELEGRAM_CHAT_ID, imageUrl, {
        caption:
          text.length > 1023 ? text.slice(0, 1020) + String.raw`\.\.\.` : text,
        parse_mode: 'HTML',
      });
      return;
    } catch (error) {
      await enqueue(
        telegramQueue,
        'post',
        'error-' + uuidv4(),
        {
          text: `${error as Error}`,
        } satisfies TelegramPost,
        100,
      );
      await job.log((error as Error).message);
    }
  }
  await bot.sendMessage(
    environment.TELEGRAM_CHAT_ID,
    text.length > 4096 ? text.slice(0, 4093) + String.raw`\.\.\.` : text,
    {
      parse_mode: 'HTML',
    },
  );
}
