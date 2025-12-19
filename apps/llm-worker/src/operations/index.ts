import generateTagDescription from './generate-tag-description.js';

const operationsMapping: Record<string, (data: unknown) => Promise<unknown>> = {
  'tag:description:generate': generateTagDescription,
};

export default operationsMapping;
