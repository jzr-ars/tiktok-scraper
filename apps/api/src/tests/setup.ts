import { config } from 'dotenv';
config({ path: '.env.test', override: true });

import { app } from '../index';
import { db } from '../infrastructure/database/connection';
import { sql } from 'drizzle-orm';
import { plans, subscriptions } from '../infrastructure/database/schema';

export const BASE_URL = 'http://localhost:3001';

export async function seedPlans() {
    await db.execute(sql`
        INSERT INTO plans (id, name, price, interval, max_storage_bytes, initial_credits, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            'Starter',
            0,
            'monthly',
            0,
            0,
            NOW(),
            NOW()
        )
        ON CONFLICT DO NOTHING
    `);
}

export async function cleanDatabase() {
    await db.execute(sql`
        TRUNCATE TABLE 
            credit_transactions,
            scraping_jobs,
            schedules,
            subscriptions,
            accounts,
            password_reset_tokens,
            users
        RESTART IDENTITY CASCADE
    `);
}
export async function request(
    method: string,
    path: string,
    options: { body?: any; token?: string } = {}
): Promise<{ status: number; body: any }> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (options.token) {
        headers['Authorization'] = `Bearer ${options.token}`;
    }

    const res = await app.handle(
        new Request(`${BASE_URL}${path}`, {
            method,
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined,
        })
    );

    const json: any = await res.json().catch(() => null);
    return { status: res.status, body: json };
}

export async function registerAndLogin(overrides?: { email?: string; password?: string }) {
    const email = overrides?.email ?? `test_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;
    const password = overrides?.password ?? 'password123';

    await request('POST', '/auth/register', {
        body: { name: 'Test User', email, password },
    });

    const { body } = await request('POST', '/auth/login', {
        body: { email, password },
    });

    return { token: body.token as string, email, password };
}