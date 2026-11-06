# Books API Week 02 Spec - Version 1

## Feature 1: Book CRUD Operations and Author References

### Goal
Update the existing Week 01 book API so book documents include a reference to an author and the API supports all CRUD operations for books. Every book route must be documented and testable in Swagger.

### Data Model
Book documents will be stored in the `books` collection.

Required book fields:
- `id`: string, required, custom id such as `b1`
- `authorId`: string, required, references the `id` field of an author document
- `title`: string, required
- `publicationDate`: string, required

Books will continue to use custom string ids instead of MongoDB `_id` values for route parameters.

### Relationship to Authors
Each book will identify its author with an `authorId` field. The value of `authorId` must match the custom `id` value of an existing author document.

When creating or updating a book, the API should reject the request with a `400` status code if the submitted `authorId` does not match an existing author.

### Routes

#### GET /books
Purpose: Return all books.

Success:
- Status code: `200`
- Response body: an array of book objects

Errors:
- `500` if an unexpected server or database error occurs

#### GET /books/:id
Purpose: Return one book by its custom id.

Success:
- Status code: `200`
- Response body: the matching book object

Errors:
- `404` if no book exists with that id
- `500` if an unexpected server or database error occurs

#### POST /books
Purpose: Create a new book.

Request body:

    {
      "id": "b4",
      "authorId": "a1",
      "title": "Example Book Title",
      "publicationDate": "2026-01-15"
    }

Success:
- Status code: `201`
- Response body: the newly created book object

Errors:
- `400` if a required field is missing
- `400` if the `id` already exists
- `400` if the `authorId` does not match an existing author
- `500` if an unexpected server or database error occurs

#### PUT /books/:id
Purpose: Update an existing book.

Request body:

    {
      "authorId": "a2",
      "title": "Updated Book Title",
      "publicationDate": "2026-02-20"
    }

Success:
- Status code: `200`
- Response body: the updated book object

Errors:
- `400` if a required field is missing
- `400` if the `authorId` does not match an existing author
- `404` if no book exists with that id
- `500` if an unexpected server or database error occurs

#### DELETE /books/:id
Purpose: Delete an existing book.

Success:
- Status code: `204`
- Response body: none

Errors:
- `404` if no book exists with that id
- `500` if an unexpected server or database error occurs

### Swagger Documentation
Swagger must document every book route.

### Deployment Expectations
After implementation, the book routes must work locally and from the deployed Render application. The deployed Swagger page at `/api-docs` must allow someone to test every book route from the browser.

## Feature 2: Author CRUD Operations — Version 1

### Goal and data model

Create an `authors` collection in `cse341-books-db` with at least three initial documents. Each author has a required custom string `id`, a required string `name`, and a required integer `birthYear`. Example:

```json
{ "id": "a1", "name": "Maya Rivera", "birthYear": 1980 }
```

### Routes

| Route | Request | Success | Errors |
|---|---|---|---|
| GET /authors | None | 200, author array | 500 |
| GET /authors/:id | Author id in path | 200, author object | 404 if missing; 500 |
| POST /authors | `id`, `name`, `birthYear` | 201, created author | 400 for missing fields or duplicate id; 500 |
| PUT /authors/:id | `name`, `birthYear` | 200, updated author | 400 for missing fields; 404 if missing; 500 |
| DELETE /authors/:id | Author id in path | 204, no body | 404 if missing; 409 if referenced by books; 500 |

POST example: `{ "id": "a4", "name": "Example Author", "birthYear": 1980 }`.

PUT example: `{ "name": "Updated Author", "birthYear": 1981 }`.

Errors use a JSON `message` field. Missing authors return `{ "message": "Author not found" }`; unexpected failures return `{ "message": "Internal server error" }`. Author ids cannot change on update. Block deletion while any book has a matching `authorId`.

### Documentation and deployment

Document all five author routes in Swagger, including request examples and response status codes. Verify each route locally and on Render using `/api-docs`.

# Evaluation of Version 1

