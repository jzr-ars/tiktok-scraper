import { Queue } from 'bullmq';
import { redisConnection } from '../database/redis';

export const scraperQueueName = 'tiktok-scraper-queue';

let scraperQueueInstance: Queue | null = null;

/** Lazy init so HTTP server can start even if Redis is briefly unavailable. */
export function getScraperQueue(): Queue {
  if (!scraperQueueInstance) {
    scraperQueueInstance = new Queue(scraperQueueName, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 10000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }
  return scraperQueueInstance;
}
