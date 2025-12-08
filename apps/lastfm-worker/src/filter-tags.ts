import { isTagBlacklisted } from '@ymh8/database';

export default function filterTags<T extends { name: string }>(tags: T[]): T[] {
  return tags.filter((tag) => !isTagBlacklisted(tag.name.toLowerCase()));
}
