import { entityKind } from 'drizzle-orm/entity';
import type { Logger } from 'drizzle-orm/logger';
import { MySqlDialect } from 'drizzle-orm/mysql-core/dialect';
import type {
	MySqlPreparedQueryConfig,
	MySqlSession as MySqlSessionBase,
	MySqlTransactionConfig,
} from 'drizzle-orm/mysql-core/session';
import type { SelectedFieldsOrdered } from 'drizzle-orm/mysql-core/query-builders/select.types';
import { sql } from 'drizzle-orm/sql/sql';

const hoistedMocks = vi.hoisted(() => {
	const mapResultRowMock = vi.fn(
		(
			_fields: SelectedFieldsOrdered,
			row: unknown[],
			_joinsNotNullableMap: Record<string, boolean> | undefined,
		) => ({ mapped: row }),
	);

	const fillPlaceholdersMock = vi.fn(
		(params: unknown[], values: Record<string, unknown>): unknown[] => {
			return params.map((param) => {
				if (
					typeof param === 'object' &&
					param !== null &&
					'name' in param &&
					typeof (param as { name: unknown }).name === 'string'
				) {
					return values[(param as { name: string }).name];
				}
				return param;
			});
		},
	);

	return { mapResultRowMock, fillPlaceholdersMock };
});

vi.mock('drizzle-orm/utils', async () => {
	const actual = await vi.importActual<typeof import('drizzle-orm/utils')>('drizzle-orm/utils');
	return {
		...actual,
		mapResultRow: hoistedMocks.mapResultRowMock,
	};
});

vi.mock('drizzle-orm/sql/sql', async () => {
	const actual = await vi.importActual<typeof import('drizzle-orm/sql/sql')>('drizzle-orm/sql/sql');
	return {
		...actual,
		fillPlaceholders: hoistedMocks.fillPlaceholdersMock,
	};
});

const { mapResultRowMock, fillPlaceholdersMock } = hoistedMocks;

import { int, varchar } from '../src/columns';
import { CubridPreparedQuery, CubridSession, CubridTransaction, type CubridQueryable } from '../src/session';
import { cubridTable } from '../src/table';

class MockClient implements CubridQueryable {
	queries: { sql: string; params?: readonly unknown[] }[] = [];
	results: unknown[][] = [];

	async query<T extends Record<string, unknown>>(
		sqlText: string,
		params?: readonly unknown[],
	): Promise<T[]> {
		this.queries.push({ sql: sqlText, params });
		return (this.results.shift() ?? []) as T[];
	}
}

const users = cubridTable('users', {
	id: int('id').primaryKey().autoincrement(),
	token: varchar('token', { length: 255 }).$defaultFn(() => crypto.randomUUID()),
});

