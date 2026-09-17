import type { FlowChildJob } from 'bullmq';
import * as v from 'valibot';

import { generateJobId, lastfmQueue } from '@ymh8/queues';
import { type AsyncLogger, type BareArtist } from '@ymh8/schemata';

import queryLastfm from './query.js';

const artistTopAlbumsResponseSchema = v.object({
  topalbums: v.object({
    '@attr': v.optional(
      v.object({
        page: v.pipe(v.string(), v.toNumber()),
        totalPages: v.pipe(v.string(), v.toNumber(), v.minValue(1)),
      }),
    ),
    album: v.array(
      v.object({
        artist: v.object({ name: v.string() }),
        image: v.pipe(
          v.array(v.object({ '#text': v.optional(v.string()) })),
          v.transform((images) => images.filter(({ '#text': url }) => url)),
        ),
        mbid: v.optional(v.string()),
        name: v.string(),
        playcount: v.number(),
      }),
    ),
  }),
});

function convertAlbum(
  album: v.InferInput<
    typeof artistTopAlbumsResponseSchema
  >['topalbums']['album'][0],
) {
  return {
    artist: album.artist.name,
    cover: album.image.at(-1)?.['#text'] || undefined,
    name: album.name,
    thumbnail: album.image.at(0)?.['#text'] || undefined,
  };
}

export default async function getArtistTopAlbumsPage(
  { name }: BareArtist,
  logger: AsyncLogger,
  page?: number,
): Promise<{
  albums: ReturnType<typeof convertAlbum>[];
  childrenJobs: FlowChildJob[];
}> {
  const response = await queryLastfm(
    artistTopAlbumsResponseSchema,
    {
      artist: name,
      method: 'artist.getTopAlbums',
      ...(page ? { page } : {}),
    },
    logger,
  );

  const albums = response.topalbums.album
    .filter(
      (album) =>
        album.playcount >= 100 &&
        album.artist.name.length > 0 &&
        album.artist.name.length <= 1023 &&
        album.name.length > 0 &&
        album.name.length <= 1023,
    )
    .map((album) => convertAlbum(album));

  if (page) return { albums, childrenJobs: [] };

  const totalPages = response.topalbums['@attr']?.totalPages ?? 1;
  const childrenJobs: FlowChildJob[] = [];
  for (let pageNumber = 2; pageNumber <= totalPages; pageNumber += 1) {
    const jobId = generateJobId('artist:scrape:page', `${name}-${pageNumber}`);
    childrenJobs.push({
      name: 'artist:scrape:page',
      queueName: lastfmQueue.name,
      data: { name, page: pageNumber },
      opts: {
        deduplication: { id: jobId },
        jobId,
        failParentOnFailure: true,
        priority: 50 + pageNumber - 1,
      },
    });
  }

  return { albums, childrenJobs };
}
