import { connectToDb } from '../src/db/connect.js';
import { migrateBooks } from '../src/db/migrate-books.js';

let database;
try {
  const args = process.argv.slice(2);
  if (args.some((argument) => { return argument !== '--keep-author'; })) {
    throw new Error('Unknown migration option.');
  }
  database = await connectToDb();
  const result = await migrateBooks(database, { keepAuthor: args.includes('--keep-author') });
  console.log('Book migration complete:', result);
} catch {
  console.error('Book migration failed. Check database access and ensure every book can be matched to an existing author.');
  process.exitCode = 1;
} finally {
  if (database) {
    await database.client.close();
  }
}