- Missing and invalid are different: define types, whitespace handling, valid dates, integer birth years, and unexpected fields.
- Define whether PUT accepts partial updates or changes ids. Require every mutable field and keep ids fixed.
- Define duplicate handling consistently; a unique index must also protect against simultaneous duplicate creates.
- A successful update may change nothing. Check `matchedCount`, not `modifiedCount`, to decide whether to return 404.
- MongoDB adds `_id` to stored objects. Return only the public fields, including after insert operations.
- Unknown `authorId` values must be rejected on both create and update. An author with dependent books must return 409 when deleted.
- Do not forward client objects directly as MongoDB filters or updates. Validate scalar fields and construct allowed write objects explicitly.
- Specify safe JSON errors, including malformed JSON and absent request bodies. Keep credentials in environment variables and internal error details out of client responses.
- Add indexes for custom ids and the book-author reference. Return stable list ordering. Full-list reads are acceptable for this small assignment; pagination is deferred.
- Preserve existing book titles, ids, and dates during migration. Replace the author-name field only after the referenced author exists.
- Reference checks span collections and are not database foreign-key constraints. Without transactions, concurrent book creation and author deletion can race. This course implementation uses explicit checks; transactional guarantees across concurrent relationship changes are outside scope.

# Books API Week 02 Spec — Version 2

This version is the implementation contract for both features. Database: `cse341-books-db`. Existing Week 1 read routes remain available while the authors feature is implemented; their book schema changes with the books feature.

## Shared rules

- API requests and nonempty responses use JSON. Errors have exactly `{ "message": "..." }`; 204 responses have no body.
- POST and PUT require a JSON object, not null or an array. Missing, malformed, or invalid bodies return 400. Reject fields not listed for that request, including `_id` and `id` on PUT.
- Malformed JSON returns `{ "message": "Invalid request body" }`. Requests exceeding Express's 100 KB JSON body limit return 413 `{ "message": "Request body too large" }`.
- Trim surrounding whitespace from string body inputs before validating and storing. Ids are case-sensitive, 1–64 characters, and contain only ASCII letters, digits, hyphens, or underscores. Route ids remain custom strings; no ObjectId conversion is used.
- Titles and names must be nonempty strings of at most 200 characters after trimming.
- POST requires the id; PUT requires all mutable fields and cannot change the existing id. A PUT sending unchanged valid values still returns 200.
- List responses are arrays sorted by `id` ascending; an empty collection returns `[]` with 200. Single-resource responses are objects. Exclude `_id` and unspecified database fields from all responses.
- Validate request shape first. For valid update input, check resource existence before relationship validity: missing resources return 404. Invalid input returns 400 even if the path id does not identify an existing resource.
- Construct write fields explicitly and check MongoDB write results. Never use upsert for API updates. Use `matchedCount` for update not-found behavior and `deletedCount` for delete not-found behavior.
- Enforce a unique index on `authors.id` and `books.id`; return 400 for duplicate ids, including MongoDB duplicate-key errors. Index `books.authorId` for reference checks.
- All unexpected failures return 500 with `{ "message": "Internal server error" }`. Log a useful operation message on the server without printing credentials or request bodies.
- Keep the existing router → controller → model structure, ESM, arrow functions, async/await, explicit response returns, and course ESLint rules.
- No authentication, PATCH, pagination, embedded author objects, or `$lookup` is required for Week 2.

## Feature 1: Book CRUD Operations and Author References

### Data model and migration

Public book fields:

| Field | Validation |
|---|---|
| `id` | Required custom string id, unique and immutable |
| `authorId` | Required custom string id of an existing author |
| `title` | Required nonempty string, at most 200 characters |
| `publicationDate` | Required real calendar date in `YYYY-MM-DD`, years 0001–9999; reject impossible dates such as February 30 |

```json
{ "id": "b1", "authorId": "a1", "title": "Patterns of Light", "publicationDate": "2021-08-17" }
```

Seed authors before changing books. Preserve each existing book's id, title, and publication date. Map Maya Rivera → a1, Noah Chen → a2, Ava Morgan → a3. Set `authorId`, then remove the legacy `author` field. Check all book references before marking migration complete. Keep reproducible seed data; migration must not overwrite later user edits or delete unrelated documents when rerun.

### Routes and responses

