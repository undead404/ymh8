import { Kysely, PostgresDialect } from 'kysely';
import type { DB } from 'kysely-codegen';
import { Pool, type PoolConfig } from 'pg';

import logKyselyEvent from './utils/log.js';

/**
 * For usage in different worker processes
 *
 * @param poolOptions PostgreSQL pool options
 * @returns Kysely database object
 */
export default function getKysely(poolOptions: PoolConfig) {
  const database = new Kysely<DB>({
    dialect: new PostgresDialect({
      pool: new Pool(poolOptions),
    }),
    // log: ['query', 'error'],
    log: logKyselyEvent,
  });
  return database;
}
