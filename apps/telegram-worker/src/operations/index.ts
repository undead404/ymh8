import post from './post.js';

const operationsMapping: Record<string, (data: unknown) => Promise<unknown>> = {
  post: post,
};

export default operationsMapping;