| Route | Success | Expected errors |
|---|---|---|
| GET /books | 200, array of public books | 500 |
| GET /books/:id | 200, public book | 404 `Book not found`; 500 |
| POST /books | 201, created public book | 400 invalid input, duplicate id, or missing author; 500 |
| PUT /books/:id | 200, updated public book, including unchanged values | 400 invalid input or missing author; 404 `Book not found`; 500 |
| DELETE /books/:id | 204, no body | 404 `Book not found`; 500 |

POST body:

```json
{ "id": "b4", "authorId": "a1", "title": "Example Book Title", "publicationDate": "2026-01-15" }
```

PUT body:

```json
{ "authorId": "a2", "title": "Updated Book Title", "publicationDate": "2026-02-20" }
```

Create/update checks the submitted author by `authors.id`; an absent author returns 400 `{ "message": "Author does not exist" }`. Invalid book input returns 400 `{ "message": "Invalid book data" }`. Duplicate book ids return 400 `{ "message": "Book id already exists" }`.

### Swagger and deployment

Document all five book routes with OpenAPI 3 comments immediately above the route definitions in `src/router.js`. Include schemas, required fields, path parameters, request examples, JSON success/error bodies, and every status listed above. DELETE 204 documents no content. Use the current server (`/`) so Try it out targets the local or deployed API being visited. Regenerate and commit `swagger.json`.

Verify each route locally and on Render through `/api-docs`. Confirm stored data in Atlas matches returned objects. Test writes with temporary ids, delete only those temporary records, and retain the original seed books and authors.

## Feature 2: Author CRUD Operations

### Data model and initial data

Public author fields:

| Field | Validation |
|---|---|
| `id` | Required custom string id, unique and immutable |
| `name` | Required nonempty string, at most 200 characters |
| `birthYear` | Required JSON integer from 1 through the current UTC year; strings, null, fractional years, and future years are invalid |

Initial fictional authors:

```json
[
  { "id": "a1", "name": "Maya Rivera", "birthYear": 1980 },
  { "id": "a2", "name": "Noah Chen", "birthYear": 1975 },
  { "id": "a3", "name": "Ava Morgan", "birthYear": 1985 }
]
```

### Routes and responses

| Route | Success | Expected errors |
|---|---|---|
| GET /authors | 200, sorted array of public authors | 500 |
| GET /authors/:id | 200, public author | 404 `Author not found`; 500 |
| POST /authors | 201, created public author | 400 invalid input or duplicate id; 500 |
| PUT /authors/:id | 200, updated public author, including unchanged values | 400 invalid input; 404 `Author not found`; 500 |
| DELETE /authors/:id | 204, no body | 404 `Author not found`; 409 if referenced; 500 |

POST body:

```json
{ "id": "a4", "name": "Example Author", "birthYear": 1980 }
```

PUT body:

```json
{ "name": "Updated Author", "birthYear": 1981 }
```

Invalid author input returns 400 `{ "message": "Invalid author data" }`. Duplicate author ids return 400 `{ "message": "Author id already exists" }`.

Before deleting an existing author, query `books` for its `authorId`. If any book references it, retain the author and all books, and return 409 `{ "message": "Author cannot be deleted because they still have books" }`. Otherwise delete and return 204. Do not cascade-delete books.

### Swagger and deployment

Document all five author routes, including birth-year validation, required bodies, public schemas, path parameters, and 200/201/204/400/404/409/500 where applicable. Generate and commit `swagger.json`. Test every route locally and on Render using `/api-docs` and temporary records. Check that the Week 1 book read routes still work after the authors feature is deployed.

## Implementation order and completion evidence

1. Create the two required issues with their feature spec and Test Plan.
2. Implement authors on `implement-author-api`. First complete GET /authors end to end, including Swagger, then add the other author routes. Test the 409 relationship rule using a temporary book with `authorId`, and remove that fixture afterward.
3. Open a linked PR, review and merge it, verify the deployed author routes, then update local main.
4. Implement the book migration and CRUD on `update-book-api`; update Swagger and verify all error cases and cross-collection behavior.
5. Open and merge the book PR, verify all deployed routes, and retest authors. Record actual verification results on each issue/PR; do not mark unperformed browser checks as completed.
6. Record a video under three minutes following Part 4. The student completes the reflection personally, as instructed by the assignment.
