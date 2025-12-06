import * as v from 'valibot';

export const nonEmptyString = v.pipe(v.string(), v.minLength(1));