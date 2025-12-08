import scrapeTag from './scrape-tag.js';
import updateAlbumStats from './update-album-stats.js';
import updateAlbumTags from './update-album-tags.js';

const operationsMapping: Record<string, (data: unknown) => Promise<unknown>> = {
  'album:update:stats': updateAlbumStats,
  'album:update:tags': updateAlbumTags,
  'tag:scrape': scrapeTag,
};

export default operationsMapping;
