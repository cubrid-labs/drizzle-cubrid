# AGENTS.md

Project knowledge base for AI coding agents.

## Project Overview

**drizzle-cubrid** is a Drizzle ORM dialect for the CUBRID relational database.
It extends Drizzle's `mysql-core` infrastructure to provide type-safe schema definitions,
query building, and migration support for CUBRID via the `@cubrid/client` TypeScript driver.

- **Language**: TypeScript (ES2022+, strict mode)
- **Framework**: Drizzle ORM (mysql-core)
- **License**: MIT
- **Version**: 0.1.0

## Architecture

```
drizzle-cubrid/
├── src/
│   ├── index.ts              # Public API — drizzle(), schema, type exports
│   ├── driver.ts             # CubridDriver, CubridDatabase, drizzle() factory
│   ├── session.ts            # CubridSession, CubridPreparedQuery, CubridTransaction
│   ├── columns.ts            # Column type definitions (re-export mysql-core + CUBRID-specific)
│   ├── table.ts              # cubridTable() schema builder
│   └── types.ts              # CUBRID-specific types: SET, MULTISET, SEQUENCE, MONETARY
├── tests/
│   ├── session.test.ts       # Session/PreparedQuery/Transaction unit tests
│   ├── driver.test.ts        # drizzle() factory tests
│   ├── columns.test.ts       # Column type compilation tests
│   ├── types.test.ts         # Custom CUBRID type tests
│   ├── query.test.ts         # Query builder integration tests
│   └── integration.test.ts   # Live DB tests (Docker CUBRID)
├── docs/
│   └── PRD.md                # Product requirements document
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
└── README.md
```

### Module Responsibilities

| Module | Role |
|---|---|
| `driver.ts` | `CubridDriver` class creates sessions. `CubridDatabase` extends `MySqlDatabase`. `drizzle()` factory function creates database instance from `CubridClient`. |
| `session.ts` | `CubridSession` extends `MySqlSession` — bridges `@cubrid/client` into Drizzle's query system. `CubridPreparedQuery` extends `MySqlPreparedQuery` — executes SQL via `client.query()`. `CubridTransaction` extends `MySqlTransaction` — transaction lifecycle. |
| `columns.ts` | Re-exports all mysql-core column types + defines CUBRID-specific columns (SET, MULTISET, SEQUENCE, MONETARY). |
| `table.ts` | `cubridTable()` — table schema builder function (wraps `mysqlTable` with CUBRID defaults). |
| `types.ts` | Custom Drizzle column types for CUBRID: `CubridSet`, `CubridMultiset`, `CubridSequence`, `CubridMonetary`. |
| `index.ts` | Public API surface — re-exports everything users need. |

### Drizzle Extension Pattern

drizzle-cubrid follows the same pattern as `drizzle-orm/mysql2` and `drizzle-orm/mysql-proxy`:

```
MySqlDialect (from mysql-core)     — SQL generation (reused as-is)
    ↓
MySqlSession (abstract)            — Session interface
    ↓
CubridSession (our impl)          — Bridges @cubrid/client
    ↓
CubridPreparedQuery (our impl)    — Executes queries via client.query()
    ↓
CubridTransaction (our impl)      — Transaction lifecycle
    ↓
CubridDatabase extends MySqlDatabase — User-facing database instance
    ↓
drizzle(client) factory            — Entry point
```

### @cubrid/client API (Driver We Wrap)

```typescript
// Key interfaces from @cubrid/client
interface CubridClient {
  query<T>(sql: string, params?: QueryParams): Promise<T[]>;
  transaction<T>(callback: (tx: TransactionClient) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

interface TransactionClient {
  query<T>(sql: string, params?: QueryParams): Promise<T[]>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

type QueryParam = string | number | boolean | bigint | Date | Buffer | null;
type QueryParams = readonly QueryParam[];
type QueryResultRow = Record<string, unknown>;
```

## Development

### Setup

```bash
git clone https://github.com/cubrid-labs/drizzle-cubrid.git
cd drizzle-cubrid
npm install
```

### Key Commands

```bash
npm test              # Unit tests with vitest
npm run test:cov      # Tests with coverage (95% threshold)
npm run build         # Build ESM + CJS via tsup
npm run lint          # ESLint check
npm run format        # ESLint auto-fix
npm run typecheck     # tsc --noEmit
npm run integration   # Integration tests (requires Docker CUBRID)
```

### Docker (Integration Tests)

