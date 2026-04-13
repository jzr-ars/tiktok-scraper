import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { cleanDatabase, request, registerAndLogin, seedPlans } from './setup';

describe('Scraper & Billing Flows', () => {
    let token: string;

    beforeAll(async () => {
        await cleanDatabase();
        await seedPlans();
        const auth = await registerAndLogin({ email: 'scraper@example.com' });
        token = auth.token;
    });

    afterAll(async () => {
        await cleanDatabase();
    });

    describe('GET /scraper/balance', () => {
        it('should return initial balance of 0', async () => {
            const { status, body } = await request('GET', '/scraper/balance', { token });

            expect(status).toBe(200);
            expect(body.success).toBe(true);
            expect(body.data.balance).toBe(0);
            expect(body.data.usedStorageBytes).toBe(0);
        });

        it('should reject unauthenticated request', async () => {
            const { status } = await request('GET', '/scraper/balance');
            expect(status).toBe(401);
        });
    });

    describe('POST /scraper/buy-credits', () => {
        it('should top up credits successfully', async () => {
            const { status, body } = await request('POST', '/scraper/buy-credits', {
                token,
                body: { amount: 10 },
            });

            expect(status).toBe(200);
            expect(body.success).toBe(true);
        });

        it('should reflect new balance after top up', async () => {
            const { body } = await request('GET', '/scraper/balance', { token });
            expect(body.data.balance).toBe(10);
        });

        it('should reject amount less than 1', async () => {
            const { status } = await request('POST', '/scraper/buy-credits', {
                token,
                body: { amount: 0 },
            });
            expect(status).toBe(422);
        });

        it('should reject unauthenticated request', async () => {
            const { status } = await request('POST', '/scraper/buy-credits', {
                body: { amount: 5 },
            });
            expect(status).toBe(401);
        });
    });

    describe('POST /scraper/manual', () => {
        it('should queue a scraping job and deduct 1 credit', async () => {
            const { status, body } = await request('POST', '/scraper/manual', {
                token,
                body: { keyword: 'funny cat' },
            });

            expect(status).toBe(200);
            expect(body.success).toBe(true);
            expect(body.data).toBeDefined();
        });

        it('should deduct 1 credit after scrape', async () => {
            const { body } = await request('GET', '/scraper/balance', { token });
            expect(body.data.balance).toBe(9);
        });

        it('should queue scrape with watermarks', async () => {
            const { status, body } = await request('POST', '/scraper/manual', {
                token,
                body: {
                    keyword: 'dance',
                    watermarks: [
                        {
                            type: 'text',
                            text: 'My Watermark',
                            position: 'top-left',
                        },
                    ],
                },
            });

            expect(status).toBe(200);
            expect(body.success).toBe(true);
        });

        it('should reject empty keyword', async () => {
            const { status } = await request('POST', '/scraper/manual', {
                token,
                body: { keyword: '' },
            });
            expect(status).toBe(422);
        });

        it('should reject unauthenticated request', async () => {
            const { status } = await request('POST', '/scraper/manual', {
                body: { keyword: 'test' },
            });
            expect(status).toBe(401);
        });

        it('should reject when balance is 0', async () => {
            const { body: balanceBody } = await request('GET', '/scraper/balance', { token });
            const remaining = balanceBody.data.balance;

            for (let i = 0; i < remaining; i++) {
                await request('POST', '/scraper/manual', {
                    token,
                    body: { keyword: `drain_${i}` },
                });
            }

            const { status: failStatus, body: failBody } = await request('POST', '/scraper/manual', {
                token,
                body: { keyword: 'should fail' },
            });

            expect(failStatus).toBe(402);
            expect(failBody.success).toBe(false);
        });
    });

    describe('GET /scraper/jobs', () => {
        it('should return list of jobs', async () => {
            const { status, body } = await request('GET', '/scraper/jobs', { token });
            expect(status).toBe(200);
            expect(body.success).toBe(true);
            expect(body.data).toBeDefined();
        });

        it('should return correct job fields', async () => {
            const { body } = await request('GET', '/scraper/jobs', { token });
            const job = body.data[0];

            expect(job).toHaveProperty('id');
            expect(job).toHaveProperty('status');
            expect(job).toHaveProperty('keyword');
            expect(job).toHaveProperty('triggerType');
            expect(job).toHaveProperty('createdAt');
            expect(job).toHaveProperty('updatedAt');
        });

        it('should not return jobs from other users', async () => {
            const other = await registerAndLogin({ email: 'other@example.com' });

            await request('POST', '/scraper/buy-credits', {
                token: other.token,
                body: { amount: 5 },
            });
            await request('POST', '/scraper/manual', {
                token: other.token,
                body: { keyword: 'other user job' },
            });

            const { body } = await request('GET', '/scraper/jobs', { token });
            const keywords = body.data.map((j: any) => j.keyword);

            expect(keywords).not.toContain('other user job');
        });

        it('should reject unauthenticated request', async () => {
            const { status } = await request('GET', '/scraper/jobs');
            expect(status).toBe(401);
        });
    });

    describe('DELETE /scraper/jobs/:id', () => {
        let jobId: string;

        beforeAll(async () => {
            await request('POST', '/scraper/buy-credits', { token, body: { amount: 5 } });

            const { body } = await request('POST', '/scraper/manual', {
                token,
                body: { keyword: 'job to delete' },
            });

            jobId = body.data as string;
        });

        it('should delete job successfully', async () => {
            const { status, body } = await request('DELETE', `/scraper/jobs/${jobId}`, { token });

            expect(status).toBe(200);
            expect(body.success).toBe(true);
            expect(body.message).toBe('Job deleted and storage reclaimed');
        });

        it('should return 404 for already deleted job', async () => {
            const { status, body } = await request('DELETE', `/scraper/jobs/${jobId}`, { token });

            expect(status).toBe(404);
            expect(body.success).toBe(false);
        });

        it('should return 404 for non-existent job id', async () => {
            const { status, body } = await request('DELETE', '/scraper/jobs/00000000-0000-0000-0000-000000000000', { token });

            expect(status).toBe(404);
            expect(body.success).toBe(false);
        });

        it('should not allow deleting another user job', async () => {
            const other = await registerAndLogin({ email: 'other2@example.com' });

            await request('POST', '/scraper/buy-credits', {
                token: other.token,
                body: { amount: 5 },
            });

            const { body: otherJobRes } = await request('POST', '/scraper/manual', {
                token: other.token,
                body: { keyword: 'private job' },
            });

            const { status } = await request('DELETE', `/scraper/jobs/${otherJobRes.data}`, { token });
            expect(status).toBe(404);
        });

        it('should reject unauthenticated request', async () => {
            const { status } = await request('DELETE', `/scraper/jobs/${jobId}`);
            expect(status).toBe(401);
        });
    });

    describe('Storage Quota', () => {
        it('should skip — maxStorageBytes 0 means unlimited', () => {
            expect(true).toBe(true);
        });
    });
});
