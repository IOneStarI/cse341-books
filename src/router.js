import express from 'express';
import {
  getBooksHandler, getBookByIdHandler, createBookHandler, updateBookHandler, deleteBookHandler
} from './controllers/books.js';
import {
  getAuthorsHandler, getAuthorByIdHandler, createAuthorHandler, updateAuthorHandler, deleteAuthorHandler
} from './controllers/authors.js';

const router = express.Router();

/**
 * @openapi
 * /books:
 *   get:
 *     summary: Get all books
 *     tags: [Books]
 *     responses:
 *       200:
 *         description: All books, ordered by custom id; an empty collection returns an empty array.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Book'
 *       500:
 *         description: Unexpected server or database error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: Internal server error
 */
router.get('/books', getBooksHandler);
/**
 * @openapi
 * /books/{id}:
 *   get:
 *     summary: Get one book by custom id
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Custom book id, such as b1; not a MongoDB ObjectId.
 *         schema:
 *           type: string
 *         example: b1
 *     responses:
 *       200:
 *         description: Matching book.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       404:
 *         description: No book matches the supplied id.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: Book not found
 *       500:
 *         description: Unexpected server or database error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: Internal server error
 */
router.get('/books/:id', getBookByIdHandler);

/**
 * @openapi
 * /books:
 *   post:
 *     summary: Create a book
 *     description: All four fields are required. Strings are trimmed, unknown fields are rejected, and authorId must identify an existing author. Ids are unique and case-sensitive. Publication dates must be real calendar dates.
 *     tags: [Books]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Book'
 *           example:
 *             id: b4
 *             authorId: a1
 *             title: Example Book Title
 *             publicationDate: '2026-01-15'
 *     responses:
 *       201:
 *         description: Book created, with its author reference and no internal MongoDB fields.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       400:
 *         description: Invalid data, malformed JSON, duplicate id, or a missing author.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalid:
 *                 value:
 *                   message: Invalid book data
 *               duplicate:
 *                 value:
 *                   message: Book id already exists
 *               authorMissing:
 *                 value:
 *                   message: Author does not exist
 *               malformed:
 *                 value:
 *                   message: Invalid request body
 *       413:
 *         $ref: '#/components/responses/BodyTooLarge'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/books', createBookHandler);

/**
 * @openapi
 * /books/{id}:
 *   put:
 *     summary: Update a book
 *     description: All three mutable fields are required. The id cannot change or appear in the body. A missing book returns 404 before author lookup; a missing author returns 400. Unchanged valid updates return 200.
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: b4
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookUpdate'
 *           example:
 *             authorId: a2
 *             title: Updated Book Title
 *             publicationDate: '2026-02-20'
 *     responses:
 *       200:
 *         description: Updated book, with the original id.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       400:
 *         $ref: '#/components/responses/InvalidBook'
 *       404:
 *         $ref: '#/components/responses/BookNotFound'
 *       413:
 *         $ref: '#/components/responses/BodyTooLarge'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put('/books/:id', updateBookHandler);

/**
 * @openapi
 * /books/{id}:
 *   delete:
 *     summary: Delete a book
 *     description: Deletes only the matching book; its author is retained.
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: b4
 *     responses:
 *       204:
 *         description: Book deleted; response has no body.
 *       404:
 *         $ref: '#/components/responses/BookNotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete('/books/:id', deleteBookHandler);

/**
 * @openapi
 * /authors:
 *   get:
 *     summary: Get all authors
 *     tags: [Authors]
 *     responses:
 *       200:
 *         description: Authors sorted by custom id; an empty collection returns an empty array.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Author'
 *       500:
 *         description: Unexpected server or database error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: Internal server error
 */
router.get('/authors', getAuthorsHandler);

/**
 * @openapi
 * /authors/{id}:
 *   get:
 *     summary: Get one author by custom id
 *     tags: [Authors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: a1
 *     responses:
 *       200:
 *         description: Matching author, without MongoDB internal fields.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Author'
 *       404:
 *         $ref: '#/components/responses/AuthorNotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/authors/:id', getAuthorByIdHandler);

/**
 * @openapi
 * /authors:
 *   post:
 *     summary: Create an author
 *     description: All fields are required. Strings are trimmed. Custom ids are unique and case-sensitive. Birth year must be an integer from 1 through the current UTC year. Unknown fields are rejected.
 *     tags: [Authors]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Author'
 *           example:
 *             id: a4
 *             name: Example Author
 *             birthYear: 1980
 *     responses:
 *       201:
 *         description: Author created.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Author'
 *       400:
 *         description: Invalid author data, malformed JSON, or an id that already exists.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalid:
 *                 value:
 *                   message: Invalid author data
 *               duplicate:
 *                 value:
 *                   message: Author id already exists
 *               malformed:
 *                 value:
 *                   message: Invalid request body
 *       413:
 *         $ref: '#/components/responses/BodyTooLarge'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/authors', createAuthorHandler);

/**
 * @openapi
 * /authors/{id}:
 *   put:
 *     summary: Update an author
 *     description: Both mutable fields are required, strings are trimmed, and the id cannot change or appear in the body. A valid unchanged update returns 200.
 *     tags: [Authors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: a4
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthorUpdate'
 *           example:
 *             name: Updated Author
 *             birthYear: 1981
 *     responses:
 *       200:
 *         description: Updated author, with its original id.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Author'
 *       400:
 *         $ref: '#/components/responses/InvalidAuthor'
 *       404:
 *         $ref: '#/components/responses/AuthorNotFound'
 *       413:
 *         $ref: '#/components/responses/BodyTooLarge'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put('/authors/:id', updateAuthorHandler);

/**
 * @openapi
 * /authors/{id}:
 *   delete:
 *     summary: Delete an author who has no books
 *     description: Blocks deletion while any book references the authorId. Books are never cascade-deleted.
 *     tags: [Authors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: a4
 *     responses:
 *       204:
 *         description: Author deleted; response has no body.
 *       404:
 *         $ref: '#/components/responses/AuthorNotFound'
 *       409:
 *         description: Author still has books; no documents are removed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: Author cannot be deleted because they still have books
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete('/authors/:id', deleteAuthorHandler);

export default router;
