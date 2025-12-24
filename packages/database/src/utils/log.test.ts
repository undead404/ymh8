import { afterEach, describe, expect, it, vi } from 'vitest';

import logKyselyEvent from './log.js'; // Adjust path

describe('logKyselyEvent', () => {
  // Spy on console methods to verify calls and silence output
  const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  const consoleErrorSpy = vi
    .spyOn(console, 'error')
    .mockImplementation(() => {});

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('logs success events to console.log', () => {
    const mockEvent = {
      level: 'query',
      queryDurationMillis: 42,
      query: {
        sql: 'SELECT * FROM users WHERE id = $1',
        parameters: [1],
      },
    } as any;

    logKyselyEvent(mockEvent);

    expect(consoleLogSpy).toHaveBeenCalledWith('Query executed :', {
      durationMs: 42,
      sql: 'SELECT * FROM users WHERE id = $1',
      params: [1],
    });

    // Ensure error log was not called
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('logs error events to console.error', () => {
    const mockError = new Error('Database connection timed out');
    const mockEvent = {
      level: 'error',
      queryDurationMillis: 100,
      error: mockError,
      query: {
        sql: 'INSERT INTO analytics ...',
        parameters: [],
      },
    } as any;

    logKyselyEvent(mockEvent);

    expect(consoleErrorSpy).toHaveBeenCalledWith('Query failed :', {
      durationMs: 100,
      error: mockError,
      sql: 'INSERT INTO analytics ...',
      params: [],
    });

    // Ensure success log was not called
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });
});
