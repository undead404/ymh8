import * as v from 'valibot';

import {
  type AsyncLogger,
  type BareAlbum,
  lastfmTagSchema,
  nonEmptyString,
} from '@ymh8/schemata';

import queryLastfm from './query.js';

const tagsResponseSchema = v.object({
  toptags: v.object({
    '@attr': v.object({
      artist: nonEmptyString,
      album: v.string(),
    }),

    tag: v.array(lastfmTagSchema),
  }),
});

export default async function getAlbumTags(
  { artist, name }: BareAlbum,
  logger: AsyncLogger,
) {
  const tagsResponse = await queryLastfm(
    tagsResponseSchema,
    {
      album: name,
      artist,
      method: 'album.getTopTags',
    },
    logger,
  );
  return {
    artist: tagsResponse.toptags['@attr'].artist,
    name: tagsResponse.toptags['@attr'].album,
    tags: tagsResponse.toptags.tag.map(({ count, name }) => ({ count, name })),
  };
}
