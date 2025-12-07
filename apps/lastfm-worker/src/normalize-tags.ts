import type { LastfmTag } from '@ymh8/schemata';

export default function normalizeTags(tags: LastfmTag[]) {
  let sumCount = 0;
  for (const tag of tags) {
    sumCount += tag.count;
  }
  return tags.map((tag) => {
    return {
      count: Math.ceil((tag.count / sumCount) * 100),
      name: tag.name.toLowerCase(),
    };
  });
}
