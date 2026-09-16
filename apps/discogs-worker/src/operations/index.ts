import * as v from 'valibot';

import { bareAlbumSchema } from '@ymh8/schemata';

import enrich from './enrich.js';

const operationsMapping = {
  'album:enrich': {
    operate: enrich,
    schema: (data: unknown) => v.parse(bareAlbumSchema, data),
  },
};

export default operationsMapping;
