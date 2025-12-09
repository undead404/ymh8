import TelegramBot from 'node-telegram-bot-api';

import { environment } from './environment.js';

const bot = new TelegramBot(environment.TELEGRAM_BOT_TOKEN);

export default async function postToTelegram(
  message: string,
  imageUrl?: string,
) {
  if (imageUrl) {
    await bot.sendPhoto(environment.TELEGRAM_CHAT_ID, imageUrl, {
      caption: message.slice(0, 1024),
      parse_mode: 'MarkdownV2',
    });
    return;
  }
  await bot.sendMessage(environment.TELEGRAM_CHAT_ID, message.slice(0, 4096), {
    parse_mode: 'MarkdownV2',
  });
}
