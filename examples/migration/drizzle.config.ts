import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './src/schema.ts',
	out: './drizzle',
	dialect: 'mysql',
	dbCredentials: {
		host: process.env.CUBRID_HOST ?? 'localhost',
		port: Number(process.env.CUBRID_PORT ?? 33000),
		user: process.env.CUBRID_USER ?? 'dba',
		password: process.env.CUBRID_PASSWORD ?? '',
		database: process.env.CUBRID_DATABASE ?? 'demodb',
	},
	verbose: true,
	strict: true,
});
