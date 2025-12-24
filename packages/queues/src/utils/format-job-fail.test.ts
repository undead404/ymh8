import { afterEach, describe, expect, it, vi } from 'vitest';

import { escapeForTelegram } from '@ymh8/utils';

import cleanUpStackTrace from './clean-up-stack-trace.js';
import formatJobFail from './format-job-fail.js';

// 1. Mock the dependencies
vi.mock('@ymh8/utils', () => ({
  // Return a predictable string so we can verify the function was called
  escapeForTelegram: vi.fn((string_) => `[ESC: ${string_}]`),
}));

vi.mock('./clean-up-stack-trace.js', () => ({
  default: vi.fn(() => 'MockedCleanStack'),
}));

describe('formatJobFail', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('formats a fully populated job correctly', () => {
    const mockJob = {
      name: 'resize-image',
      id: 'job-123',
      attemptsMade: 1,
      opts: { attempts: 3 },
      failedReason: 'Timeout Error',
      data: { width: 100, height: 200 },
      stacktrace: ['Error line 1'],
    };

    const result = formatJobFail(mockJob as any);

    // Verify calls to dependencies
    expect(cleanUpStackTrace).toHaveBeenCalledWith(mockJob.stacktrace);
    expect(escapeForTelegram).toHaveBeenCalledWith('resize-image'); // Name
    expect(escapeForTelegram).toHaveBeenCalledWith('job-123'); // ID
    expect(escapeForTelegram).toHaveBeenCalledWith('Timeout Error'); // Reason

    // Verify the JSON data formatting
    const expectedJson = JSON.stringify(mockJob.data, null, 2);
    expect(escapeForTelegram).toHaveBeenCalledWith(expectedJson);

    // Verify Template Structure
    // We expect the mocked "ESC" strings to appear in the output
    expect(result).toContain('🚨 <b>JOB FAILED</b>');
    expect(result).toContain('<b>Job</b>: <code>[ESC: resize-image]</code>');
    expect(result).toContain('<b>ID</b>: <code>[ESC: job-123]</code>');
    expect(result).toContain('<b>Attempt</b>: 1 / 3'); // Not escaped
    expect(result).toContain('Reason</b>:\n<code>[ESC: Timeout Error]</code>');
    expect(result).toContain('<pre>[ESC: MockedCleanStack]</pre>'); // Uses clean stack result
  });

  it('handles missing job properties with defaults', () => {
    const mockJob = {
      name: null, // Should default
      id: undefined, // Should default
      attemptsMade: 0,
      opts: { attempts: 1 },
      failedReason: null, // Should default
      data: {},
      stacktrace: [],
    };

    const result = formatJobFail(mockJob as any);

    expect(escapeForTelegram).toHaveBeenCalledWith('Unknown Job');
    expect(escapeForTelegram).toHaveBeenCalledWith('Unknown ID');
    expect(escapeForTelegram).toHaveBeenCalledWith('Unknown Error');

    expect(result).toContain('<b>Job</b>: <code>[ESC: Unknown Job]</code>');
  });

  it('trims the output string', () => {
    const mockJob = { opts: { attempts: 1 }, data: {} };
    const result = formatJobFail(mockJob as any);

    expect(result.startsWith('🚨')).toBe(true);
    expect(result.endsWith('</pre>')).toBe(true);
    // Ensure no leading/trailing newlines from the template literal
    expect(result).not.toMatch(/^\s/);
    expect(result).not.toMatch(/\s$/);
  });
});
