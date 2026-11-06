import { getAllBooks, getBookById, authorExists, createBook, updateBook, deleteBook } from '../models/books.js';
import { getBookInput } from '../validation/books.js';

const getBooksHandler = async (req, res) => {
  try {
    const books = await getAllBooks();
    return res.status(200).json(books);
  } catch {
    console.error('Failed to retrieve books.');
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getBookByIdHandler = async (req, res) => {
  const requestedId = req.params.id;

  try {
    const book = await getBookById(requestedId);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    return res.status(200).json(book);
  } catch {
    console.error('Failed to retrieve book by id.');
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const createBookHandler = async (req, res) => {
  const input = getBookInput(req.body, true);
  if (!input) {
    return res.status(400).json({ message: 'Invalid book data' });
  }
  try {
    if (await getBookById(input.id)) {
      return res.status(400).json({ message: 'Book id already exists' });
    }
    if (!await authorExists(input.authorId)) {
      return res.status(400).json({ message: 'Author does not exist' });
    }
    const book = await createBook(input);
    return res.status(201).json(book);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Book id already exists' });
    }
    console.error('Failed to create book.');
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const updateBookHandler = async (req, res) => {
  const input = getBookInput(req.body);
  if (!input) {
    return res.status(400).json({ message: 'Invalid book data' });
  }
  try {
    const requestedId = req.params.id;
    if (!await getBookById(requestedId)) {
      return res.status(404).json({ message: 'Book not found' });
    }
    if (!await authorExists(input.authorId)) {
      return res.status(400).json({ message: 'Author does not exist' });
    }
    const book = await updateBook(requestedId, input);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    return res.status(200).json(book);
  } catch {
    console.error('Failed to update book.');
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteBookHandler = async (req, res) => {
  try {
    if (!await deleteBook(req.params.id)) {
      return res.status(404).json({ message: 'Book not found' });
    }
    return res.status(204).send();
  } catch {
    console.error('Failed to delete book.');
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export { getBooksHandler, getBookByIdHandler, createBookHandler, updateBookHandler, deleteBookHandler };
