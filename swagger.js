import { writeFileSync } from 'node:fs';
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  failOnErrors: true,
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Books API',
      version: '1.0.0',
      description: 'A simple API for working with books'
    },
    servers: [{ url: '/', description: 'Current server' }],
    components: {
      schemas: {
        Author: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'name', 'birthYear'],
          properties: {
            id: { type: 'string', minLength: 1, maxLength: 64, pattern: '^[A-Za-z0-9_-]+$', example: 'a1' },
            name: { type: 'string', minLength: 1, maxLength: 200, example: 'Maya Rivera' },
            birthYear: { type: 'integer', minimum: 1, description: 'Must not exceed the current UTC year.', example: 1980 }
          }
        },
        AuthorUpdate: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'birthYear'],
          properties: {
            name: { $ref: '#/components/schemas/Author/properties/name' },
            birthYear: { $ref: '#/components/schemas/Author/properties/birthYear' }
          }
        },
        Book: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'authorId', 'title', 'publicationDate'],
          properties: {
            id: { type: 'string', minLength: 1, maxLength: 64, pattern: '^[A-Za-z0-9_-]+$', example: 'b1' },
            authorId: { type: 'string', minLength: 1, maxLength: 64, pattern: '^[A-Za-z0-9_-]+$', description: 'Custom id of an existing author.', example: 'a1' },
            title: { type: 'string', minLength: 1, maxLength: 200, example: 'Patterns of Light' },
            publicationDate: { type: 'string', format: 'date', description: 'Real calendar date in YYYY-MM-DD, years 0001 through 9999.', example: '2021-08-17' }
          }
        },
        BookUpdate: {
          type: 'object',
          additionalProperties: false,
          required: ['authorId', 'title', 'publicationDate'],
          properties: {
            authorId: { $ref: '#/components/schemas/Book/properties/authorId' },
            title: { $ref: '#/components/schemas/Book/properties/title' },
            publicationDate: { $ref: '#/components/schemas/Book/properties/publicationDate' }
          }
        },
        Error: {
          type: 'object',
          required: ['message'],
          properties: { message: { type: 'string' } }
        }
      },
      responses: {
        BookNotFound: {
          description: 'No book matches the custom id.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' }, example: { message: 'Book not found' } } }
        },
        InvalidBook: {
          description: 'Invalid book data, malformed JSON, or an authorId that does not exist.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              examples: {
                invalid: { value: { message: 'Invalid book data' } },
                authorMissing: { value: { message: 'Author does not exist' } },
                malformed: { value: { message: 'Invalid request body' } }
              }
            }
          }
        },
        AuthorNotFound: {
          description: 'No author matches the custom id.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' }, example: { message: 'Author not found' } } }
        },
        InvalidAuthor: {
          description: 'Missing or invalid data, unexpected fields, or malformed JSON.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              examples: {
                invalid: { value: { message: 'Invalid author data' } },
                malformed: { value: { message: 'Invalid request body' } }
              }
            }
          }
        },
        ServerError: {
          description: 'Unexpected server or database error.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' }, example: { message: 'Internal server error' } } }
        },
        BodyTooLarge: {
          description: 'JSON body exceeds the 100 KB request limit.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' }, example: { message: 'Request body too large' } } }
        }
      }
    }
  },
  apis: ['./src/router.js', './app.js']
};

const swaggerSpec = swaggerJsdoc(options);
writeFileSync('./swagger.json', `${JSON.stringify(swaggerSpec, null, 2)}\n`);
console.log('Swagger documentation generated.');
