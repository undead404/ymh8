import dotenv from 'dotenv';
import * as v from 'valibot';

import { nonEmptyString } from '@ymh8/schemata';

dotenv.config();

const environmentSchema = v.object({
  DB: nonEmptyString,
  DB_USER: nonEmptyString,
  DB_PASSWORD: nonEmptyString,
  DISCOGS_CONSUMER_KEY: nonEmptyString,
  DISCOGS_CONSUMER_SECRET: nonEmptyString,
});

export const environment = v.parse(environmentSchema, process.env);
