import crypto from 'node:crypto';

/**
 *
 * @param operationName BullMQ job name
 * @param identity Payload's identity value, to be new for a different payload, for deduplication
 * @returns A BullMQ-ready jobId
 */
export default function generateJobId(operationName: string, identity: string) {
  if (!operationName) {
    throw new Error('Operation name missing');
  }
  const hash = crypto.createHash('md5').update(identity).digest('hex');
  return `${operationName}:${hash}`;
}
