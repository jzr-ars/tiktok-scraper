import { DrizzleScheduleRepository, DrizzleAccountRepository, DrizzleScrapingJobRepository, DrizzleSaasRepository } from '@/infrastructure/repositories/drizzle-repositories';
import { QueueScrapingJobUseCase } from '@/application/use-cases/queue-scraping-job.use-case';

export class AutomationEngine {
    private timer: Timer | null = null;

    private scheduleRepo = new DrizzleScheduleRepository();
    private accountRepo = new DrizzleAccountRepository();
    private jobRepo = new DrizzleScrapingJobRepository();
    private saasRepo = new DrizzleSaasRepository();
    private queueJob = new QueueScrapingJobUseCase(
        this.accountRepo,
        this.jobRepo,
        this.saasRepo
    );

    start() {
        console.log('[AUTOMATION] Engine started. Polling every 60 seconds.');
        this.timer = setInterval(() => this.tick(), 60 * 1000);
        setTimeout(() => this.tick(), 1000);
    }

    stop() {
        if (this.timer) clearInterval(this.timer);
    }

    private async tick() {
        try {
            const pending = await this.scheduleRepo.getPendingSchedules();
            if (pending.length === 0) return;

            console.log(`[AUTOMATION] Found ${pending.length} pending schedules to execute.`);

            for (const schedule of pending) {
                try {
                    await this.queueJob.execute(schedule.accountId, schedule.keyword, 'scheduled');
                    await this.scheduleRepo.updateLastRun(schedule.id, new Date());
                    console.log(`[AUTOMATION] Schedule ${schedule.id} queued successfully.`);
                } catch (err: any) {
                    console.error(`[AUTOMATION] Failed to queue schedule ${schedule.id}: ${err.message}`);
                    await this.scheduleRepo.updateLastRun(schedule.id, new Date());
                }
            }
        } catch (error) {
            console.error('[AUTOMATION] Tick crashed:', error);
        }
    }
}