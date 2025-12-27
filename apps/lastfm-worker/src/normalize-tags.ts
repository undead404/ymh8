import type { LastfmTag } from '@ymh8/schemata';

export default function normalizeTags(tags: LastfmTag[]) {
  let sumCount = 0;
  for (const tag of tags) {
    sumCount += tag.count;
  }
  const tagsMap = new Map<string, number>();
  for (const tag of tags) {
    const tagName = tag.name.toLowerCase();
    // there are edge cases when a tag appears multiple times
    const oldValue = tagsMap.get(tagName) || 0;
    const newValue = Math.ceil((tag.count / sumCount) * 100);
    tagsMap.set(tagName, oldValue + newValue);
  }
  return tagsMap.entries().map(([tagName, count]) => ({
    count,
    name: tagName,
  }));
}
