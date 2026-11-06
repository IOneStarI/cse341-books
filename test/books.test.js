import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import test from 'node:test';
import app from '../app.js';
import { connectToDb } from '../src/db/connect.js';
import { migrateBooks } from '../src/db/migrate-books.js';
import seedAuthors from '../data/authors.json' with { type: 'json' };
import swagger from '../swagger.json' with { type: 'json' };

test('Book CRUD and migration with an isolated Atlas test database', { timeout: 60000 }, async (t) => {
  const databaseName = `cse341_test_${randomUUID().replaceAll('-', '').slice(0, 24)}`;
  process.env.MONGODB_DB_NAME = databaseName;
  let database;
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const valid = { id: 'test_book', authorId: 'a1', title: 'Test Book', publicationDate: '2024-02-29' };
  const request = async (method, path, body, raw = false) => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : raw ? body : JSON.stringify(body)
    });
    const text = await response.text();
    if (text) { assert(response.headers.get('content-type').includes('application/json')); }
    return { status: response.status, body: text ? JSON.parse(text) : null, text };
  };
  try {
    await t.test('all five handlers return safe 500 JSON without a database', async () => {
      for (const [method, path, body] of [
        ['GET', '/books'], ['GET', '/books/test_book'], ['POST', '/books', valid],
        ['PUT', '/books/test_book', { authorId: 'a1', title: 'Update', publicationDate: '2021-01-01' }],
        ['DELETE', '/books/test_book']
      ]) {
        const result = await request(method, path, body);
        assert.equal(result.status, 500);
        assert.deepEqual(result.body, { message: 'Internal server error' });
      }
    });
    database = await connectToDb();
    assert.equal(database.databaseName, databaseName);
    await database.collection('authors').insertMany(seedAuthors.map((author) => { return { ...author }; }));

    await t.test('empty list and valid create/read use the new public schema', async () => {
      const empty = await request('GET', '/books');
      assert.equal(empty.status, 200);
      assert.deepEqual(empty.body, []);
      const created = await request('POST', '/books', { ...valid, id: ' test_book ', title: ' Test Book ', authorId: ' a1 ', publicationDate: ' 2024-02-29 ' });
      assert.equal(created.status, 201);
      assert.deepEqual(created.body, valid);
      const stored = await database.collection('books').findOne({ id: valid.id });
      assert(stored._id);
      assert.equal(stored.authorId, 'a1');
      assert(!Object.hasOwn(stored, 'author'));
      assert.deepEqual((await request('GET', '/books/test_book')).body, valid);
      assert.deepEqual((await request('GET', '/books')).body, [valid]);
    });

    await t.test('invalid fields and calendar dates are rejected without writes', async () => {
      const invalid = [undefined, null, [], {}, { ...valid, id: '' }, { ...valid, id: 'bad.id' },
        { ...valid, id: 'x'.repeat(65) }, { ...valid, id: { $ne: null } },
        { ...valid, authorId: '' }, { ...valid, authorId: 3 }, { ...valid, authorId: { $ne: null } },
        { ...valid, title: '' }, { ...valid, title: ' ' }, { ...valid, title: 3 },
        { ...valid, title: 'x'.repeat(201) }, { ...valid, publicationDate: 2024 },
        { ...valid, publicationDate: '2024-2-01' }, { ...valid, publicationDate: '2023-02-29' },
        { ...valid, publicationDate: '1900-02-29' }, { ...valid, publicationDate: '2024-02-30' },
        { ...valid, publicationDate: '2024-04-31' }, { ...valid, publicationDate: '0000-01-01' },
        { ...valid, publicationDate: '2024-13-01' }, { ...valid, publicationDate: '2024-01-00' },
        { ...valid, publicationDate: '2024-01-01T00:00:00Z' },
        { ...valid, author: 'Client name' }, { ...valid, _id: 'client-id' }];
      for (const field of ['authorId', 'title', 'publicationDate']) {
        const missing = { ...valid };
        delete missing[field];
        invalid.push(missing);
      }
      const before = await database.collection('books').find({}).toArray();
      for (const body of invalid) { assert.equal((await request('POST', '/books', body)).status, 400); }
      for (const body of [undefined, null, [], {}, { title: 'Incomplete' },
        { authorId: 'a1', title: 'Bad date', publicationDate: '2023-02-29' }, valid]) {
        assert.equal((await request('PUT', '/books/test_book', body)).status, 400);
      }
      assert.deepEqual(await database.collection('books').find({}).toArray(), before);
    });

    await t.test('duplicate and concurrent creates cannot insert duplicate ids', async () => {
      const duplicate = await request('POST', '/books', valid);
      assert.equal(duplicate.status, 400);
      assert.deepEqual(duplicate.body, { message: 'Book id already exists' });
      const input = { ...valid, id: 'parallel_book' };
      const results = await Promise.all([request('POST', '/books', input), request('POST', '/books', input)]);
      assert.deepEqual(results.map((result) => { return result.status; }).sort(), [201, 400]);
      assert.equal(await database.collection('books').countDocuments({ id: input.id }), 1);
    });

    await t.test('unknown authors reject creates and updates; not-found update takes precedence', async () => {
      const create = await request('POST', '/books', { ...valid, id: 'orphan', authorId: 'missing' });
      assert.equal(create.status, 400);
      assert.deepEqual(create.body, { message: 'Author does not exist' });
      assert.equal(await database.collection('books').countDocuments({ id: 'orphan' }), 0);
      const input = { authorId: 'missing', title: 'Update', publicationDate: '2021-01-01' };
      const before = await database.collection('books').findOne({ id: valid.id });
      assert.equal((await request('PUT', '/books/test_book', input)).status, 400);
      assert.deepEqual(await database.collection('books').findOne({ id: valid.id }), before);
      const missing = await request('PUT', '/books/missing', input);
      assert.equal(missing.status, 404);
      assert.deepEqual(missing.body, { message: 'Book not found' });
    });

    await t.test('valid updates and unchanged updates preserve ids', async () => {
      const body = { authorId: 'a2', title: 'Updated Book', publicationDate: '2026-02-20' };
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const result = await request('PUT', '/books/test_book', body);
        assert.equal(result.status, 200);
        assert.deepEqual(result.body, { id: 'test_book', ...body });
      }
      assert.equal((await request('GET', '/books/missing')).status, 404);
    });

    await t.test('calendar boundaries and sorted lists expose only public fields', async () => {
      for (const [index, date] of ['0001-01-01', '2000-02-29', '9999-12-31'].entries()) {
        assert.equal((await request('POST', '/books', { ...valid, id: `date_${index}`, publicationDate: date })).status, 201);
      }
      await database.collection('books').updateOne({ id: 'test_book' }, { $set: { internalNote: 'Not public' } });
      const list = (await request('GET', '/books')).body;
      const ids = list.map((book) => { return book.id; });
      assert.deepEqual(ids, [...ids].sort());
      for (const book of list) { assert.deepEqual(Object.keys(book).sort(), ['authorId', 'id', 'publicationDate', 'title']); }
    });

    await t.test('book references block author deletion until the book is deleted', async () => {
      const author = { id: 'temporary_author', name: 'Temporary', birthYear: 1980 };
      assert.equal((await request('POST', '/authors', author)).status, 201);
      assert.equal((await request('POST', '/books', { ...valid, id: 'related_book', authorId: author.id })).status, 201);
      assert.equal((await request('DELETE', `/authors/${author.id}`)).status, 409);
      const removed = await request('DELETE', '/books/related_book');
      assert.equal(removed.status, 204);
      assert.equal(removed.text, '');
      const missing = await request('DELETE', '/books/related_book');
      assert.equal(missing.status, 404);
      assert.deepEqual(missing.body, { message: 'Book not found' });
      assert.equal((await request('GET', `/authors/${author.id}`)).status, 200);
      assert.equal((await request('DELETE', `/authors/${author.id}`)).status, 204);
    });

    await t.test('migration preflight, staged cleanup, and reruns preserve user edits', async () => {
      const legacy = { id: 'legacy_book', author: 'Maya Rivera', title: 'Original title', publicationDate: '2021-08-17' };
      const modern = { id: 'modern_book', authorId: 'a2', author: 'Maya Rivera', title: 'Keep this title', publicationDate: '2020-01-01' };
      await database.collection('books').insertMany([{ ...legacy }, { ...modern }, { id: 'bad_legacy', author: 'Unknown author' }]);
      await assert.rejects(migrateBooks(database, { keepAuthor: true }), /valid author reference/);
      assert.equal((await database.collection('books').findOne({ id: legacy.id })).authorId, undefined);
      await database.collection('books').deleteOne({ id: 'bad_legacy' });
      const prepared = await migrateBooks(database, { keepAuthor: true });
      assert.equal(prepared.updated, 1);
      assert.equal((await database.collection('books').findOne({ id: legacy.id })).author, legacy.author);
      assert.equal((await database.collection('books').findOne({ id: legacy.id })).authorId, 'a1');
      assert.equal((await migrateBooks(database, { keepAuthor: true })).updated, 0);
      await database.collection('books').updateOne({ id: legacy.id }, { $set: { title: 'User edited title', authorId: 'a3' } });
      assert.equal((await migrateBooks(database)).updated, 2);
      const migrated = await database.collection('books').findOne({ id: legacy.id });
      assert.equal(migrated.title, 'User edited title');
      assert.equal(migrated.authorId, 'a3');
      assert.equal(migrated.publicationDate, legacy.publicationDate);
      assert(!Object.hasOwn(migrated, 'author'));
      const preserved = await database.collection('books').findOne({ id: modern.id });
      assert.equal(preserved.authorId, 'a2');
      assert.equal(preserved.title, modern.title);
      assert.equal((await migrateBooks(database)).updated, 0);
    });

    await t.test('malformed JSON, body limits, and all ten documented operations', async () => {
      assert.equal((await request('POST', '/books', '{invalid', true)).status, 400);
      assert.equal((await request('POST', '/books', { ...valid, title: 'x'.repeat(110000) })).status, 413);
      const paths = swagger.paths;
      assert.equal(Object.values(paths).reduce((total, path) => { return total + Object.keys(path).length; }, 0), 10);
      for (const [path, method, codes] of [
        ['/books', 'get', [200, 500]], ['/books', 'post', [201, 400, 413, 500]],
        ['/books/{id}', 'get', [200, 404, 500]], ['/books/{id}', 'put', [200, 400, 404, 413, 500]],
        ['/books/{id}', 'delete', [204, 404, 500]]
      ]) { for (const code of codes) { assert(paths[path][method].responses[code]); } }
      assert(!paths['/books/{id}'].delete.responses[204].content);
      assert.equal((await request('GET', '/authors/a1')).status, 200);
    });
  } finally {
    await new Promise((resolve) => { server.close(resolve); });
    if (database) {
      try {
        assert.equal(database.databaseName, databaseName);
        assert(databaseName.startsWith('cse341_test_'));
        await database.dropDatabase();
      } finally { await database.client.close(); }
    }
  }
});
