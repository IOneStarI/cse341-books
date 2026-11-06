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
      }
    }
  },
  apis: ['./src/router.js', './app.js']
};

const swaggerSpec = swaggerJsdoc(options);
writeFileSync('./swagger.json', `${JSON.stringify(swaggerSpec, null, 2)}\n`);
console.log('Swagger documentation generated.');
