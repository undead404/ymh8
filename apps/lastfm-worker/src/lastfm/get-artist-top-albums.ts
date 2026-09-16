import { type AsyncLogger, type BareArtist } from '@ymh8/schemata';

import getArtistTopAlbumsPage from './get-artist-top-albums-page.js';

export default async function getArtistTopAlbums(
  { name }: BareArtist,
  logger: AsyncLogger,
  page?: number,
) {
  const { albums } = await getArtistTopAlbumsPage({ name }, logger, page);
  return albums;
}
