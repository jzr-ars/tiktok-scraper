import type { IAccountRepository } from '@/domain/repositories/interfaces';
import { AppError } from '@/shared/errors/app-error';

export class BuyCreditsUseCase {
    constructor(private readonly accountRepo: IAccountRepository) { }

    async execute(accountId: string, amount: number): Promise<void> {
        if (amount <= 0) throw new AppError('Amount must be positive', 400);
        console.log(`[PAYMENT SIMULATION] Purchased ${amount} credits for account ${accountId}`);

        await this.accountRepo.addCredits(accountId, amount, `Purchased ${amount} credits`);
    }
}
