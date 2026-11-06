import { readFile } from 'node:fs/promises';
import { connectToDb } from '../src/db/connect.js';

let database;
try {
  const authors = JSON.parse(await readFile(new URL('../data/authors.json', import.meta.url), 'utf8'));
  database = await connectToDb();
  for (const author of authors) {
    await database.collection('authors').updateOne({ id: author.id }, { $setOnInsert: author }, { upsert: true });
  }
  console.log('Author seed complete. Existing author records were preserved.');
} catch {
  console.error('Author seed failed. Check database configuration and access.');
  process.exitCode = 1;
} finally {
  if (database) {
    await database.client.close();
  }
}
