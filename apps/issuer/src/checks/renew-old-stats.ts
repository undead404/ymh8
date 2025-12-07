import findOldStatsBareAlbum from '../database/find-old-stats-bare-album.js';
import { lastfmQueue } from '../queues.js';
import generateJobName from '../utils/generate-job-name.js';

export default async function renewOldStats() {
  const oldStatsAlbum = await findOldStatsBareAlbum();
  if (oldStatsAlbum) {
    console.log('oldStatsAlbum', oldStatsAlbum);
    await lastfmQueue.add(
      generateJobName(
        'album:update:stats',
        oldStatsAlbum.artist,
        oldStatsAlbum.name,
      ),
      oldStatsAlbum,
    );
  }
}
