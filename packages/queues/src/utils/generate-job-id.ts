import crypto from 'node:crypto';

export default function generateJobId(operationName: string, identity: string) {
  const hash = crypto.createHash('md5').update(identity).digest('hex');
  return `${operationName}:${hash}`;
}
