import findTaglessAlbum from '../database/find-tagless-album.js';
import { lastfmQueue } from '../queues.js';
import generateJobName from '../utils/generate-job-name.js';

export default async function fixTaglessAlbum() {
  const taglessAlbum = await findTaglessAlbum();
  if (taglessAlbum) {
    console.log('taglessAlbum', taglessAlbum);
    await lastfmQueue.add(
      generateJobName(
        'album:update:tags',
        taglessAlbum.artist,
        taglessAlbum.name,
      ),
      taglessAlbum,
    );
  }
}
