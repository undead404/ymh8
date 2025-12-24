import type { Job } from 'bullmq';

import { escapeForTelegram } from '@ymh8/utils'; // Ensure this is the NEW HTML version

import cleanUpStackTrace from './clean-up-stack-trace.js';

export default function formatJobFail(job: Job<unknown>): string {
  const jobName = job.name || 'Unknown Job';
  const jobId = job.id || 'Unknown ID';
  const attemptInfo = `${job.attemptsMade} / ${job.opts.attempts}`;
  const errorReason = job.failedReason || 'Unknown Error';

  // Format data for readability
  const dataString = JSON.stringify(job.data, null, 2);

  const cleanStack = cleanUpStackTrace(job.stacktrace);
  return `
🚨 <b>JOB FAILED</b>
<b>Job</b>: <code>${escapeForTelegram(jobName)}</code>
<b>Attempt</b>: ${attemptInfo}
<b>ID</b>: <code>${escapeForTelegram(jobId)}</code>

<b>Reason</b>:
<code>${escapeForTelegram(errorReason)}</code>

<b>Data</b>:
<pre><code class="language-json">${escapeForTelegram(dataString)}</code></pre>

<b>Stacktrace</b>:
<pre>${escapeForTelegram(cleanStack)}</pre>
  `.trim();
}
