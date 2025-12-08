import generateTagList from './generate-tag-list.js';

const operationsMapping: Record<string, (data: unknown) => Promise<unknown>> = {
  'tag:list:generate': generateTagList,
};

export default operationsMapping;
