import Anthropic from '@anthropic-ai/sdk';

import { environment } from './environment.js';

const anthropic = new Anthropic({
  apiKey: environment.ANTHROPIC_API_KEY,
});

export default anthropic;
