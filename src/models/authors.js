import { getDb } from '../db/connect.js';

const authorProjection = { _id: 0, id: 1, name: 1, birthYear: 1 };

const getAllAuthors = async () => {
  return await getDb().collection('authors').find({})
    .project(authorProjection).sort({ id: 1 }).toArray();
};

const getAuthorById = async (id) => {
  return await getDb().collection('authors').findOne({ id }, { projection: authorProjection });
};

const createAuthor = async (author) => {
  // insertOne adds _id to its input; keep that internal field out of the response.
  await getDb().collection('authors').insertOne({ ...author });
  return author;
};

const updateAuthor = async (id, author) => {
  const result = await getDb().collection('authors').updateOne({ id }, { $set: author });
  if (result.matchedCount === 0) {
    return null;
  }
  return { id, ...author };
};

const deleteAuthor = async (id) => {
  const result = await getDb().collection('authors').deleteOne({ id });
  return result.deletedCount === 1;
};

const authorHasBooks = async (id) => {
  const book = await getDb().collection('books').findOne({ authorId: id }, { projection: { _id: 1 } });
  return book !== null;
};

export { getAllAuthors, getAuthorById, createAuthor, updateAuthor, deleteAuthor, authorHasBooks };
