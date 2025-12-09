import * as v from 'valibot';

import { nonEmptyString } from '@ymh8/schemata';

export const tagTopAlbumsResponseSchema = v.object({
  albums: v.object({
    '@attr': v.object({
      page: v.pipe(v.string(), v.toNumber()),
      totalPages: v.pipe(v.string(), v.toNumber()),
    }),
    album: v.array(
      v.object({
        artist: v.object({
          name: nonEmptyString,
        }),
        image: v.array(
          v.object({
            '#text': v.pipe(v.string(), v.url()),
          }),
        ),
        mbid: v.optional(nonEmptyString),
        name: nonEmptyString,
      }),
    ),
  }),
});
