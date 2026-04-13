import { DrizzleAccountRepository, DrizzleScrapingJobRepository, DrizzleSaasRepository } from '@/infrastructure/repositories/drizzle-repositories';
import { QueueScrapingJobUseCase } from '@/application/use-cases/queue-scraping-job.use-case';
import { BuyCreditsUseCase } from '@/application/use-cases/buy-credits.use-case';
import { AppError } from '@/shared/errors/app-error';
import { db } from '@/infrastructure/database/connection';
import { scrapingJobs, accounts } from '@/infrastructure/database/schema';
import { eq, desc } from 'drizzle-orm';
import fs from 'fs/promises';

const accountRepo = new DrizzleAccountRepository();
const jobRepo = new DrizzleScrapingJobRepository();
const saasRepo = new DrizzleSaasRepository();

const queueJob = new QueueScrapingJobUseCase(accountRepo, jobRepo, saasRepo);
const buyCredits = new BuyCreditsUseCase(accountRepo);

export class ScraperController {

    async manualScrape(userPayload: any, body: { keyword: string; watermarks?: any[] }) {
        const account = await accountRepo.findByOwnerId(userPayload.id as string);
        if (!account) throw new AppError('Account not found', 404);
        const config = body.watermarks?.length
            ? JSON.stringify({ watermarks: body.watermarks })
            : undefined;

        const jobId = await queueJob.execute(account.id as string, body.keyword, 'manual', config);

        return {
            success: true,
            message: 'Job submitted to scraper queue. 1 Credit deducted.',
            data: jobId
        };
    }

    async buyCredits(userPayload: any, body: { amount: number }) {
        const account = await accountRepo.findByOwnerId(userPayload.id as string);
        if (!account) throw new AppError('Account not found', 404);

        await buyCredits.execute(account.id as string, body.amount);

        return { success: true, message: `Successfully purchased ${body.amount} credits` };
    }
    async getJobs(userPayload: any) {
        const account = await accountRepo.findByOwnerId(userPayload.id as string);
        if (!account) throw new AppError('Account not found', 404);

        const jobs = await db
            .select({
                id: scrapingJobs.id,
                status: scrapingJobs.status,
                triggerType: scrapingJobs.triggerType,
                keyword: scrapingJobs.keyword,
                filePath: scrapingJobs.filePath,
                fileSizeBytes: scrapingJobs.fileSizeBytes,
                errorMessage: scrapingJobs.errorMessage,
                createdAt: scrapingJobs.createdAt,
                updatedAt: scrapingJobs.updatedAt,
            })
            .from(scrapingJobs)
            .where(eq(scrapingJobs.accountId, account.id as string))
            .orderBy(desc(scrapingJobs.createdAt))
            .limit(50);

        return { success: true, data: jobs };
    }
    async getBalance(userPayload: any) {
        const account = await accountRepo.findByOwnerId(userPayload.id as string);
        if (!account) throw new AppError('Account not found', 404);

        return {
            success: true,
            data: {
                balance: account.balance,
                usedStorageBytes: account.usedStorageBytes,
            }
        };
    }
    async deleteJob(userPayload: any, jobId: string) {
        const account = await accountRepo.findByOwnerId(userPayload.id as string);
        if (!account) throw new AppError('Account not found', 404);

        const job = await jobRepo.findJobById(jobId, account.id as string);
        if (!job) throw new AppError('Job not found', 404);

        if (job.filePath) await fs.unlink(job.filePath).catch(() => { });
        if (job.processedFilePath) await fs.unlink(job.processedFilePath).catch(() => { });

        const totalBytes = job.fileSizeBytes || 0;
        if (totalBytes > 0) {
            await accountRepo.reduceStorage(account.id as string, totalBytes);
        }

        await jobRepo.deleteJob(jobId);

        return { success: true, message: 'Job deleted and storage reclaimed' };
    }
}
