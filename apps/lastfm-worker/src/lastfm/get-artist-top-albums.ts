import * as v from 'valibot';

import { enqueue, lastfmQueue } from '@ymh8/queues';
import { type BareArtist, nonEmptyString } from '@ymh8/schemata';

import queryLastfm from './query.js';

const tagTopAlbumsResponseSchema = v.object({
  topalbums: v.object({
    '@attr': v.object({
      page: v.pipe(v.string(), v.toNumber()),
      totalPages: v.pipe(v.string(), v.toNumber(), v.minValue(1)),
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
        name: v.string(),
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
    cover: lastfmAlbum.image.at(-1)?.['#text'] || undefined,
    name: lastfmAlbum.name,
    thumbnail: lastfmAlbum.image.at(0)?.['#text'] || undefined,
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
    ...(page ? { page } : {}),
  });
  albums.push(
    ...response.topalbums.album
      .filter((album) => album.name.length <= 1023)
      .map((lastfmAlbum) => convertAlbum(lastfmAlbum)),
  );
  if (page) {
    return albums;
  }
  const totalPages = response.topalbums['@attr'].totalPages;
  let currentPage = 2;
  while (currentPage < totalPages) {
    await enqueue(
      lastfmQueue,
      'artist:scrape',
      `${name}-${currentPage}`,
      {
        name,
        ...(currentPage ? { page: currentPage } : {}),
      },
      50 + (currentPage - 1),
    );
    currentPage += 1;
  }
  return albums;
}
