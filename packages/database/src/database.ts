import type { SqlStatement } from '@nearform/sql';
import { Pool, type PoolConfig, type QueryResult } from 'pg';
import * as v from 'valibot';

export default class Database {
  private pool: Pool;

  constructor(config: PoolConfig) {
    this.pool = new Pool(config);

    // Optional: Handle unexpected pool errors so your worker doesn't crash silently
    this.pool.on('error', (error) => {
      console.error('Unexpected error on idle client', error);
    });

    console.log('Database initialized');
  }

  // REMOVED: async init() { ... }
  // You don't need to manually connect. The pool handles this lazy-loading.

  // New method to gracefully shut down
  async close() {
    await this.pool.end();
    console.log('Database pool closed');
  }

  private async query(sql: string | SqlStatement, parameters?: unknown[]) {
    // pool.query automatically acquires a client, executes, and releases it.
    const result = await this.pool.query<
      QueryResult<Record<string, unknown>>,
      unknown[]
    >(sql, parameters);
    return result;
  }

  async count(sql: string | SqlStatement, parameters?: unknown[]) {
    const result = await this.query(sql, parameters);
    // Note: Count queries usually return a string for 'count', ensure you parse it if needed
    // But for rows.length it's fine as is.
    return result.rows.length;
  }

  async queryOne<T>(
    schema: v.BaseSchema<unknown, T, v.BaseIssue<unknown>>,
    sql: string | SqlStatement,
    parameters?: unknown[],
  ): Promise<T | null> {
    const result = await this.query(sql, parameters);
    if (result.rows.length === 0) {
      return null;
    }
    if (result.rows.length > 1) {
      // Logic check: LIMIT 1 usually prevents this at the SQL level
      throw new Error('Too many rows returned.');
    }
    return v.parse(schema, result.rows[0]);
  }

  async queryMany<T>(
    schema: v.BaseSchema<unknown, T, v.BaseIssue<unknown>>,
    sql: string | SqlStatement,
    parameters?: unknown[],
  ): Promise<T[]> {
    const result = await this.query(sql, parameters);
    return v.parse(v.array(schema), result.rows);
  }

  async update(
    sql: string | SqlStatement,
    parameters?: unknown[],
    enforceImpact: boolean = true,
  ): Promise<void> {
    console.log('UPDATE', sql); // careful logging sensitive data
    const result = await this.query(sql, parameters);

    // update queries generally return no rows unless RETURNING is used
    if (result.rows.length > 0) {
      // This check is fine, but assumes you never use RETURNING *
      throw new Error('Update query unexpectedly returned some data');
    }
    if (enforceImpact && result.rowCount === 0) {
      throw new Error('Zero rows affected');
    }
  }
}
