import * as v from 'valibot';

import { nonEmptyString } from '@ymh8/schemata';
import { environment } from '../environment.js';

const errorResponseSchema = v.object({
  error: v.number(),
  message: nonEmptyString,
});

export default async function queryLastfm<T1, T2 extends { method: string }>(
  schema: v.BaseSchema<unknown, T1, v.BaseIssue<unknown>>,
  parameters: T2,
): Promise<T1> {
  const url =
    'https://ws.audioscrobbler.com/2.0/?' +
    new URLSearchParams({
      api_key: environment.LASTFM_API_KEY,
      autocorrect: '0',
      format: 'json',
      ...parameters,
    }).toString();
  console.log(url);
  const response = await fetch(url, {
    signal: AbortSignal.timeout(60_000),
  });
  const data = (await response.json()) as unknown;
  // console.log(data);
  try {
    return v.parse(schema, data);
  } catch (error) {
    const result = v.safeParse(errorResponseSchema, data);
    if (!result.success) {
      throw error;
    }
    if (result.output.message) {
      throw new Error(result.output.message);
    }
    throw error;
  }
}
