import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
const { Pool } = pg;
import * as schema from './schema.ts';

declare global {
  var _postgresPool: pg.Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    const user = process.env.SQL_ADMIN_USER || process.env.SQL_USER;
    const password = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD;
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user,
      password,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 15000,
      // SE PRESENTA CON NOMBRE (2026-09-30, Feedback del 22 ago). Sin esto el
      // registro sellado anota «humanity@sin-nombre», igual que un psql a mano
      // por SSH, y no distingue al servidor de una persona escribiendo en la
      // base de datos — que es justo lo que interesa ver.
      application_name: 'humanity-wiki',
    });

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();

export const db = drizzle(pool, { schema });
