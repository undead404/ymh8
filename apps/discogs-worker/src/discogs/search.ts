// import { writeFile } from 'node:fs/promises';

import { type BareAlbum } from '@ymh8/schemata';
import { sleep } from '@ymh8/utils';

import getRelease from './get-release.js';
import searchInDiscogs from './search-in-discogs.js';

const BANNED_FORMATS = new Set(['DVD', 'Promo', 'Unofficial Release']);

export default async function searchRelease(album: BareAlbum) {
  const response = await searchInDiscogs(album);

  // await writeFile('discogs-results.json', JSON.stringify(response, null, 2));
  const matches = response.results.filter(
    ({ format }) =>
      !format.some((formatValue) => BANNED_FORMATS.has(formatValue)),
  );
  // .filter((result) => {
  //   const requestedTitleLowercased =
  //     `${album.artist} - ${album.name}`.toLowerCase();
  //   return requestedTitleLowercased === result.title.toLowerCase();
  // });

  let minimalYear = 9999;
  for (const detailedResult of matches) {
    if (detailedResult.year && detailedResult.year < minimalYear) {
      minimalYear = detailedResult.year;
    }
  }
  const minimalYearMatches = matches.filter(({ year }) => year === minimalYear);
  const detailedResults: Awaited<ReturnType<typeof getRelease>>[] = [];

  // console.log(minimalYearMatches.map(({ id }) => id));

  for (const match of minimalYearMatches) {
    await sleep(1100);
    try {
      const details = await getRelease(match.id);
      detailedResults.push(details);
    } catch (error) {
      console.error(error);
    }
  }
  let mostElaborateReleaseDateLength = 0;

  for (const detailedResult of detailedResults) {
    if (
      detailedResult.released &&
      detailedResult.released.length > mostElaborateReleaseDateLength
    ) {
      mostElaborateReleaseDateLength = detailedResult.released.length;
    }
  }

  const mostElaborateDateMatch = detailedResults.find(
    ({ released }) =>
      released && released.length === mostElaborateReleaseDateLength,
  );

  return mostElaborateDateMatch;
}
