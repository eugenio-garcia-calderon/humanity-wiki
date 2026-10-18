// Un miembro normal (nivel 1) para la copia local de Wikiproducts: el que
// puntúa y compra. Lo llama `local.sh`; nunca se ejecuta contra producción
// (ver la comprobación de abajo).
import { db } from '../../src/db/index.ts';
import { sql } from 'drizzle-orm';
import { hashPassword, ROLE } from '../../src/server/auth.ts';

async function main() {
  if (process.env.SQL_HOST !== 'localhost') throw new Error('Esto es sólo para la copia local (SQL_HOST=localhost).');
  const email = process.env.MIEMBRO_EMAIL, clave = process.env.MIEMBRO_PASSWORD;
  if (!email || !clave) throw new Error('Faltan MIEMBRO_EMAIL y MIEMBRO_PASSWORD.');
  await db.execute(sql`
    INSERT INTO users (id, email, name, display_name, password_hash, role, role_level, email_verified, created_by)
    VALUES ('U_PRUEBA_MIEMBRO', ${email}, 'PRUEBA Miembro', 'PRUEBA Miembro',
            ${hashPassword(clave)}, 'user', ${ROLE.USER}, true, 'U_PRUEBA_MIEMBRO')
    ON CONFLICT (id) DO NOTHING
  `);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
