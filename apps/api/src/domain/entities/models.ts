export class User {
  constructor(
    public readonly id: string | null,
    public name: string,
    public password: string | null,
    public email: string,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) { }
}

export class Account {
  constructor(
    public readonly id: string | null,
    public readonly ownerId: string,
    public name: string,
    public readonly balance: number = 0,
    public readonly usedStorageBytes: number = 0,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) { }
}

export type PricingInterval = 'monthly' | 'yearly';

export class Plan {
  constructor(
    public readonly id: string | null,
    public name: string,
    public price: number,
    public interval: PricingInterval,
    public readonly maxStorageBytes: number = 0,
    public readonly initialCredits: number = 0,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) { }
}

export type SubscriptionStatus = 'active' | 'past_due' | 'canceled';

export class Subscription {
  constructor(
    public readonly id: string | null,
    public accountId: string,
    public planId: string,
    public status: SubscriptionStatus,
    public currentPeriodEnd: Date,
    public externalSubscriptionId: string | null,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) { }
}

