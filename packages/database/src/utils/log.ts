import type { LogEvent } from 'kysely';

export default function logKyselyEvent(event: LogEvent) {
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
}
