import blacklist from './blacklist.js';

export default function filterTags<T extends { name: string }>(tags: T[]): T[] {
  return tags.filter((tag) => !blacklist.isBlacklisted(tag.name.toLowerCase()));
}
