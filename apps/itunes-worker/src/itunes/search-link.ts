import * as v from 'valibot';

import type { AsyncLogger, BareAlbum } from '@ymh8/schemata';
import { sleep } from '@ymh8/utils';

const itunesSearchResponseSchema = v.object({
  results: v.array(
    v.object({
      artistName: v.string(),
      collectionId: v.number(),
      collectionName: v.string(),
      collectionViewUrl: v.optional(v.string()),
      trackName: v.optional(v.string()),
      trackNumber: v.optional(v.number()),
      trackTimeMillis: v.optional(v.number()),
      previewUrl: v.optional(v.pipe(v.string(), v.url())),
      wrapperType: v.picklist(['collection', 'track']),
    }),
  ),
});

const skipKeywords = [/intro/i, /outro/i, /interlude/i, /prelude/i, /skit/i];
export default async function searchLink(
  album: BareAlbum,
  logger: AsyncLogger,
) {
  const searchParameters = new URLSearchParams({
    term: `${album.artist} ${album.name}`,
    entity: 'album', // Strictly search for albums first
    limit: '5',
  });
  const url = `https://itunes.apple.com/search?${searchParameters}`;
  await logger.log(url);
  const searchResp = await fetch(url);
  const searchData = (await searchResp.json()) as unknown;

  const validData = v.parse(itunesSearchResponseSchema, searchData);

  // Strict filtering: Ensure artist name matches (iTunes fuzzy search can be weird)
  const albumMatch = validData.results.find(
    (item) =>
      item.artistName.toLowerCase().includes(album.artist.toLowerCase()) &&
      item.collectionName.toLowerCase().includes(album.name.toLowerCase()) &&
      item.collectionViewUrl,
  );

  if (!albumMatch) {
    await logger.log('Album not found');
    return;
  }
  const albumUrl = albumMatch.collectionViewUrl!;

  await sleep(6000);

  // Step 2: Lookup the tracks for this specific Collection ID
  // 'entity=song' ensures we get the tracks with previewUrls
  const lookupUrl = `https://itunes.apple.com/lookup?id=${albumMatch.collectionId}&entity=song`;
  await logger.log(lookupUrl);
  const lookupResp = await fetch(lookupUrl);
  const lookupData = (await lookupResp.json()) as unknown;
  const validLookupData = v.parse(itunesSearchResponseSchema, lookupData);

  // The lookup returns the Album (wrapperType: 'collection') as index 0,
  // followed by the Tracks (wrapperType: 'track').
  const tracks = validLookupData.results.filter(
    (item) => item.wrapperType === 'track' && item.previewUrl && item.trackName,
  );

  if (tracks.length === 0) {
    await logger.log('No tracks with previews');
    return;
  }

  // Step B: Filter the list
  let candidates = tracks.filter((t) => {
    // Must have a name
    if (!t.trackName) return false;
    // Must not match keywords
    const isIntro = skipKeywords.some((regex) => regex.test(t.trackName!));
    if (isIntro) return false;
    if ((t.trackTimeMillis || 0) < 30_000) return false;

    return true;
  });

  // Fallback: If we filtered everything out (e.g. an EP of only intros?), use raw list
  if (candidates.length === 0) candidates = tracks;

  // Step C: Pick the best candidate
  // Sort by track number to be sure
  candidates.sort((a, b) => (a.trackNumber || 0) - (b.trackNumber || 0));

  const selectedTrack =
    // If we have at least 2 candidates, pick the SECOND one (Index 1).
    candidates.length >= 2
      ? // Track 2 is historically the "Single" or "Banger" of the album.
        candidates[1]
      : // Otherwise just take the first valid one available
        candidates[0];
  if (!selectedTrack) {
    return;
  }
  await logger.log(`${selectedTrack.artistName} - ${selectedTrack.trackName}`);
  return {
    pageUrl: albumUrl,
    previewUrl: selectedTrack.previewUrl!,
  };
}
