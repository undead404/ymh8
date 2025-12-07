import type { SqlStatement } from '@nearform/sql';
import { Pool, type PoolClient, type PoolConfig, type QueryResult } from 'pg';
import * as v from 'valibot';

export default class Database {
  client: PoolClient | null = null;
  pool: Pool;
  constructor(config: PoolConfig) {
    this.pool = new Pool(config);
    console.log('Database initialized');
  }

  async init() {
    this.client = await this.pool.connect();
  }

  private async query(sql: string | SqlStatement, parameters?: unknown[]) {
    if (!this.client) {
      throw new Error('Database client is not initialized. Call init() first.');
    }
    const result = await this.client.query<
      QueryResult<Record<string, unknown>>,
      unknown[]
    >(sql, parameters);
    return result;
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
    console.log('UPDATE', sql);
    const result = await this.query(sql, parameters);
    if (result.rows.length > 0) {
      throw new Error('Update query unexpectedly returned some data');
    }
    if (enforceImpact && result.rowCount === 0) {
      throw new Error('Zero rows affected');
    }
  }
}
