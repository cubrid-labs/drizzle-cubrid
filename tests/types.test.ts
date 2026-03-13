import { int, varchar } from '../src/columns';
import { cubridTable } from '../src/table';
import { monetary, multiset, sequence, set } from '../src/types';

describe('collection and monetary types', () => {
	it('set dataType SQL is generated correctly', () => {
		const table = cubridTable('set_types', {
			tags: set('tags', { type: 'varchar', length: 50 }),
			numbers: set('numbers', { type: 'int' }),
			prices: set('prices', { type: 'numeric', precision: 10, scale: 2 }),
		});

		expect(table.tags.getSQLType()).toBe('SET(VARCHAR(50))');
		expect(table.numbers.getSQLType()).toBe('SET(INT)');
		expect(table.prices.getSQLType()).toBe('SET(NUMERIC(10,2))');
	});

	it('multiset dataType SQL is generated correctly', () => {
		const table = cubridTable('multiset_types', {
			tags: multiset('tags', { type: 'varchar', length: 20 }),
		});

		expect(table.tags.getSQLType()).toBe('MULTISET(VARCHAR(20))');
	});

	it('sequence dataType SQL is generated correctly', () => {
		const table = cubridTable('sequence_types', {
			values: sequence('values', { type: 'int' }),
		});

		expect(table.values.getSQLType()).toBe('SEQUENCE(INT)');
	});

	it('monetary dataType returns MONETARY', () => {
		const table = cubridTable('money_types', {
			price: monetary('price'),
		});

		expect(table.price.getSQLType()).toBe('MONETARY');
	});

	it('collection fromDriver parses brace syntax to array', () => {
		const table = cubridTable('parse_types', {
			tags: set('tags', { type: 'varchar', length: 50 }),
		});

		expect(table.tags.mapFromDriverValue('{a,b,c}')).toEqual(['a', 'b', 'c']);
		expect(table.tags.mapFromDriverValue('a,b,c')).toEqual(['a', 'b', 'c']);
	});

	it('collection fromDriver handles empty string and {}', () => {
		const table = cubridTable('parse_empty_types', {
			tags: multiset('tags', { type: 'varchar', length: 50 }),
		});

		expect(table.tags.mapFromDriverValue('')).toEqual([]);
		expect(table.tags.mapFromDriverValue('{}')).toEqual([]);
	});

	it('collection toDriver formats arrays into braces', () => {
		const table = cubridTable('format_types', {
			items: sequence('items', { type: 'int' }),
		});

		expect(table.items.mapToDriverValue(['a', 'b', 'c'])).toBe('{a,b,c}');
		expect(table.items.mapToDriverValue([])).toBe('{}');
	});

	it('collection works in a normal table definition', () => {
		const table = cubridTable('mixed_types', {
			id: int('id').primaryKey().autoincrement(),
			name: varchar('name', { length: 100 }),
			tags: set('tags', { type: 'varchar', length: 32 }),
		});

		expect(table.id.getSQLType()).toBe('int');
		expect(table.name.getSQLType()).toBe('varchar(100)');
		expect(table.tags.getSQLType()).toBe('SET(VARCHAR(32))');
	});
});
