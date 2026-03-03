import swaggerJsdoc from 'swagger-jsdoc'

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Match Service API',
      version: '1.0.0',
      description:
        'Match data service — fixtures, teams, leagues, and AI predictions',
    },
    servers: [{ url: 'http://localhost:3001' }],
  },
  apis: ['./src/routes/*.ts'],
})
