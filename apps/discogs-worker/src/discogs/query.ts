import type { SearchTypeEnum } from 'discojs';
import * as v from 'valibot';

import { nonEmptyString } from '@ymh8/schemata';
import { environment } from '../environment.js';

const errorResponseSchema = v.object({
  message: nonEmptyString,
});

const headers: HeadersInit = {
  Authorization: `Discogs key=${environment.DISCOGS_CONSUMER_KEY}, secret=${environment.DISCOGS_CONSUMER_SECRET}`,
};

export default async function queryDiscogs<
  T1,
  T2 extends { artist?: string; release_title?: string; type?: SearchTypeEnum },
>(
  path: string,
  schema: v.BaseSchema<unknown, T1, v.BaseIssue<unknown>>,
  parameters?: T2,
): Promise<T1> {
  const url =
    new URL(path, 'https://api.discogs.com').toString() +
    (parameters ? '?' + new URLSearchParams(parameters).toString() : '');
  console.log(url);
  const response = await fetch(url, {
    headers,
  });
  const data = (await response.json()) as unknown;
  //   await writeFile(
  //     'discogs/' + path.replaceAll('/', '') + '.json',
  //     JSON.stringify(data, null, 2),
  //   );
  //   console.log(data);
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
