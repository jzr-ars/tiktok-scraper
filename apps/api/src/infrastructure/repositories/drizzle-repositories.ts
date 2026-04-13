import { eq, and, gt, sql } from 'drizzle-orm';
import { db } from '../database/connection';
import {
  users, accounts, plans, subscriptions,
  passwordResetTokens, creditTransactions, scrapingJobs, schedules
} from '../database/schema';
import { User, Account, Plan, Subscription } from '../../domain/entities/models';
import type {
  IUserRepository, IAccountRepository, ISaasRepository,
  IAuthTokenRepository, IScrapingJobRepository, IScheduleRepository
} from '../../domain/repositories/interfaces';

export class DrizzleUserRepository implements IUserRepository {
  async create(data: Pick<User, 'name' | 'email' | 'password'>): Promise<User> {
    const [record] = await db.insert(users).values({
      name: data.name,
      email: data.email,
      password: data.password!,
    }).returning();
    if (!record) throw new Error('Failed to create user');
    return new User(record.id, record.name, record.password, record.email, record.createdAt, record.updatedAt);
  }

  async findById(id: string): Promise<User | null> {
    const [record] = await db.select().from(users).where(eq(users.id, id));
    if (!record) return null;
    return new User(record.id, record.name, record.password, record.email, record.createdAt, record.updatedAt);
  }

  async findByEmail(email: string): Promise<User | null> {
    const [record] = await db.select().from(users).where(eq(users.email, email));
    if (!record) return null;
    return new User(record.id, record.name, record.password, record.email, record.createdAt, record.updatedAt);
  }

  async update(id: string, data: Partial<Pick<User, 'name' | 'email' | 'password'>>): Promise<User> {
    const updateData: any = { ...data, updatedAt: new Date() };
    if (updateData.password === null) delete updateData.password;
    const [record] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    if (!record) throw new Error('Failed to update user');
    return new User(record.id, record.name, record.password, record.email, record.createdAt, record.updatedAt);
  }

  async delete(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }
}

export class DrizzleAuthTokenRepository implements IAuthTokenRepository {
  async createResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await db.insert(passwordResetTokens).values({ userId, tokenHash, expiresAt });
  }

  async verifyAndConsumeToken(tokenHash: string): Promise<string | null> {
    const [record] = await db.select()
      .from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        gt(passwordResetTokens.expiresAt, new Date())
      ));
    if (!record) return null;
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, record.id));
    return record.userId;
  }
}

export class DrizzleAccountRepository implements IAccountRepository {
  async create(data: Pick<Account, 'ownerId' | 'name'>): Promise<Account> {
    const [record] = await db.insert(accounts).values({
      ownerId: data.ownerId,
      name: data.name,
    }).returning();
    if (!record) throw new Error('Failed to create account');
    return new Account(record.id, record.ownerId, record.name, record.balance, record.usedStorageBytes, record.createdAt, record.updatedAt);
  }

  async findById(id: string): Promise<Account | null> {
    const [record] = await db.select().from(accounts).where(eq(accounts.id, id));
    if (!record) return null;
    return new Account(record.id, record.ownerId, record.name, record.balance, record.usedStorageBytes, record.createdAt, record.updatedAt);
  }

  async findByOwnerId(ownerId: string): Promise<Account | null> {
    const [record] = await db.select().from(accounts).where(eq(accounts.ownerId, ownerId));
    if (!record) return null;
    return new Account(record.id, record.ownerId, record.name, record.balance, record.usedStorageBytes, record.createdAt, record.updatedAt);
  }

  async createOnboarding(
    userData: Pick<User, 'name' | 'email' | 'password'>,
    accountName: string,
    planId: string
  ): Promise<{ user: User; account: Account; subscription: Subscription }> {
    return await db.transaction(async (tx) => {
      const [userRec] = await tx.insert(users).values({
        name: userData.name,
        email: userData.email,
        password: userData.password!,
      }).returning();
      if (!userRec) throw new Error('Failed to create user');

      const [accountRec] = await tx.insert(accounts).values({
        ownerId: userRec.id,
        name: accountName,
      }).returning();
      if (!accountRec) throw new Error('Failed to create account');

      const [planRec] = await tx.select().from(plans).where(eq(plans.id, planId));
      if (planRec && planRec.initialCredits > 0) {
        await tx.update(accounts)
          .set({ balance: sql`${accounts.balance} + ${planRec.initialCredits}` })
          .where(eq(accounts.id, accountRec.id));
        await tx.insert(creditTransactions).values({
          accountId: accountRec.id,
          amount: planRec.initialCredits,
          description: `Initial credits for plan: ${planRec.name}`,
        });
      }

      const [subRec] = await tx.insert(subscriptions).values({
        accountId: accountRec.id,
        planId: planId,
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 365 * 24 * 60 * 60 * 1000),
      }).returning();
      if (!subRec) throw new Error('Failed to create subscription');

      return {
        user: new User(userRec.id, userRec.name, userRec.password, userRec.email, userRec.createdAt, userRec.updatedAt),
        account: new Account(accountRec.id, accountRec.ownerId, accountRec.name, accountRec.balance, accountRec.usedStorageBytes, accountRec.createdAt, accountRec.updatedAt),
        subscription: new Subscription(subRec.id, subRec.accountId, subRec.planId, subRec.status, subRec.currentPeriodEnd, subRec.externalSubscriptionId, subRec.createdAt, subRec.updatedAt),
      };
    });
  }

  async addCredits(accountId: string, amount: number, description: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.update(accounts)
        .set({ balance: sql`${accounts.balance} + ${amount}` })
        .where(eq(accounts.id, accountId));
      await tx.insert(creditTransactions).values({ accountId, amount, description });
    });
  }

  async deductCredits(accountId: string, amount: number, description: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const [acc] = await tx.select({ balance: accounts.balance })
        .from(accounts)
        .where(eq(accounts.id, accountId));
      if (!acc || acc.balance < amount) return false;
      await tx.update(accounts)
        .set({ balance: sql`${accounts.balance} - ${amount}` })
        .where(eq(accounts.id, accountId));
      await tx.insert(creditTransactions).values({ accountId, amount: -amount, description });
      return true;
    });
  }

  async updateStorage(accountId: string, bytesAdded: number): Promise<void> {
    await db.update(accounts)
      .set({ usedStorageBytes: sql`${accounts.usedStorageBytes} + ${bytesAdded}` })
      .where(eq(accounts.id, accountId));
  }

  async reduceStorage(accountId: string, bytesRemoved: number): Promise<void> {
    await db.update(accounts)
      .set({ usedStorageBytes: sql`GREATEST(0, ${accounts.usedStorageBytes} - ${bytesRemoved})` })
      .where(eq(accounts.id, accountId));
  }
}

