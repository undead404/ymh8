import findStatlessAlbum from '../database/find-statless-album.js';
import { lastfmQueue } from '../queues.js';
import generateJobName from '../utils/generate-job-name.js';

export default async function fixStatlessAlbum() {
  const statlessAlbum = await findStatlessAlbum();
  if (statlessAlbum) {
    console.log('statlessAlbum', statlessAlbum);
    await lastfmQueue.add(
      generateJobName(
        'album:update:stats',
        statlessAlbum.artist,
        statlessAlbum.name,
      ),
      statlessAlbum,
    );
  }
}
