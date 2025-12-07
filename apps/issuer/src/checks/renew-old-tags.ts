import findOldTagsBareAlbum from '../database/find-old-tags-bare-album.js';
import { lastfmQueue } from '../queues.js';
import generateJobName from '../utils/generate-job-name.js';

export default async function renewOldTags() {
  const oldTagsAlbum = await findOldTagsBareAlbum();
  if (oldTagsAlbum) {
    console.log('oldTagsAlbum', oldTagsAlbum);
    await lastfmQueue.add(
      generateJobName(
        'album:update:tags',
        oldTagsAlbum.artist,
        oldTagsAlbum.name,
      ),
      oldTagsAlbum,
    );
  }
}
