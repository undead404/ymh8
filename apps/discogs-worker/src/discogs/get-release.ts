import * as v from 'valibot';

import { type AsyncLogger, dateString } from '@ymh8/schemata';

import queryDiscogs from './query.js';

const releaseResponseSchema = v.object({
  id: v.number(),
  released: v.optional(dateString),
  tracklist: v.optional(
    v.array(
      v.object({
        duration: v.string(),
      }),
    ),
  ),
});

export default async function getRelease(
  releaseId: number,
  logger: AsyncLogger,
) {
  const details = await queryDiscogs(
    `/releases/${releaseId}`,
    releaseResponseSchema,
    logger,
  );
  return details;
}
