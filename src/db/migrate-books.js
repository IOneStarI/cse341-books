import seedAuthors from '../../data/authors.json' with { type: 'json' };

const migrateBooks = async (database, { keepAuthor = false } = {}) => {
  const authors = await database.collection('authors').find({}).toArray();
  const authorIds = new Set(authors.map((author) => { return author.id; }));
  const originalNames = new Map(seedAuthors.map((author) => { return [author.name, author.id]; }));
  const books = await database.collection('books').find({}).toArray();
  const updates = [];

  // Validate all references before changing any document.
  for (const book of books) {
    let authorId = book.authorId;
    if (authorId === undefined) {
      authorId = originalNames.get(book.author);
      if (!authorId) {
        const matches = authors.filter((author) => { return author.name === book.author; });
        if (matches.length === 1) {
          authorId = matches[0].id;
        }
      }
    }
    if (!authorIds.has(authorId)) {
      throw new Error('Cannot migrate a book without a valid author reference.');
    }
    if (book.authorId === undefined || (!keepAuthor && Object.hasOwn(book, 'author'))) {
      updates.push({ book, authorId });
    }
  }

  for (const { book, authorId } of updates) {
    const filter = { _id: book._id, authorId: book.authorId ?? { $exists: false } };
    if (Object.hasOwn(book, 'author')) {
      filter.author = book.author;
    }
    const update = { $set: { authorId } };
    if (!keepAuthor) {
      update.$unset = { author: '' };
    }
    const result = await database.collection('books').updateOne(filter, update);
    if (result.matchedCount !== 1) {
      throw new Error('A book changed during migration. Check its data and rerun.');
    }
  }
  return { checked: books.length, updated: updates.length, legacyAuthorRetained: keepAuthor };
};

export { migrateBooks };
