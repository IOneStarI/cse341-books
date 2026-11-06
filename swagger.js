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
          required: ['id', 'author', 'title', 'publicationDate'],
          properties: {
            id: { type: 'string', example: 'b1' },
            author: { type: 'string', example: 'Maya Rivera' },
            title: { type: 'string', example: 'Patterns of Light' },
            publicationDate: { type: 'string', format: 'date', example: '2021-08-17' }
          }
        },
        Error: {
          type: 'object',
          required: ['message'],
          properties: { message: { type: 'string' } }
        }
      },
      responses: {
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
