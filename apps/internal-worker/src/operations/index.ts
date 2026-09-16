import * as v from 'valibot';

import { bareTagSchema, buildMetadataSchema } from '@ymh8/schemata';

import addWork from './add-work/index.js';
import build from './build.js';
import dailyReport from './daily-report.js';
import deploy from './deploy.js';
import eliminateTag from './eliminate-tag.js';
import generateTagList from './generate-tag-list.js';

const operationsMapping = {
  'add-work': {
    operate: addWork,
    schema: (data: unknown) => v.parse(v.object({}), data),
  },
  'astro:build': {
    operate: build,
    schema: (data: unknown) => v.parse(buildMetadataSchema, data),
  },
  'astro:deploy': {
    operate: deploy,
    schema: (data: unknown) => v.parse(buildMetadataSchema, data),
  },
  'daily-report': {
    operate: dailyReport,
    schema: (data: unknown) => v.parse(v.object({}), data),
  },
  'tag:eliminate': {
    operate: eliminateTag,
    schema: (data: unknown) => v.parse(bareTagSchema, data),
  },
  'tag:list:generate': {
    operate: generateTagList,
    schema: (data: unknown) => v.parse(bareTagSchema, data),
  },
};

export default operationsMapping;
