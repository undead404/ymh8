import type { SearchTypeEnum } from 'discojs';
import * as v from 'valibot';

import { type AsyncLogger, nonEmptyString } from '@ymh8/schemata';
import { environment } from '../environment.js';

const errorResponseSchema = v.object({
  message: nonEmptyString,
});

// 1. Fixed: Add User-Agent (Required by Discogs)
const headers: HeadersInit = {
  Authorization: `Discogs key=${environment.DISCOGS_CONSUMER_KEY}, secret=${environment.DISCOGS_CONSUMER_SECRET}`,
  'User-Agent': 'YMH8/1.0 +https://ymh8.pages.dev',
};

export default async function queryDiscogs<
  T1,
  T2 extends { artist?: string; release_title?: string; type?: SearchTypeEnum },
>(
  path: string,
  schema: v.BaseSchema<unknown, T1, v.BaseIssue<unknown>>,
  logger: AsyncLogger,
  parameters?: T2,
): Promise<T1> {
  const url =
    new URL(path, 'https://api.discogs.com').toString() +
    (parameters ? '?' + new URLSearchParams(parameters).toString() : '');

  await logger.log(`[Discogs] Fetching: ${url}`);

  // 2. Fixed: Manual Hard Timeout via Promise.race
  // This ensures that even if fetch hangs internally, we force a rejection.
  const timeoutMs = 10_000;
  const controller = new AbortController();

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    const id = setTimeout(() => {
      controller.abort(); // Kill the fetch if it's still running
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    // Ensure the timer doesn't hold up the process if the fetch finishes early
    // (Optional optimization, but good for clean shutdowns)
    if (typeof id.unref === 'function') id.unref();
  });

  try {
    const fetchPromise = async () => {
      const response = await fetch(url, {
        headers,
        signal: controller.signal,
      });

      // 3. Fixed: Check status before parsing JSON
      if (!response.ok) {
        // Handle 429 explicitly if you want to implement backoff later
        if (response.status === 429) {
          throw new Error('Discogs Rate Limit Exceeded');
        }
        // Try to read error message, but strictly limit reading time
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Discogs API Error ${response.status}: ${errorText}`);
      }

      return response.json() as unknown;
      // const text = await response.text(); // Get text first
      // console.log(`[Discogs] Payload size: ${text.length} chars`); // <--- CHECK SIZE
      // return JSON.parse(text) as unknown;
    };

    // Race the fetch against the timer
    const data = await Promise.race([fetchPromise(), timeoutPromise]);

    // Validate
    return v.parse(schema, data);
  } catch (error) {
    // 4. Handle Validation/API errors safely
    const result = v.safeParse(errorResponseSchema, error); // Check if 'error' is actually the response data

    // If the error itself is the JSON response from Discogs (rare in this structure but possible in your old logic)
    if (result.success && result.output.message) {
      throw new Error(result.output.message);
    }

    throw error;
  }
}
