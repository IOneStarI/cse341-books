import { hasOnlyFields, isValidId, isValidText } from './common.js';

const getAuthorInput = (body, creating = false) => {
  const fields = creating ? ['id', 'name', 'birthYear'] : ['name', 'birthYear'];
  if (!hasOnlyFields(body, fields)) {
    return null;
  }

  const name = typeof body.name === 'string' ? body.name.trim() : body.name;
  const id = typeof body.id === 'string' ? body.id.trim() : body.id;
  const birthYear = body.birthYear;
  if (!isValidText(name) || !Number.isInteger(birthYear)
    || birthYear < 1 || birthYear > new Date().getUTCFullYear()
    || (creating && !isValidId(id))) {
    return null;
  }

  if (creating) {
    return { id, name, birthYear };
  }
  return { name, birthYear };
};

export { getAuthorInput };
