# Books API

Express and MongoDB API for CSE 341. The current version supports full author CRUD and the existing book read routes. See [the Week 2 specification](./spec-week02.md) for the API contract.

- Hosted API: https://cse341-books-2k8e.onrender.com
- Swagger UI: https://cse341-books-2k8e.onrender.com/api-docs/

## Local setup

Use Node.js 24 or later. Install dependencies with `npm ci`, copy `.env.example` to `.env`, and set the connection string locally:

```text
PORT=3000
MONGODB_URI=<your MongoDB connection string>
MONGODB_DB_NAME=cse341-books-db
```

Keep `.env` private. On Render, configure environment variables and start with `node server.js`; Render supplies `PORT`.

```sh
npm run seed:authors
npm run dev
```

The author seed inserts missing sample authors and preserves existing records. Startup ensures author ids have a unique index and book author references have an index.

Open http://localhost:3000/api-docs/ to test routes using **Try it out** and **Execute**. Write-route examples use `a4`; choose an unused id and delete your temporary author after testing. Deleting an author referenced by a book returns 409 and preserves both records.

## Checks

```sh
npm run swagger
npm run lint
npm test
```

Regenerate and commit `swagger.json` whenever OpenAPI comments or schemas change. `swagger-jsdoc` is a development dependency; production serves the committed document.

The integration tests use the MongoDB connection from `.env` but select a fresh random `cse341_test_...` database. They check CRUD, validation, duplicate-create races, update results, relationship conflicts, and safe errors, then drop only that generated test database. The database user needs permission to create and remove that test database. Tests do not write to the configured books database.

The reference checks are application-level checks, not cross-collection transactional guarantees. See the specification for concurrency limits and the planned book migration.
