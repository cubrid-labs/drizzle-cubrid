import type { ColumnBuilderBase } from 'drizzle-orm/column-builder';
import { customType } from 'drizzle-orm/mysql-core';

export interface CubridCollectionConfig {
	element?: ColumnBuilderBase;
}

type CubridCollectionCustomTypeValues = {
	data: string[];
	driverData: string;
	config: CubridCollectionConfig;
};

function resolveElementSqlType(element?: ColumnBuilderBase): string {
	if (!element) {
		return 'VARCHAR(100)';
	}

	const config = (element as { config?: Record<string, unknown> }).config;
	if (!config) {
		return 'VARCHAR(100)';
	}

	if (
		config.columnType === 'MySqlCustomColumn'
		&& typeof config.customTypeParams === 'object'
		&& config.customTypeParams !== null
		&& 'dataType' in config.customTypeParams
		&& typeof (config.customTypeParams as { dataType: unknown }).dataType === 'function'
	) {
		const dataType = (config.customTypeParams as { dataType: (arg: unknown) => string }).dataType;
		return dataType(config.fieldConfig).toUpperCase();
	}

	if (config.columnType === 'MySqlVarChar') {
		const length = typeof config.length === 'number' ? config.length : undefined;
		return length ? `VARCHAR(${length})` : 'VARCHAR';
	}

	if (config.columnType === 'MySqlChar') {
		const length = typeof config.length === 'number' ? config.length : undefined;
		return length ? `CHAR(${length})` : 'CHAR';
	}

	if (config.columnType === 'MySqlInt') {
		return 'INTEGER';
	}

	if (config.columnType === 'MySqlSmallInt') {
		return 'SMALLINT';
	}

	if (config.columnType === 'MySqlTinyInt') {
		return 'SMALLINT';
	}

	if (config.columnType === 'MySqlMediumInt') {
		return 'INTEGER';
	}

	if (config.columnType === 'MySqlBigInt' || config.columnType === 'MySqlSerial') {
		return 'BIGINT';
	}

	if (config.columnType === 'MySqlDecimal') {
		const precision = typeof config.precision === 'number' ? config.precision : undefined;
		const scale = typeof config.scale === 'number' ? config.scale : undefined;
		if (precision !== undefined && scale !== undefined) {
			return `DECIMAL(${precision},${scale})`;
		}
		if (precision !== undefined) {
			return `DECIMAL(${precision})`;
		}
		return 'DECIMAL';
	}

	if (typeof config.dataType === 'string') {
		return config.dataType.toUpperCase();
	}

	return 'VARCHAR(100)';
}

function parseCollectionLiteral(value: string): string[] {
	const trimmed = value.trim();
	if (!trimmed) {
		return [];
	}

	const content = trimmed.startsWith('{') && trimmed.endsWith('}')
		? trimmed.slice(1, -1)
		: trimmed;

	if (!content.trim()) {
		return [];
	}

	const values: string[] = [];
	const pattern = /'((?:''|[^'])*)'|([^,]+)/g;
	for (const match of content.matchAll(pattern)) {
		if (match[1] !== undefined) {
			values.push(match[1].replaceAll("''", "'"));
			continue;
		}

		if (match[2] !== undefined) {
			values.push(match[2].trim());
		}
	}

	return values;
}

function toCollectionLiteral(value: string[]): string {
	const serialized = value
		.map((item) => `'${item.replaceAll('\\', '\\\\').replaceAll("'", "''")}'`)
		.join(',');
	return `{${serialized}}`;
}

function createCollectionBuilder(collectionType: 'SET' | 'MULTISET' | 'SEQUENCE') {
	const collectionColumn = customType<CubridCollectionCustomTypeValues>({
		dataType(config) {
			return `${collectionType}(${resolveElementSqlType(config?.element)})`;
		},
		fromDriver(value) {
			return parseCollectionLiteral(value);
		},
		toDriver(value) {
			return toCollectionLiteral(value);
		},
	});

	return (name: string, config?: CubridCollectionConfig) => collectionColumn(name, config);
}

export const cubridSet = createCollectionBuilder('SET');
export type CubridSetColumnBuilder = ReturnType<typeof cubridSet>;

export const cubridMultiset = createCollectionBuilder('MULTISET');
export type CubridMultisetColumnBuilder = ReturnType<typeof cubridMultiset>;

export const cubridSequence = createCollectionBuilder('SEQUENCE');
export type CubridSequenceColumnBuilder = ReturnType<typeof cubridSequence>;
