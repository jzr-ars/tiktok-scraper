/** Runs before `index.ts` via `docker-entry.ts`. Helps debug silent Bun exits in Docker. */
console.error('[api] docker entry: loading preload…');
console.error(
  '[preload]',
  JSON.stringify({
    nodeEnv: process.env.NODE_ENV,
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    hasRedisUrl: Boolean(process.env.REDIS_URL),
    port: process.env.PORT,
  }),
);

process.on('uncaughtException', (err) => {
  console.error('[fatal] uncaughtException', err?.stack || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[fatal] unhandledRejection', reason);
});
