import { hasOnlyFields, isValidId, isValidText } from './common.js';

const isValidDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const getBookInput = (body, creating = false) => {
  const fields = creating ? ['id', 'authorId', 'title', 'publicationDate'] : ['authorId', 'title', 'publicationDate'];
  if (!hasOnlyFields(body, fields)) {
    return null;
  }
  const input = {};
  for (const field of fields) {
    input[field] = typeof body[field] === 'string' ? body[field].trim() : body[field];
  }
  if (!isValidId(input.authorId) || !isValidText(input.title)
    || !isValidDate(input.publicationDate) || (creating && !isValidId(input.id))) {
    return null;
  }
  return input;
};

export { getBookInput };
