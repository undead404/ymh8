import * as v from 'valibot';

import { nonEmptyString } from '@ymh8/schemata';

export const tagTopAlbumsResponseSchema = v.object({
  albums: v.object({
    '@attr': v.object({
      page: v.pipe(v.string(), v.toNumber()),
      totalPages: v.pipe(v.string(), v.toNumber(), v.minValue(0)),
    }),
    album: v.array(
      v.object({
        artist: v.object({
          name: v.string(),
        }),
        image: v.array(
          v.object({
            '#text': v.string(),
          }),
        ),
        mbid: v.optional(nonEmptyString),
        name: v.string(),
      }),
    ),
  }),
});
