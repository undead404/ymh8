import finishTagScrape from './finish-tag-scrape.js';
import scrapeArtist from './scrape-artist.js';
import skrapeTag from './skrape-tag.js';
import updateAlbumStats from './update-album-stats.js';
import updateAlbumTags from './update-album-tags.js';

const operationsMapping: Record<string, (data: unknown) => Promise<unknown>> = {
  'album:update:stats': updateAlbumStats,
  'album:update:tags': updateAlbumTags,
  'artist:scrape': scrapeArtist,
  // 'tag:scrape': scrapeTag,
  'tag:scrape': skrapeTag,
  'tag:skrape:page': skrapeTag,
  'tag:skrape:finish': finishTagScrape,
};

export default operationsMapping;
