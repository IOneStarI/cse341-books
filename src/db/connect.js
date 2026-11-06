import { MongoClient } from 'mongodb';

let database;

const connectToDb = async () => {
  const connectionString = process.env.MONGODB_URI;
  if (!connectionString) {
    throw new Error('MONGODB_URI is required.');
  }

  const client = new MongoClient(connectionString);
  try {
    await client.connect();
    const connectedDatabase = client.db(process.env.MONGODB_DB_NAME || 'cse341-books-db');
    await connectedDatabase.collection('authors').createIndex({ id: 1 }, { unique: true });
    await connectedDatabase.collection('books').createIndex({ id: 1 }, { unique: true });
    await connectedDatabase.collection('books').createIndex({ authorId: 1 });
    database = connectedDatabase;
    return database;
  } catch (error) {
    await client.close();
    throw error;
  }
};

const getDb = () => {
  if (!database) {
    throw new Error('Database not initialized. Call connectToDb first.');
  }
  return database;
};

export { connectToDb, getDb };
