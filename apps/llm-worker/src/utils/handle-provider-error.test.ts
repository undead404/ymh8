import { describe, expect, it } from 'vitest';

import throwIfProviderHasNoCredits from './handle-provider-error.js';

describe('throwIfProviderHasNoCredits', () => {
  it('turns an exhausted-credit response into an unrecoverable, actionable error', () => {
    const error = Object.assign(
      new Error(
        '429 You have no credits remaining. Add credits to continue using the API at https://platform.openai.com/settings/organization/billing/.',
      ),
      { status: 429 },
    );

    expect(() => throwIfProviderHasNoCredits(error)).toThrow(
      'The LLM provider has no credits remaining',
    );
    expect(() => throwIfProviderHasNoCredits(error)).toThrow(
      'https://platform.openai.com/settings/organization/billing/',
    );
  });

  it('leaves retryable rate-limit errors unchanged', () => {
    const error = Object.assign(new Error('Too many requests'), {
      status: 429,
    });

    expect(() => throwIfProviderHasNoCredits(error)).not.toThrow();
  });
});
