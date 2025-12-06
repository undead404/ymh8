import { nonEmptyString } from '@ymh8/schemata';
import dotenv from 'dotenv';
import * as v from 'valibot';

dotenv.config();

const environmentSchema = v.object({
    DB: nonEmptyString,
    DB_USER: nonEmptyString,
    DB_PASSWORD: nonEmptyString,
});

export const environment = v.parse(
    environmentSchema,
    process.env
);