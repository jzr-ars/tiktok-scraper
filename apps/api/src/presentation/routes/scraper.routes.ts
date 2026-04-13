import { Elysia, t } from 'elysia';
import { ScraperController } from '../controllers/scraper.controller';
import { authPlugin } from './auth.plugin';

const scraperController = new ScraperController();

export const scraperRoutes = new Elysia({ prefix: '/scraper' })
  .use(authPlugin)
  .post('/manual', ({ body, userPayload }: any) => scraperController.manualScrape(userPayload, body), {
    isAuth: true,
    body: t.Object({
      keyword: t.String({ minLength: 1 }),
      watermarks: t.Optional(t.Array(t.Union([
        t.Object({
          type: t.Literal('text'),
          text: t.String({ minLength: 1 }),
          position: t.Union([
            t.Literal('top-left'),
            t.Literal('top-right'),
            t.Literal('bottom-left'),
            t.Literal('bottom-right'),
            t.Literal('center'),
          ]),
          fontSize: t.Optional(t.Numeric({ minimum: 8, maximum: 120 })),
          color: t.Optional(t.String()),
        }),
        t.Object({
          type: t.Literal('image'),
          imageUrl: t.String({ format: 'uri' }),
          position: t.Union([
            t.Literal('top-left'),
            t.Literal('top-right'),
            t.Literal('bottom-left'),
            t.Literal('bottom-right'),
            t.Literal('center'),
          ]),
          scale: t.Optional(t.Numeric({ minimum: 0.01, maximum: 1.0 })),
        }),
      ]))),
    }),
    detail: { tags: ['Scraper'], summary: 'Trigger a manual scrape by keyword (with optional watermarks)' }
  })
  .post('/buy-credits', ({ body, userPayload }: any) => scraperController.buyCredits(userPayload, body), {
    isAuth: true,
    body: t.Object({
      amount: t.Numeric({ minimum: 1 })
    }),
    detail: { tags: ['Billing'], summary: 'Purchase Scraping Credits' }
  })
  .get('/jobs', ({ userPayload }: any) => scraperController.getJobs(userPayload), {
    isAuth: true,
    detail: { tags: ['Scraper'], summary: 'Get all scraping job history for current user' }
  })
  .get('/balance', ({ userPayload }: any) => scraperController.getBalance(userPayload), {
    isAuth: true,
    detail: { tags: ['Billing'], summary: 'Get current credit balance and storage usage' }
  })
  .delete('/jobs/:jobId', ({ params, userPayload }: any) => scraperController.deleteJob(userPayload, params.jobId), {
    isAuth: true,
    params: t.Object({
      jobId: t.String({ minLength: 1 })
    }),
    detail: { tags: ['Scraper'], summary: 'Delete a scraping job and reclaim storage' }
  });
