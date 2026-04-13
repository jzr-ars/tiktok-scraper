import type { IAccountRepository, IScrapingJobRepository, ISaasRepository } from '@/domain/repositories/interfaces';
import { getScraperQueue } from '@/infrastructure/queue/scraper.queue';
import { AppError } from '@/shared/errors/app-error';

export class QueueScrapingJobUseCase {
    constructor(
        private readonly accountRepo: IAccountRepository,
        private readonly jobRepo: IScrapingJobRepository,
        private readonly saasRepo: ISaasRepository
    ) { }

    async execute(accountId: string, keyword: string, triggerType: 'manual' | 'scheduled' = 'manual', config?: string): Promise<string> {
        const account = await this.accountRepo.findById(accountId);
        if (!account) throw new AppError('Account not found', 404);

        const subscription = await this.saasRepo.getSubscriptionByAccountId(accountId);
        if (!subscription) throw new AppError('Active subscription missing', 403);

        const plan = await this.saasRepo.getPlanByKeyOrId(subscription.planId);
        if (!plan) throw new AppError('Plan mapping broken', 500);
        if (account.usedStorageBytes >= plan.maxStorageBytes && plan.maxStorageBytes > 0) {
            throw new AppError('Storage quota exceeded. Please delete old files or upgrade.', 403);
        }
        const success = await this.accountRepo.deductCredits(accountId, 1, `Scraping execution for: ${keyword}`);
        if (!success) {
            throw new AppError('Not enough credits. Please recharge your balance.', 402);
        }
        const jobId = await this.jobRepo.createJob(accountId, keyword, triggerType, undefined, config);
        await getScraperQueue().add(`scrape-${jobId}`, {
            jobId,
            accountId,
            keyword,
            config,
        });

        return jobId;
    }
}
