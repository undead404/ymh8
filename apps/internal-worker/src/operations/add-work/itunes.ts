import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import { itunesQueue } from '@ymh8/queues';
import getPreviewlessAlbums from '../../database2/get-previewless-albums.js';

import { createWorkJob, type WorkJob } from './jobs.js';

export default async function addItunesWork(
  transaction: Transaction<DB>,
  initialCapacity: number,
): Promise<WorkJob[]> {
  let itunesCapacity = initialCapacity;
  const jobs: WorkJob[] = [];
  if (itunesCapacity > 0) {
    const previewlessAlbums = await getPreviewlessAlbums(
      transaction,
      itunesCapacity,
    );
    for (const previewlessAlbum of previewlessAlbums) {
      jobs.push(
        createWorkJob(
          itunesQueue,
          'album:preview:scrape',
          `${previewlessAlbum.artist} - ${previewlessAlbum.name}`,
          previewlessAlbum,
          1,
        ),
      );
    }
    itunesCapacity -= previewlessAlbums.length;
  }
  return jobs;
}