export class DrizzleScrapingJobRepository implements IScrapingJobRepository {
  async createJob(
    accountId: string,
    keyword: string,
    triggerType: 'manual' | 'scheduled',
    scheduleId?: string,
    config?: string
  ): Promise<string> {
    const [job] = await db.insert(scrapingJobs).values({
      accountId,
      keyword,
      triggerType,
      scheduleId: scheduleId ?? null,
      config: config ?? null,
    }).returning({ id: scrapingJobs.id });
    return job!.id;
  }

  async updateJobStatus(
    jobId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    updateData?: any
  ): Promise<void> {
    const setPayload: any = { status, updatedAt: new Date() };
    if (updateData?.videoUrl) setPayload.videoUrl = updateData.videoUrl;
    if (updateData?.filePath) setPayload.filePath = updateData.filePath;
    if (updateData?.fileSizeBytes) setPayload.fileSizeBytes = updateData.fileSizeBytes;
    if (updateData?.metadata) setPayload.metadata = updateData.metadata;
    if (updateData?.processedFilePath) setPayload.processedFilePath = updateData.processedFilePath;
    if (updateData?.presetId) setPayload.presetId = updateData.presetId;
    if (updateData?.errorMessage) setPayload.errorMessage = updateData.errorMessage;
    await db.update(scrapingJobs).set(setPayload).where(eq(scrapingJobs.id, jobId));
  }

  async findJobById(jobId: string, accountId: string): Promise<any> {
    const [job] = await db.select()
      .from(scrapingJobs)
      .where(and(eq(scrapingJobs.id, jobId), eq(scrapingJobs.accountId, accountId)));
    return job ?? null;
  }

  async deleteJob(jobId: string): Promise<void> {
    await db.delete(scrapingJobs).where(eq(scrapingJobs.id, jobId));
  }
}

export class DrizzleScheduleRepository implements IScheduleRepository {
  async getPendingSchedules(): Promise<any[]> {
    const active = await db.select().from(schedules).where(eq(schedules.isActive, 1));
    const now = new Date();
    return active.filter((s) => {
      if (!s.lastRunAt) return true;
      const nextRunTime = new Date(s.lastRunAt.getTime() + s.intervalSeconds * 1000);
      return now >= nextRunTime;
    });
  }

  async updateLastRun(scheduleId: string, runTime: Date): Promise<void> {
    await db.update(schedules).set({ lastRunAt: runTime }).where(eq(schedules.id, scheduleId));
  }
}

export class DrizzleSaasRepository implements ISaasRepository {
  async getPlanByKeyOrId(planId: string): Promise<Plan | null> {
    const [record] = await db.select().from(plans).where(eq(plans.id, planId));
    if (!record) return null;
    return new Plan(record.id, record.name, record.price, record.interval, record.maxStorageBytes, record.initialCredits, record.createdAt, record.updatedAt);
  }

  async getPlanByName(name: string): Promise<Plan | null> {
    const [record] = await db.select().from(plans).where(eq(plans.name, name));
    if (!record) return null;
    return new Plan(record.id, record.name, record.price, record.interval, record.maxStorageBytes, record.initialCredits, record.createdAt, record.updatedAt);
  }

  async getSubscriptionByAccountId(accountId: string): Promise<Subscription | null> {
    const [record] = await db.select().from(subscriptions).where(
      and(eq(subscriptions.accountId, accountId), eq(subscriptions.status, 'active'))
    );
    if (!record) return null;
    return new Subscription(record.id, record.accountId, record.planId, record.status, record.currentPeriodEnd, record.externalSubscriptionId, record.createdAt, record.updatedAt);
  }

  async createSubscription(data: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subscription> {
    const [record] = await db.insert(subscriptions).values({
      accountId: data.accountId,
      planId: data.planId,
      status: data.status,
      currentPeriodEnd: data.currentPeriodEnd,
      externalSubscriptionId: data.externalSubscriptionId,
    }).returning();
    if (!record) throw new Error('Failed to create subscription');
    return new Subscription(record.id, record.accountId, record.planId, record.status, record.currentPeriodEnd, record.externalSubscriptionId, record.createdAt, record.updatedAt);
  }
}
