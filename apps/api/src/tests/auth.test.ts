import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { cleanDatabase, request, registerAndLogin, seedPlans } from './setup';

describe('Auth Flows', () => {
    beforeAll(async () => {
        await cleanDatabase();
        await seedPlans();
    });

    afterAll(async () => {
        await cleanDatabase();
    });

    describe('POST /auth/register', () => {
        it('should register a new user successfully', async () => {
            const { status, body } = await request('POST', '/auth/register', {
                body: {
                    name: 'John Doe',
                    email: 'john@example.com',
                    password: 'password123',
                },
            });

            expect(status).toBe(200);
            expect(body.success).toBe(true);
            expect(body.data.user).toBeDefined();
            expect(body.data.account).toBeDefined();
            expect(body.data.subscription).toBeDefined();
            expect(body.data.user.password).toBeUndefined();
        });

        it('should reject duplicate email', async () => {
            const { status, body } = await request('POST', '/auth/register', {
                body: {
                    name: 'John Doe',
                    email: 'john@example.com',
                    password: 'password123',
                },
            });

            expect(status).toBe(409);
            expect(body.success).toBe(false);
        });

        it('should reject invalid email format', async () => {
            const { status } = await request('POST', '/auth/register', {
                body: { name: 'Test', email: 'not-an-email', password: 'password123' },
            });
            expect(status).toBe(422);
        });

        it('should reject password shorter than 6 characters', async () => {
            const { status } = await request('POST', '/auth/register', {
                body: { name: 'Test', email: 'short@example.com', password: '123' },
            });
            expect(status).toBe(422);
        });
    });

    describe('POST /auth/login', () => {
        it('should login and return JWT token', async () => {
            const { status, body } = await request('POST', '/auth/login', {
                body: { email: 'john@example.com', password: 'password123' },
            });

            expect(status).toBe(200);
            expect(body.success).toBe(true);
            expect(body.token).toBeDefined();
            expect(typeof body.token).toBe('string');
        });

        it('should reject wrong password', async () => {
            const { status, body } = await request('POST', '/auth/login', {
                body: { email: 'john@example.com', password: 'wrongpassword' },
            });

            expect(status).toBe(401);
            expect(body.success).toBe(false);
        });

        it('should reject non-existent email', async () => {
            const { status, body } = await request('POST', '/auth/login', {
                body: { email: 'nobody@example.com', password: 'password123' },
            });

            expect(status).toBe(401);
            expect(body.success).toBe(false);
        });
    });

    describe('GET /auth/me', () => {
        it('should return current user data', async () => {
            const { token } = await registerAndLogin({ email: `me_${Date.now()}@example.com` });
            const { status, body } = await request('GET', '/auth/me', { token });

            expect(status).toBe(200);
            expect(body.success).toBe(true);
            expect(body.data.user).toBeDefined();
            expect(body.data.account).toBeDefined();
        });

        it('should reject unauthenticated request', async () => {
            const { status } = await request('GET', '/auth/me');
            expect(status).toBe(401);
        });
    });

    describe('PATCH /auth/profile', () => {
        it('should update user name', async () => {
            const { token } = await registerAndLogin({ email: `profile_${Date.now()}@example.com` });
            const { status, body } = await request('PATCH', '/auth/profile', {
                token,
                body: { name: 'Updated Name' },
            });

            expect(status).toBe(200);
            expect(body.success).toBe(true);
        });

        it('should update email', async () => {
            const { token } = await registerAndLogin({ email: `profile2_${Date.now()}@example.com` });
            const { status, body } = await request('PATCH', '/auth/profile', {
                token,
                body: { email: 'profile2updated@example.com' },
            });

            expect(status).toBe(200);
            expect(body.success).toBe(true);
        });
    });

    describe('PATCH /auth/password', () => {
        it('should change password successfully', async () => {
            const email = `changepw_${Date.now()}@example.com`;

            const regRes = await request('POST', '/auth/register', {
                body: { name: 'Test User', email, password: 'oldpassword' },
            });
            console.log('REG:', regRes.status, regRes.body?.message);

            const { body: loginBody } = await request('POST', '/auth/login', {
                body: { email, password: 'oldpassword' },
            });
            console.log('LOGIN TOKEN:', loginBody?.token);

            const token = loginBody.token as string;

            const { status, body } = await request('PATCH', '/auth/password', {
                token,
                body: { currentPassword: 'oldpassword', newPassword: 'newpassword123' },
            });
            console.log('CHANGE PW:', status, JSON.stringify(body));

            expect(status).toBe(200);
        });

        it('should reject wrong current password', async () => {
            const email = `changepw2_${Date.now()}@example.com`;

            await request('POST', '/auth/register', {
                body: { name: 'Test User', email, password: 'password123' },
            });
            const { body: loginBody } = await request('POST', '/auth/login', {
                body: { email, password: 'password123' },
            });
            const token = loginBody.token as string;

            const { status, body } = await request('PATCH', '/auth/password', {
                token,
                body: { currentPassword: 'wrongpassword', newPassword: 'newpassword123' },
            });

            expect(status).toBe(400);
            expect(body.success).toBe(false);
        });
    });

    describe('POST /auth/forgot-password', () => {
        it('should return success even for non-existent email (security)', async () => {
            const { status, body } = await request('POST', '/auth/forgot-password', {
                body: { email: 'nonexistent@example.com' },
            });

            expect(status).toBe(200);
            expect(body.success).toBe(true);
        });

        it('should generate reset token for valid email', async () => {
            const { status, body } = await request('POST', '/auth/forgot-password', {
                body: { email: 'john@example.com' },
            });

            expect(status).toBe(200);
            expect(body.success).toBe(true);
        });
    });

    describe('POST /auth/reset-password', () => {
        it('should reject invalid token', async () => {
            const { status, body } = await request('POST', '/auth/reset-password', {
                body: { token: 'invalidtoken', newPassword: 'newpassword123' },
            });

            expect(status).toBe(400);
            expect(body.success).toBe(false);
        });
    });

    describe('POST /auth/logout', () => {
        it('should logout successfully', async () => {
            const { token } = await registerAndLogin({ email: `logout_${Date.now()}@example.com` });
            const { status, body } = await request('POST', '/auth/logout', { token });

            expect(status).toBe(200);
            expect(body.success).toBe(true);
        });
    });

    describe('DELETE /auth/account', () => {
        it('should delete account and all associated data', async () => {
            const { token } = await registerAndLogin({ email: `delete_${Date.now()}@example.com` });

            const { status, body } = await request('DELETE', '/auth/account', { token });
            expect(status).toBe(200);
            expect(body.success).toBe(true);

            const { status: meStatus } = await request('GET', '/auth/me', { token });
            expect(meStatus).toBe(404);
        });
    });
});
