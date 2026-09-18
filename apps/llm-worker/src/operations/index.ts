import * as v from 'valibot';

import { bareTagSchema, tagJustificationSchema } from '@ymh8/schemata';

import generateTagDescription from './generate-tag-description.js';
import generateTagJustification from './generate-tag-justification.js';

const operationsMapping = {
  'tag:justification:generate': {
    operate: generateTagJustification,
    schema: (data: unknown) => v.parse(tagJustificationSchema, data),
  },
  'tag:description:generate': {
    operate: generateTagDescription,
    schema: (data: unknown) => v.parse(bareTagSchema, data),
  },
};

export default operationsMapping;
