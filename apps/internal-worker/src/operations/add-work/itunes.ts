import type { Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

import { enqueue, itunesQueue } from '@ymh8/queues';
import getPreviewlessAlbums from '../../database2/get-previewless-albums.js';
import getQueueCapacity from '../../utils/get-queue-capacity.js';

export default async function addItunesWork(transaction: Transaction<DB>) {
  let itunesCapacity = await getQueueCapacity(itunesQueue);
  const summary: Record<string, number> = {};
  if (itunesCapacity > 0) {
    const previewlessAlbums = await getPreviewlessAlbums(
      transaction,
      itunesCapacity,
    );
    for (const previewlessAlbum of previewlessAlbums) {
      await enqueue(
        itunesQueue,
        'album:preview:scrape',
        `${previewlessAlbum.artist} - ${previewlessAlbum.name}`,
        previewlessAlbum,
        1,
      );
    }
    summary['album:preview:scrape'] = previewlessAlbums.length;
    itunesCapacity -= previewlessAlbums.length;
  }
  return summary;
}
