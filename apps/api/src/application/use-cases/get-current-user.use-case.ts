import type { IUserRepository, IAccountRepository, ISaasRepository } from '@/domain/repositories/interfaces';
import { AppError } from '@/shared/errors/app-error';
import { User, Account, Subscription } from '@/domain/entities/models';

export class GetCurrentUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly accountRepository: IAccountRepository,
    private readonly saasRepository: ISaasRepository
  ) {}

  async execute(userId: string): Promise<{ user: Omit<User, 'password'>, account: Account, subscription: Subscription | null }> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    const account = await this.accountRepository.findByOwnerId(userId);
    if (!account || !account.id) throw new AppError('Account not found', 404);

    const subscription = await this.saasRepository.getSubscriptionByAccountId(account.id);
    
    const { password, ...userWithoutPassword } = user;

    return { 
      user: userWithoutPassword as Omit<User, 'password'>, 
      account, 
      subscription 
    };
  }
}
