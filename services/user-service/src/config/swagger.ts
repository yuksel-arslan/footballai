import swaggerJsdoc from 'swagger-jsdoc'

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'User Service API',
      version: '1.0.0',
      description:
        'Authentication, profile management, favorites, notifications, and user predictions',
    },
    servers: [{ url: 'http://localhost:3003' }],
  },
  apis: ['./src/routes/*.ts'],
})
