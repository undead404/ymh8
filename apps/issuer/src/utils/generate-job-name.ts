import crypto from 'node:crypto';

export default function generateJobName(
  operationName: string,
  artist: string,
  album: string,
) {
  const hash = crypto
    .createHash('md5')
    .update(artist + album)
    .digest('hex');
  return `${operationName}:${hash}`;
}