describe('CubridPreparedQuery', () => {
	beforeEach(() => {
		mapResultRowMock.mockClear();
		fillPlaceholdersMock.mockClear();
	});

	it('execute() returns raw result when fields are not provided', async () => {
		const client = new MockClient();
		client.results.push([{ affectedRows: 1 }]);
		const logger: Logger = { logQuery: vi.fn() };

		const query = new CubridPreparedQuery<MySqlPreparedQueryConfig>(
			client,
			'update users set token = ?',
			['x'],
			logger,
			undefined,
		);

		const result = await query.execute();

		expect(result).toEqual([{ affectedRows: 1 }]);
		expect(client.queries).toHaveLength(1);
		expect(logger.logQuery).toHaveBeenCalledWith('update users set token = ?', ['x']);
	});

	it('execute() maps row results when fields are provided', async () => {
		const client = new MockClient();
		client.results.push([
			{ id: 1, token: 'a' },
			{ id: 2, token: 'b' },
		]);
		const logger: Logger = { logQuery: vi.fn() };
		const fields = [{ path: ['id'], field: users.id }] as unknown as SelectedFieldsOrdered;

		const query = new CubridPreparedQuery<MySqlPreparedQueryConfig>(
			client,
			'select id, token from users',
			[],
			logger,
			fields,
		);

		const result = await query.execute();

		expect(mapResultRowMock).toHaveBeenCalledTimes(2);
		expect(result).toEqual([
			{ mapped: [1, 'a'] },
			{ mapped: [2, 'b'] },
		]);
	});

	it('execute() uses customResultMapper with row arrays', async () => {
		const client = new MockClient();
		client.results.push([
			{ id: 3, token: 'x' },
			{ id: 4, token: 'y' },
		]);
		const logger: Logger = { logQuery: vi.fn() };
		const customMapper = vi.fn((rows: unknown[][]) => rows.map((row) => row.join(':')));

		const query = new CubridPreparedQuery<MySqlPreparedQueryConfig>(
			client,
			'select id, token from users',
			[],
			logger,
			undefined,
			customMapper,
		);

		const result = await query.execute();

		expect(customMapper).toHaveBeenCalledWith([
			[3, 'x'],
			[4, 'y'],
		]);
		expect(result).toEqual(['3:x', '4:y']);
	});

	it('execute() converts non-object and array rows for custom mapping', async () => {
		const client = new MockClient();
		client.results.push([
			['left', 'right'] as unknown as Record<string, unknown>,
			123 as unknown as Record<string, unknown>,
		]);
		const logger: Logger = { logQuery: vi.fn() };
		const customMapper = vi.fn((rows: unknown[][]) => rows);

		const query = new CubridPreparedQuery<MySqlPreparedQueryConfig>(
			client,
			'select weird from users',
			[],
			logger,
			undefined,
			customMapper,
		);

		const result = await query.execute();

		expect(result).toEqual([
			['left', 'right'],
			[123],
		]);
	});

	it('execute() returns AUTO_INCREMENT ids when returningIds is configured', async () => {
		const client = new MockClient();
		client.results.push([{ insertId: 10, affectedRows: 2 }]);
		const logger: Logger = { logQuery: vi.fn() };
		const returningIds = [{ path: ['id'], field: users.id }] as unknown as SelectedFieldsOrdered;

		const query = new CubridPreparedQuery<MySqlPreparedQueryConfig>(
			client,
			'insert into users (token) values (?)',
			['a'],
			logger,
			undefined,
			undefined,
			undefined,
			returningIds,
		);

		const result = await query.execute();

		expect(result).toEqual([{ id: 10 }, { id: 11 }]);
	});

	it('execute() returns generated ids for defaultFn columns', async () => {
		const client = new MockClient();
		client.results.push([{ insertId: 20, affectedRows: 2 }]);
		const logger: Logger = { logQuery: vi.fn() };
		const returningIds = [{ path: ['token'], field: users.token }] as unknown as SelectedFieldsOrdered;
		const generatedIds = [{ token: 'gen-1' }, { token: 'gen-2' }];

		const query = new CubridPreparedQuery<MySqlPreparedQueryConfig>(
			client,
			'insert into users (token) values (?), (?)',
			['a', 'b'],
			logger,
			undefined,
			undefined,
			generatedIds,
			returningIds,
		);

		const result = await query.execute();

		expect(result).toEqual([{ token: 'gen-1' }, { token: 'gen-2' }]);
	});

	it('execute() handles string insert metadata for returning ids', async () => {
		const client = new MockClient();
		client.results.push([{ insertId: '30', affectedRows: '2' }]);
		const logger: Logger = { logQuery: vi.fn() };
		const returningIds = [{ path: ['id'], field: users.id }] as unknown as SelectedFieldsOrdered;

		const query = new CubridPreparedQuery<MySqlPreparedQueryConfig>(
			client,
			'insert into users (token) values (?)',
			['a'],
			logger,
			undefined,
			undefined,
			undefined,
			returningIds,
		);

		const result = await query.execute();

		expect(result).toEqual([{ id: 30 }, { id: 31 }]);
	});

	it('execute() skips non-column returning fields and falls back on invalid metadata', async () => {
		const client = new MockClient();
		client.results.push([{ insertId: 'not-a-number', affectedRows: null }]);
		const logger: Logger = { logQuery: vi.fn() };
		const returningIds = [
			{ path: ['id'], field: { name: 'id' } },
		] as unknown as SelectedFieldsOrdered;

		const query = new CubridPreparedQuery<MySqlPreparedQueryConfig>(
			client,
			'insert into users (token) values (?)',
			['a'],
			logger,
			undefined,
			undefined,
			undefined,
			returningIds,
		);

		const result = await query.execute();

		expect(result).toEqual([{ insertId: 'not-a-number', affectedRows: null }]);
	});

	it('execute() fills placeholders before execution', async () => {
		const client = new MockClient();
		client.results.push([]);
		const logger: Logger = { logQuery: vi.fn() };

		const query = new CubridPreparedQuery<MySqlPreparedQueryConfig>(
			client,
			'select * from users where id = ?',
			[sql.placeholder('id')],
			logger,
			undefined,
		);

		await query.execute({ id: 42 });

		expect(fillPlaceholdersMock).toHaveBeenCalledTimes(1);
		expect(client.queries[0]?.params).toEqual([42]);
	});

	it('execute() returns empty array for empty select result', async () => {
		const client = new MockClient();
		client.results.push([]);
		const logger: Logger = { logQuery: vi.fn() };
		const fields = [{ path: ['id'], field: users.id }] as unknown as SelectedFieldsOrdered;

		const query = new CubridPreparedQuery<MySqlPreparedQueryConfig>(
			client,
			'select id from users',
			[],
			logger,
			fields,
		);

		const result = await query.execute();

		expect(result).toEqual([]);
		expect(mapResultRowMock).not.toHaveBeenCalled();
	});

	it('iterator() throws unsupported streaming error', async () => {
		const client = new MockClient();
		const logger: Logger = { logQuery: vi.fn() };
		const query = new CubridPreparedQuery<MySqlPreparedQueryConfig>(
			client,
			'select 1',
			[],
			logger,
			undefined,
		);

		await expect(async () => {
			for await (const _row of query.iterator()) {
			}
		}).rejects.toThrow('Streaming is not supported by the CUBRID driver');
	});

	it('has CubridPreparedQuery entity kind', () => {
		expect(CubridPreparedQuery[entityKind]).toBe('CubridPreparedQuery');
	});
});

