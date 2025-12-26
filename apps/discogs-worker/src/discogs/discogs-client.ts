import type { SearchTypeEnum } from 'discojs';
import * as v from 'valibot';

import { nonEmptyString } from '@ymh8/schemata';
import { fetchWithTimeout } from '../utils/fetch-with-timeout.js';

const errorResponseSchema = v.object({ message: nonEmptyString });

export interface DiscogsClientConfig {
  consumerKey: string;
  consumerSecret: string;
  /** Dependency Injection for the fetcher */
  fetcher?: typeof fetchWithTimeout;
}

export class DiscogsClient {
  private readonly headers: HeadersInit;
  private readonly fetcher: typeof fetchWithTimeout;

  constructor(config: DiscogsClientConfig) {
    // Default to the real implementation if not provided (e.g. in tests)
    this.fetcher = config.fetcher ?? fetchWithTimeout;

    this.headers = {
      Authorization: `Discogs key=${config.consumerKey}, secret=${config.consumerSecret}`,
      'User-Agent': 'YMH8/1.0 +https://ymh8.pages.dev',
    };
  }

  public async query<
    TResult,
    TParameters extends {
      artist?: string;
      release_title?: string;
      type?: SearchTypeEnum;
    },
  >(
    path: string,
    schema: v.BaseSchema<unknown, TResult, v.BaseIssue<unknown>>,
    parameters?: TParameters,
  ): Promise<TResult> {
    // 1. Construct URL
    const url = new URL(path, 'https://api.discogs.com');
    if (parameters) {
      for (const [k, v] of Object.entries(parameters)) {
        if (v !== undefined) url.searchParams.append(k, String(v));
      }
    }

    // 2. Execute Request (Delegate mechanism to helper)
    // let response: Response;
    const response = await this.fetcher(url.toString(), {
      headers: this.headers,
      timeoutMs: 10_000,
    });

    // 3. Handle API Status (Business Logic)
    if (!response.ok) {
      if (response.status === 429)
        throw new Error('Discogs Rate Limit Exceeded');
      const text = await response.text().catch(() => 'Unknown');
      throw new Error(`Discogs API Error ${response.status}: ${text}`);
    }

    // 4. Validate Data
    const data = (await response.json()) as unknown;
    try {
      return v.parse(schema, data);
    } catch (error) {
      // Handle the case where API returns a 200 OK but with an error body (rare but happens)
      const errorResult = v.safeParse(errorResponseSchema, data);
      if (errorResult.success) throw new Error(errorResult.output.message);
      throw error;
    }
  }
}
