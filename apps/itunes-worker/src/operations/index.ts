import * as v from 'valibot';

import { bareAlbumSchema } from '@ymh8/schemata';

import scrapeLink from './scrape-link.js';

const operationsMapping = {
  'album:preview:scrape': {
    operate: scrapeLink,
    schema: (data: unknown) => v.parse(bareAlbumSchema, data),
  },
};

export default operationsMapping;
