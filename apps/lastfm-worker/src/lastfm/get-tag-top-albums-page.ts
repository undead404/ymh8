import type { FlowChildJob } from 'bullmq';
import { times } from 'lodash-es';
import * as v from 'valibot';

import { generateJobId, lastfmQueue } from '@ymh8/queues';
import { type BareTag } from '@ymh8/schemata';

import queryLastfm from './query.js';
import { tagTopAlbumsResponseSchema } from './tag-top-albums-response-schema.js';

function convertAlbum(
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

export default async function getTagTopAlbumsPage(
  { name }: BareTag,
  page?: number,
): Promise<{
  albums: ReturnType<typeof convertAlbum>[];
  childrenJobs: FlowChildJob[];
}> {
  const albums: ReturnType<typeof convertAlbum>[] = [];
  const response = await queryLastfm(tagTopAlbumsResponseSchema, {
    tag: name,
    method: 'tag.getTopAlbums',
    ...(page ? { page } : {}),
  });
  albums.push(
    ...response.albums.album
      .filter(
        (album) =>
          album.name.length <= 1023 && album.artist.name.length <= 1023,
      )
      .map((lastfmAlbum) => convertAlbum(lastfmAlbum)),
  );
  if (page || page === 1) {
    return { albums, childrenJobs: [] };
  }
  const totalPages = response.albums['@attr'].totalPages;
  return {
    albums,
    childrenJobs: times(totalPages - 1, (index) => {
      const pageNumber = index + 2;
      const jobId = generateJobId('tag:skrape:page', `${name}-${pageNumber}`);
      return {
        name: 'tag:skrape:page',
        queueName: lastfmQueue.name,
        data: {
          name,
          page: pageNumber,
        } as unknown,
        jobId,
        opts: {
          deduplication: {
            id: jobId,
          },
          failParentOnFailure: true,
          priority: 50 + pageNumber - 1,
        },
      };
    }),
  };
}
