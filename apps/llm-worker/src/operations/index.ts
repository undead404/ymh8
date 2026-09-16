import * as v from 'valibot';

import { bareTagSchema } from '@ymh8/schemata';

import generateTagDescription from './generate-tag-description.js';

const operationsMapping = {
  'tag:description:generate': {
    operate: generateTagDescription,
    schema: (data: unknown) => v.parse(bareTagSchema, data),
  },
};

export default operationsMapping;
