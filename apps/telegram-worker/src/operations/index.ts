import * as v from 'valibot';

import { telegramPostSchema } from '@ymh8/schemata';

import post from './post.js';

const operationsMapping = {
  post: {
    operate: post,
    schema: (data: unknown) => v.parse(telegramPostSchema, data),
  },
};

export default operationsMapping;
