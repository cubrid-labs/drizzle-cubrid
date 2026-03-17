# CUBRID Migration Example (Drizzle Kit)

This directory shows a minimal migration setup for `drizzle-cubrid`.

## 1) Install

```bash
npm install drizzle-cubrid drizzle-orm cubrid-client
npm install -D drizzle-kit
```

## 2) Configure Drizzle Kit

- `drizzle.config.ts` points to `./src/schema.ts`
- `dialect` uses `mysql` because CUBRID is MySQL-compatible for DDL generation
- connection values come from `CUBRID_*` environment variables

Example environment values:

```bash
export CUBRID_HOST=localhost
export CUBRID_PORT=33000
export CUBRID_USER=dba
export CUBRID_PASSWORD=
export CUBRID_DATABASE=demodb
```

## 3) Generate SQL migration files

```bash
npx drizzle-kit generate --config=./examples/migration/drizzle.config.ts
```

Generated files are written to `./examples/migration/drizzle`.

## 4) Apply migrations

Use either of these approaches:

```bash
npx drizzle-kit migrate --config=./examples/migration/drizzle.config.ts
```

Or run generated SQL manually through your CUBRID SQL client.

## 5) Use runtime client

After schema migration, use the normal `drizzle-cubrid` runtime:

```ts
import { createClient } from 'cubrid-client';
import { drizzle } from 'drizzle-cubrid';

const client = createClient({
	host: process.env.CUBRID_HOST ?? 'localhost',
	port: Number(process.env.CUBRID_PORT ?? 33000),
	database: process.env.CUBRID_DATABASE ?? 'demodb',
	user: process.env.CUBRID_USER ?? 'dba',
	password: process.env.CUBRID_PASSWORD ?? '',
});

const db = drizzle(client);
```

## CUBRID migration limitations

- DDL auto-commits in CUBRID, so migrations are not fully transactional
- `RENAME COLUMN` is unavailable in older CUBRID versions
- `ALTER TYPE` is limited for several type conversions

Prefer additive changes (`ADD COLUMN`, backfill, then drop old columns) when changing production schemas.
