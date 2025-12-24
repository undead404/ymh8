import type { Job } from 'bullmq';

export default function cleanUpStackTrace(
  stackTrace: Job<unknown>['stacktrace'],
) {
  const rawStack = Array.isArray(stackTrace)
    ? stackTrace
        .map((stacktraceItem) =>
          stacktraceItem
            .split('\n')
            .filter(
              (line) =>
                !line.includes('node:internal') &&
                !line.includes('node_modules'),
            )
            .join('\n'),
        )
        .join('\n')
    : '';

  const cleanStack =
    rawStack.length > 800
      ? rawStack.slice(0, 800) + '... (truncated)'
      : rawStack;
  return cleanStack;
}
