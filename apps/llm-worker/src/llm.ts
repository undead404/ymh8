import OpenAI from 'openai';

import { environment } from './environment.js';

const openai = new OpenAI({
  apiKey: environment.OPENAI_API_KEY,
});

export default openai;
