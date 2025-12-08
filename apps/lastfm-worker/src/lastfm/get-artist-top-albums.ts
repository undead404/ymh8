import * as v from 'valibot';

import { nonEmptyString } from '@ymh8/schemata';
import sleep from '../utils/sleep.js';

import queryLastfm from './query.js';

const tagTopAlbumsResponseSchema = v.object({
  topalbums: v.object({
    '@attr': v.object({
      page: v.pipe(v.string(), v.toNumber()),
      totalPages: v.pipe(v.string(), v.toNumber()),
    }),
    album: v.array(
      v.object({
        artist: v.object({
          name: nonEmptyString,
        }),
        image: v.pipe(
          v.array(
            v.object({
              '#text': v.string(),
            }),
          ),
          v.transform((images) => images.filter(({ '#text': url }) => url)),
        ),
        mbid: v.optional(nonEmptyString),
        name: nonEmptyString,
      }),
    ),
  }),
});
// const MAX_PAGES = 200;

function convertAlbum(
  lastfmAlbum: v.InferInput<
    typeof tagTopAlbumsResponseSchema
  >['topalbums']['album'][0],
) {
  return {
    artist: lastfmAlbum.artist.name,
    cover: lastfmAlbum.image.at(-1)?.['#text'],
    name: lastfmAlbum.name,
    thumbnail: lastfmAlbum.image.at(0)?.['#text'],
  };
}

export default async function getArtistTopAlbums(name: string) {
  const albums: ReturnType<typeof convertAlbum>[] = [];
  let response = await queryLastfm(tagTopAlbumsResponseSchema, {
    artist: name,
    method: 'artist.getTopAlbums',
  });
  albums.push(
    ...response.topalbums.album.map((lastfmAlbum) => convertAlbum(lastfmAlbum)),
  );
  let page = 2;
  while (
    response.topalbums['@attr'].page < response.topalbums['@attr'].totalPages
    // && response.topalbums['@attr'].page < MAX_PAGES
  ) {
    await sleep(1100);
    response = await queryLastfm(tagTopAlbumsResponseSchema, {
      artist: name,
      method: 'artist.getTopAlbums',
      page,
    });
    albums.push(
      ...response.topalbums.album.map((lastfmAlbum) =>
        convertAlbum(lastfmAlbum),
      ),
    );
    page += 1;
  }
  return albums;
}
