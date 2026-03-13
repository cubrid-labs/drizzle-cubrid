import { mysqlTable } from 'drizzle-orm/mysql-core';

import { int, varchar } from '../src/columns';
import { cubridTable } from '../src/table';

describe('table export', () => {
	it('cubridTable references mysqlTable', () => {
		expect(cubridTable).toBe(mysqlTable);
	});

	it('can define table with cubridTable and columns', () => {
		const users = cubridTable('users', {
			id: int('id').primaryKey().autoincrement(),
			name: varchar('name', { length: 255 }),
		});

		expect(users.id.getSQLType()).toBe('int');
		expect(users.name.getSQLType()).toBe('varchar(255)');
	});
});
