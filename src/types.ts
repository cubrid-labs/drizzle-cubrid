import { customType } from 'drizzle-orm/mysql-core';
import { cubridMultiset, cubridSequence, cubridSet } from './columns/collections.js';

export const set = cubridSet;

export const multiset = cubridMultiset;

export const sequence = cubridSequence;

export const monetary = customType<{ data: string; driverData: string }>({
	dataType() {
		return 'MONETARY';
	},
});
