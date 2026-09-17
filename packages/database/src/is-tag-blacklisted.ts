import blacklist from './utils/blacklist.js';

export default function isTagBlacklisted(tagName: string): boolean {
  return blacklist.isBlacklisted(tagName);
}
