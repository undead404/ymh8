import * as v from 'valibot';

import { type BareAlbum, lastfmTagSchema } from '@ymh8/schemata';

import queryLastfm from './query.js';

const tagsResponseSchema = v.object({
  toptags: v.object({
    tag: v.array(lastfmTagSchema),
  }),
});

export default async function getAlbumTags({ artist, name }: BareAlbum) {
  const tagsResponse = await queryLastfm(tagsResponseSchema, {
    album: name,
    artist,
    method: 'album.getTopTags',
  });
  return tagsResponse.toptags.tag.map(({ count, name }) => ({ count, name }));
}
