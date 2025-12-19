import * as v from 'valibot';

import type { tagTopAlbumsResponseSchema } from '../lastfm/tag-top-albums-response-schema.js';
export default function convertAlbum(
  lastfmAlbum: v.InferInput<
    typeof tagTopAlbumsResponseSchema
  >['albums']['album'][0],
) {
  return {
    artist: lastfmAlbum.artist.name,
    cover: lastfmAlbum.image.at(-1)?.['#text'] || undefined,
    name: lastfmAlbum.name,
    thumbnail: lastfmAlbum.image.at(0)?.['#text'] || undefined,
  };
}
