import { enqueue, internalQueue } from '@ymh8/queues';
import pickOldTagList from '../database/pick-old-tag-list.js';

export default async function renewOldList() {
  const oldListTag = await pickOldTagList();
  if (oldListTag) {
    console.log('oldListTag', oldListTag);
    await enqueue(
      internalQueue,
      'tag:list:generate',
      oldListTag.name,
      oldListTag,
    );
  }
}
