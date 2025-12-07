import * as v from 'valibot';

export const nonEmptyString = v.pipe(
  v.string(),
  v.minLength(1),
  v.maxLength(1023),
);

export const positivePercentage = v.pipe(
  v.number(),
  v.minValue(1),
  v.maxValue(100),
);

export const bareAlbumSchema = v.object({
  artist: nonEmptyString,
  name: nonEmptyString,
});

export type BareAlbum = v.InferInput<typeof bareAlbumSchema>;

export const lastfmTagSchema = v.object({
  count: positivePercentage,
  name: nonEmptyString,
});

export type LastfmTag = v.InferInput<typeof lastfmTagSchema>;
