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

export const bareTagSchema = v.object({
  name: nonEmptyString,
});

export type BareTag = v.InferInput<typeof bareTagSchema>;

export const dateString = v.pipe(
  v.string(),
  v.regex(/\d{4}(?:-\d{2}(?:-\d{2})?)?/),
  v.transform((value) => {
    let valueToChange = value;
    while (valueToChange.endsWith('-00')) {
      valueToChange = valueToChange.slice(0, -3);
    }
    return valueToChange;
  }),
);

export const bareArtistSchema = bareTagSchema;

export type BareArtist = v.InferInput<typeof bareArtistSchema>;

export const telegramPostSchema = v.object({
  imageUrl: v.optional(v.pipe(v.string(), v.url())),
  text: v.string(),
});

export type TelegramPost = v.InferInput<typeof telegramPostSchema>;

export const buildMetadataSchema = v.object({
  triggerDateTime: v.pipe(v.string(), v.isoTimestamp()),
});
