import { customType } from 'drizzle-orm/mysql-core';

interface CollectionTypeConfig {
	type: string;
	length?: number;
	precision?: number;
	scale?: number;
}

type CollectionCustomTypeValues = {
	data: string[];
	driverData: string;
	config: CollectionTypeConfig;
	configRequired: true;
};

function buildElementType(config: CollectionTypeConfig): string {
	const base = config.type.toUpperCase();
	if (typeof config.length === 'number') {
		return `${base}(${config.length})`;
	}

	if (typeof config.precision === 'number' && typeof config.scale === 'number') {
		return `${base}(${config.precision},${config.scale})`;
	}

	return base;
}

function parseCollectionString(value: string): string[] {
	const trimmed = value.trim();
	if (!trimmed) {
		return [];
	}

	const unwrapped = trimmed.startsWith('{') && trimmed.endsWith('}')
		? trimmed.slice(1, -1)
		: trimmed;

	if (!unwrapped) {
		return [];
	}

	return unwrapped.split(',').map((item) => item.trim());
}

function formatCollectionString(value: string[]): string {
	return `{${value.join(',')}}`;
}

function createCollectionType(collectionName: 'SET' | 'MULTISET' | 'SEQUENCE') {
	return customType<CollectionCustomTypeValues>({
		dataType(config) {
			return `${collectionName}(${buildElementType(config)})`;
		},
		fromDriver(value) {
			return parseCollectionString(value);
		},
		toDriver(value) {
			return formatCollectionString(value);
		},
	});
}

export const set = createCollectionType('SET');

export const multiset = createCollectionType('MULTISET');

export const sequence = createCollectionType('SEQUENCE');

export const monetary = customType<{ data: string; driverData: string }>({
	dataType() {
		return 'MONETARY';
	},
});