describe('CubridSession', () => {
	it('prepareQuery() returns CubridPreparedQuery instance', () => {
		const client = new MockClient();
		const dialect = new MySqlDialect({});
		const session = new CubridSession(client, dialect, undefined, { mode: 'default' });

		const prepared = session.prepareQuery<MySqlPreparedQueryConfig>(
			{ sql: 'select 1', params: [] },
			undefined,
		);

		expect(prepared).toBeInstanceOf(CubridPreparedQuery);
	});

	it('all() executes sql and logs query', async () => {
		const client = new MockClient();
		client.results.push([{ value: 7 }]);
		const dialect = new MySqlDialect({});
		const logger: Logger = { logQuery: vi.fn() };
		const session = new CubridSession(client, dialect, undefined, { mode: 'default', logger });

		const result = await session.all<{ value: number }>(sql`select ${7} as value`);

		expect(result).toEqual([{ value: 7 }]);
		expect(client.queries).toHaveLength(1);
		expect(client.queries[0]?.sql).toContain('select ? as value');
		expect(client.queries[0]?.params).toEqual([7]);
		expect(logger.logQuery).toHaveBeenCalledTimes(1);
	});

	it('transaction() without config executes begin and commit', async () => {
		const client = new MockClient();
		const dialect = new MySqlDialect({});
		const session = new CubridSession(client, dialect, undefined, { mode: 'default' });

		const result = await session.transaction(async (tx) => {
			await tx.execute(sql`select ${1}`);
			return 'ok';
		});

		expect(result).toBe('ok');
		expect(client.queries[0]?.sql.toLowerCase()).toContain('begin');
		expect(client.queries[1]?.sql.toLowerCase()).toContain('select ?');
		expect(client.queries[2]?.sql.toLowerCase()).toContain('commit');
	});

	it('transaction() with config executes set transaction and start transaction', async () => {
		const client = new MockClient();
		const dialect = new MySqlDialect({});
		const session = new CubridSession(client, dialect, undefined, { mode: 'default' });

		const config: MySqlTransactionConfig = {
			isolationLevel: 'read committed',
			accessMode: 'read write',
			withConsistentSnapshot: true,
		};

		await session.transaction(async () => 'ok', config);

		expect(client.queries[0]?.sql.toLowerCase()).toContain('set transaction');
		expect(client.queries[1]?.sql.toLowerCase()).toContain('start transaction');
		expect(client.queries[2]?.sql.toLowerCase()).toContain('commit');
	});

	it('transaction() rolls back and rethrows on error', async () => {
		const client = new MockClient();
		const dialect = new MySqlDialect({});
		const session = new CubridSession(client, dialect, undefined, { mode: 'default' });
		const expectedError = new Error('boom');

		await expect(
			session.transaction(async () => {
				throw expectedError;
			}),
		).rejects.toBe(expectedError);

		expect(client.queries[0]?.sql.toLowerCase()).toContain('begin');
		expect(client.queries[1]?.sql.toLowerCase()).toContain('rollback');
	});

	it('has CubridSession entity kind', () => {
		expect(CubridSession[entityKind]).toBe('CubridSession');
	});
});

describe('CubridTransaction', () => {
	it('nested transaction creates savepoints', async () => {
		const client = new MockClient();
		const dialect = new MySqlDialect({});
		const session = new CubridSession(client, dialect, undefined, { mode: 'default' });
		const rootTx = new CubridTransaction(
			dialect,
			session as unknown as MySqlSessionBase,
			undefined,
			0,
			'default',
		);

		const result = await rootTx.transaction(async (tx1) => {
			return tx1.transaction(async (tx2) => {
				return tx2.transaction(async () => 'ok');
			});
		});

		expect(result).toBe('ok');
		expect(client.queries[0]?.sql.toLowerCase()).toBe('savepoint sp1');
		expect(client.queries[1]?.sql.toLowerCase()).toBe('savepoint sp2');
		expect(client.queries[2]?.sql.toLowerCase()).toBe('savepoint sp3');
	});

	it('nested transaction rolls back to savepoint on error', async () => {
		const client = new MockClient();
		const dialect = new MySqlDialect({});
		const session = new CubridSession(client, dialect, undefined, { mode: 'default' });
		const rootTx = new CubridTransaction(
			dialect,
			session as unknown as MySqlSessionBase,
			undefined,
			0,
			'default',
		);
		const expectedError = new Error('nested-fail');

		await expect(
			rootTx.transaction(async () => {
				throw expectedError;
			}),
		).rejects.toBe(expectedError);

		expect(client.queries[0]?.sql.toLowerCase()).toBe('savepoint sp1');
		expect(client.queries[1]?.sql.toLowerCase()).toBe('rollback to savepoint sp1');
	});

	it('has CubridTransaction entity kind', () => {
		expect(CubridTransaction[entityKind]).toBe('CubridTransaction');
	});
});
