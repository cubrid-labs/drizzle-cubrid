import {
	cubridSequence,
	cubridSet,
	cubridTable,
	int,
	monetary,
	timestamp,
	varchar,
} from 'drizzle-cubrid';

export const products = cubridTable('products', {
	id: int('id').primaryKey().autoincrement(),
	name: varchar('name', { length: 120 }).notNull(),
	tags: cubridSet('tags', { element: varchar('tag_item', { length: 100 }) }),
	price: monetary('price').notNull(),
	createdAt: timestamp('created_at').defaultNow(),
});

export const productRevisions = cubridTable('product_revisions', {
	id: int('id').primaryKey().autoincrement(),
	productId: int('product_id').notNull(),
	appliedSteps: cubridSequence('applied_steps', { element: int('step_no') }),
	createdAt: timestamp('created_at').defaultNow(),
});
