import dotenv from 'dotenv';
import * as v from 'valibot';

import { nonEmptyString } from '@ymh8/schemata';

dotenv.config();

const environmentSchema = v.object({
  CLOUDFLARE_API_TOKEN: nonEmptyString,
  DB: nonEmptyString,
  DB_USER: nonEmptyString,
  DB_PASSWORD: nonEmptyString,
  // LATITUDE: v.pipe(v.string(), v.decimal(), v.toNumber()),
  // LONGITUDE: v.pipe(v.string(), v.decimal(), v.toNumber()),
});

// console.log(process.env);

export const environment = v.parse(environmentSchema, process.env);
