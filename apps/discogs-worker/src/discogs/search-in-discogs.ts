import { SearchTypeEnum } from 'discojs/dist/index.es.js';
import * as v from 'valibot';

import { type BareAlbum, nonEmptyString } from '@ymh8/schemata';

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

export default async function searchInDiscogs(album: BareAlbum) {
  const response = await queryDiscogs(
    '/database/search',
    searchResponseSchema,
    {
      artist: album.artist,
      release_title: album.name,
      type: SearchTypeEnum.RELEASE,
    },
  );
  return response;
}
