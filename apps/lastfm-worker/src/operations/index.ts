import * as v from 'valibot';

import {
  bareAlbumSchema,
  bareArtistSchema,
  bareTagSchema,
} from '@ymh8/schemata';

import finishArtistScrape from './finish-artist-scrape.js';
import finishTagScrape from './finish-tag-scrape.js';
import scrapeArtist, { scrapeArtistPayload } from './scrape-artist.js';
import skrapeTag, { scrapeTagPayload } from './skrape-tag.js';
import updateAlbumStats from './update-album-stats.js';
import updateAlbumTags from './update-album-tags.js';

const operationsMapping = {
  'album:update:stats': {
    operate: updateAlbumStats,
    schema: (data: unknown) => v.parse(bareAlbumSchema, data),
  },
  'album:update:tags': {
    operate: updateAlbumTags,
    schema: (data: unknown) => v.parse(bareAlbumSchema, data),
  },
  'artist:scrape': {
    operate: scrapeArtist,
    schema: (data: unknown) => v.parse(scrapeArtistPayload, data),
  },
  'artist:scrape:page': {
    operate: scrapeArtist,
    schema: (data: unknown) => v.parse(scrapeArtistPayload, data),
  },
  'artist:scrape:finish': {
    operate: finishArtistScrape,
    schema: (data: unknown) => v.parse(bareArtistSchema, data),
  },
  // 'tag:scrape': scrapeTag,
  'tag:scrape': {
    operate: skrapeTag,
    schema: (data: unknown) => v.parse(scrapeTagPayload, data),
  },
  'tag:skrape:page': {
    operate: skrapeTag,
    schema: (data: unknown) => v.parse(scrapeTagPayload, data),
  },
  'tag:skrape:finish': {
    operate: finishTagScrape,
    schema: (data: unknown) => v.parse(bareTagSchema, data),
  },
};

export default operationsMapping;
