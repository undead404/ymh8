import addWork from './add-work/index.js';
import build from './build.js';
import deploy from './deploy.js';
import generateTagList from './generate-tag-list.js';

const operationsMapping: Record<string, (data: unknown) => Promise<unknown>> = {
  'add-work': addWork,
  'astro:build': build,
  'astro:deploy': deploy,
  'tag:list:generate': generateTagList,
};

export default operationsMapping;