```bash
docker compose up -d                          # Default CUBRID 11.2
CUBRID_VERSION=11.4 docker compose up -d      # Specific version
export CUBRID_TEST_URL="cubrid://dba@localhost:33000/testdb"
npm run integration
docker compose down -v                        # Cleanup
```

## Code Conventions

### Style

- **Linter**: ESLint with @typescript-eslint
- **Formatter**: ESLint (no Prettier)
- **Line length**: 120 characters
- **Target**: ES2022, Node.js 18+
- **Imports**: ESM-first (`import/export`)
- **Type hints**: Full TypeScript strict mode, no `any` escapes
- **super()**: Always `super()`, never `super(ClassName, self)`

### Naming

- Classes: `CubridSession`, `CubridPreparedQuery`, `CubridTransaction`, `CubridDatabase`
- Test files: `tests/*.test.ts`
- Test descriptions: `describe('CubridSession', () => { it('should execute query', ...) })`

### Patterns to Follow

- All Drizzle entity classes must have `static readonly [entityKind]: string = 'ClassName'`
- Session methods follow the `MySqlSession` abstract contract exactly
- PreparedQuery follows the `MySqlPreparedQuery` abstract contract
- Use `fillPlaceholders()` from `drizzle-orm/sql` for parameter mapping
- Use `mapResultRow()` from `drizzle-orm/utils` for result mapping
- HKT types: `CubridQueryResultHKT`, `CubridPreparedQueryHKT` — required for type inference

### Anti-Patterns (Never Do)

- No `as any` — no type assertions to `any`
- No `@ts-ignore` or `@ts-expect-error`
- No raw SQL string interpolation (always parameterized)
- No empty `catch` blocks
- No `console.log` in production code (use Drizzle's Logger interface)

## Test Structure

```
tests/
├── session.test.ts        # CubridSession, CubridPreparedQuery, CubridTransaction
├── driver.test.ts         # drizzle() factory, CubridDriver, CubridDatabase
├── columns.test.ts        # All column type definitions and SQL compilation
├── types.test.ts          # SET, MULTISET, SEQUENCE, MONETARY custom types
├── query.test.ts          # Full query builder: SELECT, INSERT, UPDATE, DELETE
├── table.test.ts          # cubridTable() builder
└── integration.test.ts    # Live DB tests (skipped without CUBRID_TEST_URL)
```

### Testing Approach

- **Unit tests** — mock `@cubrid/client` with fake implementations
- **Query tests** — use Drizzle's `drizzle.mock()` or equivalent for SQL generation verification
- **Integration tests** — real CUBRID via Docker, guarded by env var

### Coverage

- Threshold: 95% (CI-enforced)
- Runner: vitest with c8/v8 provider

## CUBRID-Specific Knowledge

### Key Differences from MySQL

- **No RETURNING** — `INSERT/UPDATE/DELETE ... RETURNING` not supported
- **No native BOOLEAN** — mapped to `SMALLINT` (0/1)
- **No JSON type** — no JSON data type or functions
- **No ARRAY** — uses `SET`, `MULTISET`, `SEQUENCE` collection types
- **No Sequences** — uses `AUTO_INCREMENT` only
- **No RELEASE SAVEPOINT** — must skip in nested transactions
- **DDL auto-commits** — `transactional_ddl = false`
- **6 isolation levels** — standard 4 + class-level + instance-level
- **Identifier folding** — lowercase (not uppercase like SQL standard)
- **Max identifier length** — 254 characters
- **Paramstyle** — `?` positional (same as MySQL)

### Connection Format

```
SQLAlchemy URL: cubrid://user:password@host:port/dbname
CUBRID native:  CUBRID:host:port:dbname:::
@cubrid/client: createClient({ host, port, database, user, password })
```

## CI/CD

### Workflows

| File | Trigger | Purpose |
|---|---|---|
| `.github/workflows/ci.yml` | Push to main, PRs | Lint + typecheck + unit tests + integration |
| `.github/workflows/publish.yml` | GitHub Release | Build and publish to npm |

### CI Matrix

- **Unit**: Node.js 18, 20, 22
- **Integration**: Node.js {18, 20} × CUBRID {11.2, 11.4}

## Commit Convention

```
<type>: <description>

<body>

Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-opencode)
Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>
```

Types: `feat`, `fix`, `docs`, `chore`, `ci`, `style`, `test`, `refactor`

## Release Process

1. Update version in `package.json`
2. Add changelog entry in `CHANGELOG.md`
3. Commit, tag (`v{major}.{minor}.{patch}`), push with tags
4. Create GitHub release via `gh release create`
5. npm publish triggers automatically from the release
