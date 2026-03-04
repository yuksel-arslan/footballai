import swaggerJsdoc from 'swagger-jsdoc'

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Stats Service API',
      version: '1.0.0',
      description:
        'Team statistics, league standings, form analysis, and H2H records',
    },
    servers: [{ url: 'http://localhost:3002' }],
  },
  apis: ['./src/routes/*.ts'],
})
