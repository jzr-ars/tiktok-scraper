import { pgTable, uuid, varchar, timestamp, integer, bigint, pgEnum, unique, text } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
export const pricingIntervalEnum = pgEnum('pricing_interval', ['monthly', 'yearly']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'past_due', 'canceled']);
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  balance: integer('balance').default(0).notNull(),
  usedStorageBytes: bigint('used_storage_bytes', { mode: 'number' }).default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const plans = pgTable('plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  price: integer('price').notNull(),
  interval: pricingIntervalEnum('interval').notNull(),
  maxStorageBytes: bigint('max_storage_bytes', { mode: 'number' }).default(0).notNull(),
  initialCredits: integer('initial_credits').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  planId: uuid('plan_id').notNull().references(() => plans.id, { onDelete: 'restrict' }),
  status: subscriptionStatusEnum('status').notNull(),
  currentPeriodEnd: timestamp('current_period_end').notNull(),
  externalSubscriptionId: varchar('external_subscription_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const jobStatusEnum = pgEnum('job_status', ['pending', 'processing', 'completed', 'failed']);
export const triggerTypeEnum = pgEnum('trigger_type', ['manual', 'scheduled']);

export const schedules = pgTable('schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  keyword: varchar('keyword', { length: 255 }).notNull(),
  intervalSeconds: integer('interval_seconds').notNull(),
  isActive: integer('is_active').default(1).notNull(),
  config: text('config'),
  lastRunAt: timestamp('last_run_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const scrapingJobs = pgTable('scraping_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  scheduleId: uuid('schedule_id').references(() => schedules.id, { onDelete: 'set null' }),
  status: jobStatusEnum('status').default('pending').notNull(),
  triggerType: triggerTypeEnum('trigger_type').notNull(),
  keyword: varchar('keyword', { length: 255 }).notNull(),
  config: text('config'),
  videoUrl: varchar('video_url', { length: 1024 }),
  filePath: varchar('file_path', { length: 500 }),
  fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }).default(0),
  metadata: text('metadata'),
  processedFilePath: varchar('processed_file_path', { length: 500 }),
  presetId: varchar('preset_id', { length: 50 }).default('default'),
  errorMessage: varchar('error_message', { length: 1000 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const creditTransactions = pgTable('credit_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  description: varchar('description', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  owner: one(users, {
    fields: [accounts.ownerId],
    references: [users.id],
  }),
  subscriptions: many(subscriptions),
  schedules: many(schedules),
  scrapingJobs: many(scrapingJobs),
  creditTransactions: many(creditTransactions),
}));

export const schedulesRelations = relations(schedules, ({ one, many }) => ({
  account: one(accounts, {
    fields: [schedules.accountId],
    references: [accounts.id],
  }),
  jobs: many(scrapingJobs),
}));

export const scrapingJobsRelations = relations(scrapingJobs, ({ one }) => ({
  account: one(accounts, {
    fields: [scrapingJobs.accountId],
    references: [accounts.id],
  }),
  schedule: one(schedules, {
    fields: [scrapingJobs.scheduleId],
    references: [schedules.id],
  }),
}));

export const creditTransactionsRelations = relations(creditTransactions, ({ one }) => ({
  account: one(accounts, {
    fields: [creditTransactions.accountId],
    references: [accounts.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  account: one(accounts, {
    fields: [subscriptions.accountId],
    references: [accounts.id],
  }),
  plan: one(plans, {
    fields: [subscriptions.planId],
    references: [plans.id],
  }),
}));

export const plansRelations = relations(plans, ({ many }) => ({
  subscriptions: many(subscriptions),
}));