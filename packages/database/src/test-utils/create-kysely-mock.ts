import type { Kysely } from 'kysely';
import { type Mock, vi } from 'vitest';

export interface KyselyMock {
  db: Kysely<any>; // or 'any' if you want to be loose
  builder: any; // The recursive proxy is hard to type, 'any' is safe here
  execute: Mock;
}

/**
 * Creates a mock Kysely instance with chainable methods.
 * * @returns An object containing:
 * - db: The mock database instance to pass to your functions.
 * - builder: The chain builder spies (where, set, etc.) to assert against.
 * - execute: The final execution spy to mock return values.
 */
export function createKyselyMock(): KyselyMock {
  const execute = vi.fn();
  const executeTakeFirst = vi.fn();
  const executeTakeFirstOrThrow = vi.fn();

  // The Proxy builder
  const builder = new Proxy(
    { execute, executeTakeFirst, executeTakeFirstOrThrow },
    {
      get: (target, property) => {
        if (property in target) {
          return target[property as keyof typeof target];
        }
        if (!(target as any)[property]) {
          (target as any)[property] = vi.fn().mockReturnValue(builder);
        }
        return (target as any)[property];
      },
    },
  );

  const database = {
    selectFrom: vi.fn().mockReturnValue(builder),
    updateTable: vi.fn().mockReturnValue(builder),
    insertInto: vi.fn().mockReturnValue(builder),
    deleteFrom: vi.fn().mockReturnValue(builder),
    transaction: vi.fn().mockImplementation((callback) => callback(database)),
  };

  // 2. Cast the return object to the explicit interface
  return {
    db: database as unknown as Kysely<any>,
    builder,
    execute,
  };
}
