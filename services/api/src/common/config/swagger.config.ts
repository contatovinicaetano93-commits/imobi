import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Imobi API')
    .setDescription('Fintech platform for real estate credit - Production Ready Architecture')
    .setVersion('1.0.0')
    .addTag('auth', 'Authentication & Authorization')
    .addTag('usuarios', 'User Management')
    .addTag('obras', 'Property/Construction Projects')
    .addTag('credito', 'Credit Operations')
    .addTag('kyc', 'Know Your Customer')
    .addTag('documentos', 'Document Management')
    .addTag('evidencias', 'Evidence & Proof')
    .addTag('vistoria', 'Property Inspection')
    .addTag('admin', 'Administrator Operations')
    .addTag('assistente', 'AI Assistant (in-app help)')
    .addServer('http://localhost:4000', 'Development')
    .addServer('https://imobi-api-staging.onrender.com', 'Staging')
    .addServer('https://imobi-api-efgg.onrender.com', 'Production')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'bearer',
    )
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
      },
      'api-key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayOperationId: true,
    },
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info { margin: 30px 0; }
    `,
  });
}
