import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('[db] DATABASE_URL is missing (check Docker env and apps/api/.env).');
  throw new Error('DATABASE_URL is not set in environment variables');
}

const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });
