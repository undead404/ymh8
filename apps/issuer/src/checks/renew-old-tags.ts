import { enqueue, lastfmQueue } from '@ymh8/queues';
import findOldTagsBareAlbum from '../database/find-old-tags-bare-album.js';

export default async function renewOldTags() {
  const oldTagsAlbum = await findOldTagsBareAlbum();
  if (oldTagsAlbum) {
    console.log('oldTagsAlbum', oldTagsAlbum);
    await enqueue(
      lastfmQueue,
      'album:update:tags',
      oldTagsAlbum.artist + ' - ' + oldTagsAlbum.name,
      oldTagsAlbum,
    );
  }
}
