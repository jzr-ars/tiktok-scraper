import type { IUserRepository, IAccountRepository, ISaasRepository } from '@/domain/repositories/interfaces';
import { AppError } from '@/shared/errors/app-error';
import { User, Account, Subscription } from '@/domain/entities/models';

export class RegisterUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly accountRepository: IAccountRepository,
    private readonly saasRepository: ISaasRepository
  ) {}

  async execute(data: Pick<User, 'name' | 'email' | 'password'>): Promise<{ user: User, account: Account, subscription: Subscription }> {
    const existing = await this.userRepository.findByEmail(data.email);
    if (existing) {
      throw new AppError('Email is already registered.', 409);
    }

    const starterPlan = await this.saasRepository.getPlanByName('Starter');
    if (!starterPlan || !starterPlan.id) {
       throw new AppError('Internal Error: Missing default Starter plan in database.', 500);
    }

    const hashedPassword = await Bun.password.hash(data.password as string);

    return await this.accountRepository.createOnboarding(
      { name: data.name, email: data.email, password: hashedPassword },
      `${data.name}'s Workspace`,
      starterPlan.id
    );
  }
}
