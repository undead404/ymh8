import dotenv from 'dotenv';
import * as v from 'valibot';

import { nonEmptyString } from '@ymh8/schemata';

dotenv.config();

const environmentSchema = v.object({
  DB: nonEmptyString,
  DB_USER: nonEmptyString,
  DB_PASSWORD: nonEmptyString,
  LASTFM_API_KEY: nonEmptyString,
  TELEGRAM_BOT_TOKEN: nonEmptyString,
  TELEGRAM_CHAT_ID: nonEmptyString,
});

export const environment = v.parse(environmentSchema, process.env);
