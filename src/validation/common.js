const hasOnlyFields = (body, allowedFields) => {
  return body !== null && typeof body === 'object' && !Array.isArray(body)
    && Object.keys(body).every((field) => { return allowedFields.includes(field); });
};

const isValidId = (value) => {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);
};

const isValidText = (value) => {
  return typeof value === 'string' && value.length >= 1 && value.length <= 200;
};

export { hasOnlyFields, isValidId, isValidText };
