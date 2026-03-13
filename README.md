# drizzle-cubrid

**Drizzle ORM dialect for CUBRID database**

[🇰🇷 한국어](docs/README.ko.md) · [🇺🇸 English](README.md)

[![npm](https://img.shields.io/npm/v/drizzle-cubrid.svg)](https://www.npmjs.com/package/drizzle-cubrid)
[![CI](https://github.com/cubrid-labs/drizzle-cubrid/actions/workflows/ci.yml/badge.svg)](https://github.com/cubrid-labs/drizzle-cubrid/actions/workflows/ci.yml)
[![Node.js 18+](https://img.shields.io/badge/node-18%2B-blue.svg)](https://nodejs.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.38-green.svg)](https://orm.drizzle.team/)
[![Coverage 99%](https://img.shields.io/badge/coverage-99%25-brightgreen.svg)](https://github.com/cubrid-labs/drizzle-cubrid)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Why drizzle-cubrid?

CUBRID is a high-performance open-source relational database, widely adopted in
Korean public-sector and enterprise applications. Until now, there was no
Drizzle ORM dialect for CUBRID.

**drizzle-cubrid** bridges that gap:

- TypeScript-first Drizzle ORM dialect with **full type safety**
- **49 offline tests** with **99%+ code coverage**
- Built on [`cubrid-client`](https://github.com/cubrid-labs/cubrid-client) — modern TypeScript CUBRID driver
- CUBRID-specific types: `SET`, `MULTISET`, `SEQUENCE`, `MONETARY`
- MySQL-compatible SQL generation via drizzle-orm's `mysql-core`
- Transaction support with savepoints

## Requirements

- Node.js 18+
- Drizzle ORM 0.38+
- [cubrid-client](https://github.com/cubrid-labs/cubrid-client) 0.1.0+

## Installation

```bash
npm install drizzle-cubrid drizzle-orm cubrid-client
```

## Quick Start

### Define Schema

```typescript
import { cubridTable, int, varchar } from 'drizzle-cubrid';

export const users = cubridTable('users', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 200 }).unique(),
});
```

### Query

```typescript
import { createClient } from 'cubrid-client';
import { drizzle } from 'drizzle-cubrid';
import { eq } from 'drizzle-orm';
import { users } from './schema';

const client = createClient({
  host: 'localhost',
  port: 33000,
  database: 'demodb',
  user: 'dba',
});

const db = drizzle(client);

// Insert
await db.insert(users).values({ name: 'Alice', email: 'alice@example.com' });

// Select
const allUsers = await db.select().from(users);

// Where clause
const alice = await db.select().from(users).where(eq(users.name, 'Alice'));

// Update
await db.update(users).set({ name: 'Bob' }).where(eq(users.id, 1));

// Delete
await db.delete(users).where(eq(users.id, 1));
```

## CUBRID-Specific Types

```typescript
import { cubridTable, int, varchar } from 'drizzle-cubrid';
import { set, multiset, sequence, monetary } from 'drizzle-cubrid';

export const products = cubridTable('products', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 100 }),
  tags: set('tags', 'VARCHAR(50)'),
  categories: multiset('categories', 'VARCHAR(50)'),
  rankings: sequence('rankings', 'INTEGER'),
  price: monetary('price'),
});
```

## Transactions

```typescript
await db.transaction(async (tx) => {
  await tx.insert(users).values({ name: 'Alice', email: 'alice@example.com' });
  await tx.insert(users).values({ name: 'Bob', email: 'bob@example.com' });
});
```

## Ecosystem

| Layer | Package | Description |
|-------|---------|-------------|
| Driver | [cubrid-client](https://github.com/cubrid-labs/cubrid-client) | TypeScript CUBRID driver |
| ORM Dialect | [drizzle-cubrid](https://github.com/cubrid-labs/drizzle-cubrid) | Drizzle ORM dialect (this package) |
| Python Driver | [pycubrid](https://github.com/cubrid-labs/pycubrid) | Pure Python CUBRID driver |
| Python ORM | [sqlalchemy-cubrid](https://github.com/cubrid-labs/sqlalchemy-cubrid) | SQLAlchemy 2.0 dialect |
| Cookbook | [cubrid-cookbook](https://github.com/cubrid-labs/cubrid-cookbook) | Usage examples & recipes |

## Contributing

Contributions welcome! Please open an issue or submit a pull request.

## License

MIT — see [LICENSE](LICENSE).
