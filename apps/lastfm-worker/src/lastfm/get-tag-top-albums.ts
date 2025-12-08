import * as v from 'valibot';

import { type BareTag, nonEmptyString } from '@ymh8/schemata';
import sleep from '../utils/sleep.js';

import queryLastfm from './query.js';

const tagTopAlbumsResponseSchema = v.object({
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
// const MAX_PAGES = 200;

function convertAlbum(
  lastfmAlbum: v.InferInput<
    typeof tagTopAlbumsResponseSchema
  >['albums']['album'][0],
) {
  return {
    artist: lastfmAlbum.artist.name,
    cover: lastfmAlbum.image.at(-1)?.['#text'],
    name: lastfmAlbum.name,
    thumbnail: lastfmAlbum.image.at(0)?.['#text'],
  };
}

export default async function getTagTopAlbums({ name }: BareTag) {
  const albums: ReturnType<typeof convertAlbum>[] = [];
  let response = await queryLastfm(tagTopAlbumsResponseSchema, {
    method: 'tag.getTopAlbums',
    tag: name,
  });
  albums.push(
    ...response.albums.album.map((lastfmAlbum) => convertAlbum(lastfmAlbum)),
  );
  let page = 2;
  while (
    response.albums['@attr'].page < response.albums['@attr'].totalPages
    //&& response.albums['@attr'].page < MAX_PAGES
  ) {
    await sleep(1100);
    response = await queryLastfm(tagTopAlbumsResponseSchema, {
      method: 'tag.getTopAlbums',
      page,
      tag: name,
    });
    albums.push(
      ...response.albums.album.map((lastfmAlbum) => convertAlbum(lastfmAlbum)),
    );
    page += 1;
  }
  return albums;
}
