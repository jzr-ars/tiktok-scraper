import { createRequire } from 'node:module';
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { authRoutes } from './presentation/routes/auth.routes';
import { scraperRoutes } from './presentation/routes/scraper.routes';
import { AppError } from './shared/errors/app-error';
import { AutomationEngine } from './application/services/automation.service';

const automation = new AutomationEngine();

const loadSwagger =
  process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true';

let appChain = new Elysia().use(cors());
if (loadSwagger) {
  const require = createRequire(import.meta.url);
  const { swagger } = require('@elysiajs/swagger') as typeof import('@elysiajs/swagger');
  appChain = appChain.use(
    swagger({
      documentation: {
        info: {
          title: 'Tiktok Clone API',
          version: '1.0.0',
        },
      },
    }),
  );
}

export const app = appChain
  .error({ AppError })
  .onError(({ code, error, set }) => {
    if (code === 'VALIDATION') {
      set.status = 422;
      return { success: false, message: 'Validation error' };
    }
    if (error instanceof AppError) {
      set.status = error.statusCode;
      return {
        success: false,
        message: error.message,
      };
    }
    console.error('Unhandled error:', error);
    set.status = 500;
    return {
      success: false,
      message: 'Internal server error',
    };
  })
  .use(authRoutes)
  .use(scraperRoutes)
  .listen({
    port: Number(process.env.PORT) || 3000,
    hostname: '0.0.0.0',
  });

export type App = typeof app;

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);

if (process.env.NODE_ENV !== 'test') {
  automation.start();
  import('./infrastructure/queue/scraper.worker')
    .then(() => {})
    .catch((err) => console.error('[WORKER] Failed to load worker module:', err));
}
