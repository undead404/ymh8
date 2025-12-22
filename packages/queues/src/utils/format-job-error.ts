import type { Job } from 'bullmq';

import { escapeForTelegram } from '@ymh8/utils';

export default function formatJobError(job: Job<unknown>): string {
  const jobName = job.name || 'Unknown Job';
  const jobId = job.id || 'Unknown ID';
  // Use attemptsMade + 1 because if it failed, it's about to be the next attempt or it's done
  const attemptInfo = `${job.attemptsMade} / ${job.opts.attempts}`;
  const errorReason = job.failedReason || 'Unknown Error';

  // Format data for readability
  const dataString = JSON.stringify(job.data, null, 2);

  // Clean up stack trace: Join array, truncate if too long
  const rawStack = Array.isArray(job.stacktrace)
    ? job.stacktrace
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

  return `
🚨 *JOB FAILED*
*Job*: \`${jobName}\`
*Attempt*: ${attemptInfo}
*ID*: \`${jobId}\`

*Reason*:
\`${escapeForTelegram(errorReason)}\`

*Data*:
\`\`\`json
${dataString}
\`\`\`

*Stacktrace*:
\`\`\`text
${cleanStack}
\`\`\`
  `.trim();
}
