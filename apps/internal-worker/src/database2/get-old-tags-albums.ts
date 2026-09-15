import { sql, type Transaction } from 'kysely';
import type { DB } from 'kysely-codegen';

export default async function getOldTagsAlbums(
  transaction: Transaction<DB>,
  limit: number,
) {
  // 1. Спочатку дістаємо записи
  const albums = await transaction
    .selectFrom('Album')
    .select(['artist', 'name', 'date']) // date потрібен для воркера
    .where('hidden', 'is not', true)
    .where('artist', '<>', 'Various Artists')
    .where('nextTagsUpdateAt', '<=', sql<Date>`NOW()`)
    .orderBy('nextTagsUpdateAt', 'asc')
    .limit(limit)
    .execute();

  if (albums.length === 0) return albums;

  // 2. Одразу "бронюємо" їх, зсуваючи час на добу вперед
  // Це сховає їх від наступних запусків крону
  const albumTuples = albums.map((a) => sql`(${a.artist}, ${a.name})`);

  await transaction
    .updateTable('Album')
    .set({ nextTagsUpdateAt: sql<Date>`NOW() + interval '24 hours'` })
    // Kysely/Postgres синтаксис для IN з кількома колонками (Composite Key)
    .where(sql`(artist, name)`, 'in', sql`(${sql.join(albumTuples)})`)
    .execute();

  return albums;
}
