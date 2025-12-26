import { SearchTypeEnum } from 'discojs/dist/index.es.js';
import * as v from 'valibot';

import {
  type AsyncLogger,
  type BareAlbum,
  nonEmptyString,
} from '@ymh8/schemata';

import queryDiscogs from './query.js';

const searchResponseSchema = v.object({
  results: v.array(
    v.object({
      id: v.number(),
      title: nonEmptyString,
      year: v.optional(v.pipe(v.string(), v.toNumber())),
      format: v.array(v.string()),
    }),
  ),
});

export default async function searchInDiscogs(
  album: BareAlbum,
  logger: AsyncLogger,
) {
  await logger.log(
    `searchInDiscogs ${JSON.stringify({ artist: album.artist, name: album.name })}`,
  );
  const response = await queryDiscogs(
    '/database/search',
    searchResponseSchema,
    logger,
    {
      // artist: album.artist,
      q: `${album.artist} - ${album.name}`,
      // release_title: album.name,
      type: SearchTypeEnum.RELEASE,
    },
  );
  return response;
}
