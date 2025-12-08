import { enqueue, lastfmQueue } from '@ymh8/queues';
import findOldStatsBareAlbum from '../database/find-old-stats-bare-album.js';

export default async function renewOldStats() {
  const oldStatsAlbum = await findOldStatsBareAlbum();
  if (oldStatsAlbum) {
    console.log('oldStatsAlbum', oldStatsAlbum);
    await enqueue(
      lastfmQueue,
      'album:update:stats',
      oldStatsAlbum.artist + ' - ' + oldStatsAlbum.name,
      oldStatsAlbum,
    );
  }
}
