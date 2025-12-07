import updateAlbumStats from './update-album-stats.js';
import updateAlbumTags from './update-album-tags.js';

const operationsMapping: Record<string, (data: unknown) => Promise<unknown>> = {
  'album:update:stats': updateAlbumStats,
  'album:update:tags': updateAlbumTags,
};

export default operationsMapping;
