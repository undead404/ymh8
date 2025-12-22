import { type BareTag } from '@ymh8/schemata';
import { sleep } from '@ymh8/utils';
import convertAlbum from '../utils/convert-album.js';

import queryLastfm from './query.js';
import { tagTopAlbumsResponseSchema } from './tag-top-albums-response-schema.js';

// const MAX_PAGES = 200;

/**
 *
 * @deprecated
 */
export default async function getTagTopAlbums({ name }: BareTag) {
  const albums: ReturnType<typeof convertAlbum>[] = [];
  let response = await queryLastfm(tagTopAlbumsResponseSchema, {
    method: 'tag.getTopAlbums',
    tag: name,
  });
  albums.push(
    ...response.albums.album.map((lastfmAlbum) => convertAlbum(lastfmAlbum)),
  );
  let page = 2;
  while (
    response.albums['@attr'].page < response.albums['@attr'].totalPages
    //&& response.albums['@attr'].page < MAX_PAGES
  ) {
    await sleep(1100);
    response = await queryLastfm(tagTopAlbumsResponseSchema, {
      method: 'tag.getTopAlbums',
      page,
      tag: name,
    });
    albums.push(
      ...response.albums.album.map((lastfmAlbum) => convertAlbum(lastfmAlbum)),
    );
    page += 1;
  }
  return albums;
}
