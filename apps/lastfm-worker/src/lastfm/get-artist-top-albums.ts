import * as v from 'valibot';

import { enqueue, lastfmQueue } from '@ymh8/queues';
import { type BareArtist, nonEmptyString } from '@ymh8/schemata';

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

export default async function getArtistTopAlbums(
  { name }: BareArtist,
  page?: number,
) {
  const albums: ReturnType<typeof convertAlbum>[] = [];
  const response = await queryLastfm(tagTopAlbumsResponseSchema, {
    artist: name,
    method: 'artist.getTopAlbums',
    page,
  });
  albums.push(
    ...response.topalbums.album.map((lastfmAlbum) => convertAlbum(lastfmAlbum)),
  );
  let currentPage = 2;
  while (
    response.topalbums['@attr'].page < response.topalbums['@attr'].totalPages
  ) {
    await enqueue(lastfmQueue, 'artist:scrape', `${name}-${currentPage}`, {
      name,
      page: currentPage,
    });
    currentPage += 1;
  }
  return albums;
}
