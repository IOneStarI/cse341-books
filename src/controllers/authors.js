import {
  getAllAuthors, getAuthorById, createAuthor, updateAuthor, deleteAuthor, authorHasBooks
} from '../models/authors.js';
import { getAuthorInput } from '../validation/authors.js';

const getAuthorsHandler = async (req, res) => {
  try {
    const authors = await getAllAuthors();
    return res.status(200).json(authors);
  } catch {
    console.error('Failed to retrieve authors.');
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getAuthorByIdHandler = async (req, res) => {
  try {
    const author = await getAuthorById(req.params.id);
    if (!author) {
      return res.status(404).json({ message: 'Author not found' });
    }
    return res.status(200).json(author);
  } catch {
    console.error('Failed to retrieve author.');
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const createAuthorHandler = async (req, res) => {
  const input = getAuthorInput(req.body, true);
  if (!input) {
    return res.status(400).json({ message: 'Invalid author data' });
  }

  try {
    const author = await createAuthor(input);
    return res.status(201).json(author);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Author id already exists' });
    }
    console.error('Failed to create author.');
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const updateAuthorHandler = async (req, res) => {
  const input = getAuthorInput(req.body);
  if (!input) {
    return res.status(400).json({ message: 'Invalid author data' });
  }

  try {
    const author = await updateAuthor(req.params.id, input);
    if (!author) {
      return res.status(404).json({ message: 'Author not found' });
    }
    return res.status(200).json(author);
  } catch {
    console.error('Failed to update author.');
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteAuthorHandler = async (req, res) => {
  try {
    const requestedId = req.params.id;
    if (!await getAuthorById(requestedId)) {
      return res.status(404).json({ message: 'Author not found' });
    }
    if (await authorHasBooks(requestedId)) {
      return res.status(409).json({ message: 'Author cannot be deleted because they still have books' });
    }
    if (!await deleteAuthor(requestedId)) {
      return res.status(404).json({ message: 'Author not found' });
    }
    return res.status(204).send();
  } catch {
    console.error('Failed to delete author.');
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export { getAuthorsHandler, getAuthorByIdHandler, createAuthorHandler, updateAuthorHandler, deleteAuthorHandler };
