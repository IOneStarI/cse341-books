import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import test from 'node:test';
import app from '../app.js';
import { connectToDb } from '../src/db/connect.js';
import swagger from '../swagger.json' with { type: 'json' };

test('Author API integration with an isolated Atlas test database', { timeout: 60000 }, async (t) => {
  const databaseName = `cse341_test_${randomUUID().replaceAll('-', '').slice(0, 24)}`;
  process.env.MONGODB_DB_NAME = databaseName;
  let database;
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const request = async (method, path, body, raw = false) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : raw ? body : JSON.stringify(body)
    });
    const text = await response.text();
    if (text) {
      assert(response.headers.get('content-type').includes('application/json'));
    }
    return { status: response.status, body: text ? JSON.parse(text) : null, text };
  };

  try {
    await t.test('all five database failure paths return safe 500 JSON', async () => {
      const cases = [
        ['GET', '/authors'], ['GET', '/authors/a1'],
        ['POST', '/authors', { id: 'a1', name: 'Test', birthYear: 1980 }],
        ['PUT', '/authors/a1', { name: 'Test', birthYear: 1980 }],
        ['DELETE', '/authors/a1']
      ];
      for (const [method, path, body] of cases) {
        const result = await request(method, path, body);
        assert.equal(result.status, 500);
        assert.deepEqual(result.body, { message: 'Internal server error' });
      }
    });

    database = await connectToDb();
    assert.equal(database.databaseName, databaseName);

    await t.test('empty lists and existing root/book routes work', async () => {
      assert.deepEqual((await request('GET', '/authors')).body, []);
      assert.equal((await request('GET', '/authors')).status, 200);
      assert.equal((await request('GET', '/')).status, 200);
      assert.deepEqual((await request('GET', '/books')).body, []);
    });

    await t.test('create trims strings, persists data, and returns only public fields', async () => {
      const input = { id: ' test_author ', name: ' Example Author ', birthYear: 1980 };
      const created = await request('POST', '/authors', input);
      assert.equal(created.status, 201);
      assert.deepEqual(created.body, { id: 'test_author', name: 'Example Author', birthYear: 1980 });
      const stored = await database.collection('authors').findOne({ id: 'test_author' });
      assert(stored._id);
      assert.equal(stored.name, 'Example Author');
      const found = await request('GET', '/authors/test_author');
      assert.equal(found.status, 200);
      assert.deepEqual(found.body, created.body);
      const duplicate = await request('POST', '/authors', input);
      assert.equal(duplicate.status, 400);
      assert.deepEqual(duplicate.body, { message: 'Author id already exists' });
    });

    await t.test('invalid create and update bodies never modify data', async () => {
      const valid = { id: 'new_author', name: 'Valid', birthYear: 1980 };
      const invalid = [
        undefined, null, [], {}, { name: 'Missing year' },
        { ...valid, id: '' }, { ...valid, id: ' ' }, { ...valid, id: 1 },
        { ...valid, id: { $ne: null } }, { ...valid, id: 'bad.id' },
        { ...valid, id: 'a'.repeat(65) }, { ...valid, name: '' },
        { ...valid, name: ' ' }, { ...valid, name: 3 },
        { ...valid, name: 'a'.repeat(201) }, { ...valid, birthYear: '1980' },
        { ...valid, birthYear: null }, { ...valid, birthYear: 0 },
        { ...valid, birthYear: -1 }, { ...valid, birthYear: 1980.5 },
        { ...valid, birthYear: new Date().getUTCFullYear() + 1 },
        { ...valid, extra: true }, { ...valid, _id: 'client-id' }
      ];
      const before = await database.collection('authors').find({}).toArray();
      for (const body of invalid) {
        assert.equal((await request('POST', '/authors', body)).status, 400);
      }
      const invalidUpdates = [undefined, null, [], {}, { name: 'Missing year' },
        { birthYear: 1980 }, { name: 'Valid', birthYear: '1980' },
        { name: ' ', birthYear: 1980 }, { name: 'Valid', birthYear: 1980, id: 'new_id' },
        { name: 'Valid', birthYear: 1980, extra: true }];
      for (const body of invalidUpdates) {
        assert.equal((await request('PUT', '/authors/test_author', body)).status, 400);
      }
      assert.deepEqual(await database.collection('authors').find({}).toArray(), before);
    });

    await t.test('unique index rejects concurrent duplicate creates', async () => {
      const body = { id: 'parallel_author', name: 'Concurrent Author', birthYear: 1980 };
      const results = await Promise.all([
        request('POST', '/authors', body), request('POST', '/authors', body)
      ]);
      assert.deepEqual(results.map((result) => { return result.status; }).sort(), [201, 400]);
      assert.equal(await database.collection('authors').countDocuments({ id: body.id }), 1);
    });

    await t.test('updates preserve ids and accept unchanged valid values', async () => {
      const body = { name: ' Updated Name ', birthYear: 1981 };
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const result = await request('PUT', '/authors/test_author', body);
        assert.equal(result.status, 200);
        assert.deepEqual(result.body, { id: 'test_author', name: 'Updated Name', birthYear: 1981 });
      }
      assert.equal((await request('PUT', '/authors/missing', body)).status, 404);
      assert.equal(await database.collection('authors').countDocuments({ id: 'missing' }), 0);
    });

    await t.test('deletion conflicts preserve related data; unreferenced deletion returns empty 204', async () => {
      const book = { id: 'test_book', authorId: 'test_author', title: 'Fixture', publicationDate: '2021-01-01' };
      await database.collection('books').insertOne(book);
      const authorBefore = await database.collection('authors').findOne({ id: 'test_author' });
      const result = await request('DELETE', '/authors/test_author');
      assert.equal(result.status, 409);
      assert.deepEqual(result.body, { message: 'Author cannot be deleted because they still have books' });
      assert.deepEqual(await database.collection('authors').findOne({ id: 'test_author' }), authorBefore);
      assert.equal(await database.collection('books').countDocuments({ id: 'test_book' }), 1);
      await database.collection('books').deleteOne({ id: 'test_book' });
      const removed = await request('DELETE', '/authors/test_author');
      assert.equal(removed.status, 204);
      assert.equal(removed.text, '');
      for (const method of ['GET', 'DELETE']) {
        const missing = await request(method, '/authors/test_author');
        assert.equal(missing.status, 404);
        assert.deepEqual(missing.body, { message: 'Author not found' });
      }
    });

    await t.test('birth-year boundaries, sorting, and additional database fields', async () => {
      for (const [id, birthYear] of [['z_author', 1], ['a_author', new Date().getUTCFullYear()]]) {
        assert.equal((await request('POST', '/authors', { id, name: 'Boundary', birthYear })).status, 201);
      }
      await database.collection('authors').updateOne({ id: 'a_author' }, { $set: { internalNote: 'Not public' } });
      const list = await request('GET', '/authors');
      assert.equal(list.status, 200);
      const ids = list.body.map((author) => { return author.id; });
      assert.deepEqual(ids, [...ids].sort());
      for (const author of list.body) {
        assert.deepEqual(Object.keys(author).sort(), ['birthYear', 'id', 'name']);
      }
    });

    await t.test('malformed and oversized JSON return safe errors', async () => {
      const malformed = await request('POST', '/authors', '{invalid', true);
      assert.equal(malformed.status, 400);
      assert.deepEqual(malformed.body, { message: 'Invalid request body' });
      const oversized = await request('POST', '/authors', { id: 'big', name: 'x'.repeat(110000), birthYear: 1980 });
      assert.equal(oversized.status, 413);
      assert.deepEqual(oversized.body, { message: 'Request body too large' });
    });

    await t.test('Swagger includes every author route and applicable response', async () => {
      for (const [path, method, codes] of [
        ['/authors', 'get', [200, 500]], ['/authors', 'post', [201, 400, 413, 500]],
        ['/authors/{id}', 'get', [200, 404, 500]], ['/authors/{id}', 'put', [200, 400, 404, 413, 500]],
        ['/authors/{id}', 'delete', [204, 404, 409, 500]]
      ]) {
        for (const code of codes) { assert(swagger.paths[path][method].responses[code]); }
      }
      assert(!swagger.paths['/authors/{id}'].delete.responses[204].content);
      const ui = await fetch(`${baseUrl}/api-docs/`);
      assert.equal(ui.status, 200);
      assert((await ui.text()).includes('Swagger UI'));
    });
  } finally {
    await new Promise((resolve) => { server.close(resolve); });
    if (database) {
      try {
        assert.equal(database.databaseName, databaseName);
        assert(databaseName.startsWith('cse341_test_'));
        await database.dropDatabase();
      } finally {
        await database.client.close();
      }
    }
  }
});
