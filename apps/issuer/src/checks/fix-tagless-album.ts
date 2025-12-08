import { enqueue, lastfmQueue } from '@ymh8/queues';
import findTaglessAlbum from '../database/find-tagless-album.js';

export default async function fixTaglessAlbum() {
  const taglessAlbum = await findTaglessAlbum();
  if (taglessAlbum) {
    console.log('taglessAlbum', taglessAlbum);
    await enqueue(
      lastfmQueue,
      'album:update:tags',
      taglessAlbum.artist + ' - ' + taglessAlbum.name,
      taglessAlbum,
    );
  }
}
