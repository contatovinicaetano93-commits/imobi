import { createServer } from 'http';
import { Server } from 'https';
import { VercelRequest, VercelResponse } from '@vercel/node';

// Lazy-load NestJS app to optimize cold starts
let app: any = null;

async function getApp() {
  if (app) return app;

  const { NestFactory } = await import('@nestjs/core');
  const { FastifyAdapter } = await import('@nestjs/platform-fastify');
  const { AppModule } = await import('../services/api/src/app.module');

  const adapter = new FastifyAdapter();
  app = await NestFactory.create(AppModule, adapter, {
    logger: false,
  });

  await app.init();
  return app;
}

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    const nestApp = await getApp();
    const server = nestApp.getHttpServer();

    // Forward request to NestJS
    server.emit('request', req, res);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Internal Server Error',
      error: process.env.NODE_ENV === 'production' ? undefined : error,
    });
  }
};
