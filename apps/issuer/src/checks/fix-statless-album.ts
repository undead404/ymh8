import { enqueue, lastfmQueue } from '@ymh8/queues';
import findStatlessAlbum from '../database/find-statless-album.js';

export default async function fixStatlessAlbum() {
  const statlessAlbum = await findStatlessAlbum();
  if (statlessAlbum) {
    console.log('statlessAlbum', statlessAlbum);
    await enqueue(
      lastfmQueue,
      'album:update:stats',
      statlessAlbum.artist + ' - ' + statlessAlbum.name,
      statlessAlbum,
    );
  }
}
