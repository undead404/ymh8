import { closeQueues, enqueue, lastfmQueue } from '@ymh8/queues';

import kysely from './database2/index.js';

await kysely.transaction().execute(async (transaction) => {
  const result = await transaction
    .selectFrom('TagListItem')
    .leftJoin('Tag', 'TagListItem.tagName', 'Tag.name')
    .where('Tag.listUpdatedAt', 'is', null)
    .groupBy('TagListItem.tagName')
    .select(['tagName'])
    .execute();

  console.log(result.map(({ tagName }) => tagName));
  try {
    for (const { tagName } of result) {
      await enqueue(lastfmQueue, 'tag:scrape', tagName, { name: tagName });
    }
  } finally {
    await closeQueues();
  }
  const deleteResult = await transaction
    .deleteFrom('TagListItem')
    .where(
      'tagName',
      'in',
      result.map(({ tagName }) => tagName),
    )
    .execute();
  console.log(deleteResult);
});

process.exit(0);
