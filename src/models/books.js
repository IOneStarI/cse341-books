import { getDb } from '../db/connect.js';

const bookProjection = { _id: 0, id: 1, authorId: 1, title: 1, publicationDate: 1 };

const getAllBooks = async () => {
  return await getDb()
    .collection('books')
    .find({})
    .project(bookProjection)
    .sort({ id: 1 })
    .toArray();
};

const getBookById = async (bookId) => {
  return await getDb().collection('books').findOne(
    { id: bookId },
    { projection: bookProjection }
  );
};

const authorExists = async (id) => {
  return await getDb().collection('authors').findOne({ id }, { projection: { _id: 1 } }) !== null;
};

const createBook = async (book) => {
  await getDb().collection('books').insertOne({ ...book });
  return book;
};

const updateBook = async (id, book) => {
  const result = await getDb().collection('books').updateOne({ id }, { $set: book });
  if (result.matchedCount === 0) {
    return null;
  }
  return { id, ...book };
};

const deleteBook = async (id) => {
  const result = await getDb().collection('books').deleteOne({ id });
  return result.deletedCount === 1;
};

export { getAllBooks, getBookById, authorExists, createBook, updateBook, deleteBook };
