import { enqueue, internalQueue } from '@ymh8/queues';
import pickListlessTag from '../database/pick-listless-tag.js';

export default async function checkListlessTag() {
  const listlessTag = await pickListlessTag();
  if (listlessTag) {
    console.log('listlessTag', listlessTag);
    await enqueue(
      internalQueue,
      'tag:list:generate',
      listlessTag.name,
      listlessTag,
    );
  }
}
