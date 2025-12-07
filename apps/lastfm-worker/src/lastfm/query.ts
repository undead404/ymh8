import * as v from 'valibot';

import { nonEmptyString } from '@ymh8/schemata';
import { environment } from '../environment.js';

const errorResponseSchema = v.object({
  error: v.number(),
  message: nonEmptyString,
});

export default async function queryLastfm<T>(
  schema: v.BaseSchema<unknown, T, v.BaseIssue<unknown>>,
  parameters: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(
    'https://ws.audioscrobbler.com/2.0/?' +
      new URLSearchParams({
        api_key: environment.LASTFM_API_KEY,
        autocorrect: '0',
        format: 'json',
        ...parameters,
      }).toString(),
  );
  const data = (await response.json()) as unknown;
  try {
    return v.parse(schema, data);
  } catch (error) {
    try {
      const { message } = v.parse(errorResponseSchema, data);
      if (message) {
        throw new Error(message);
      }
      throw error;
    } catch {
      throw error;
    }
  }
}
