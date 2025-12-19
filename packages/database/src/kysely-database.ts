import { Kysely, PostgresDialect } from 'kysely';
import type { DB } from 'kysely-codegen';
import { Pool, type PoolConfig } from 'pg';

export default function getKysely(poolOptions: PoolConfig) {
  const database = new Kysely<DB>({
    dialect: new PostgresDialect({
      pool: new Pool(poolOptions),
    }),
    // log: ['query', 'error'],
    log(event) {
      if (event.level === 'error') {
        console.error('Query failed :', {
          durationMs: event.queryDurationMillis,
          error: event.error,
          sql: event.query.sql,
          params: event.query.parameters,
        });
      } else {
        // `'query'`
        console.log('Query executed :', {
          durationMs: event.queryDurationMillis,
          sql: event.query.sql,
          params: event.query.parameters,
        });
      }
    },
  });
  return database;
}
