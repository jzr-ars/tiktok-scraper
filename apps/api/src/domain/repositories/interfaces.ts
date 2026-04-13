import {
  User, Account, Plan, Subscription
} from '../entities/models';

export interface IUserRepository {
  create(user: Pick<User, 'name' | 'email' | 'password'>): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  update(id: string, data: Partial<Pick<User, 'name' | 'email' | 'password'>>): Promise<User>;
  delete(id: string): Promise<void>;
}

export interface IAuthTokenRepository {
  createResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  verifyAndConsumeToken(tokenHash: string): Promise<string | null>;
}

export interface IAccountRepository {
  create(account: Pick<Account, 'ownerId' | 'name'>): Promise<Account>;
  findById(id: string): Promise<Account | null>;
  findByOwnerId(ownerId: string): Promise<Account | null>;

  createOnboarding(
    user: Pick<User, 'name' | 'email' | 'password'>,
    accountName: string,
    planId: string
  ): Promise<{ user: User, account: Account, subscription: Subscription }>;
  addCredits(accountId: string, amount: number, description: string): Promise<void>;
  deductCredits(accountId: string, amount: number, description: string): Promise<boolean>;
  updateStorage(accountId: string, bytesAdded: number): Promise<void>;
  reduceStorage(accountId: string, bytesRemoved: number): Promise<void>;
}

export interface IScrapingJobRepository {
  createJob(accountId: string, keyword: string, triggerType: 'manual' | 'scheduled', scheduleId?: string, config?: string): Promise<string>;
  updateJobStatus(jobId: string, status: 'pending' | 'processing' | 'completed' | 'failed', updateData?: any): Promise<void>;
  findJobById(jobId: string, accountId: string): Promise<any>;
  deleteJob(jobId: string): Promise<void>;
}

export interface IScheduleRepository {
  getPendingSchedules(): Promise<any[]>;
  updateLastRun(scheduleId: string, runTime: Date): Promise<void>;
}

export interface ISaasRepository {
  getPlanByKeyOrId(planId: string): Promise<Plan | null>;
  getPlanByName(name: string): Promise<Plan | null>;
  getSubscriptionByAccountId(accountId: string): Promise<Subscription | null>;
  createSubscription(subscription: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subscription>;
}
