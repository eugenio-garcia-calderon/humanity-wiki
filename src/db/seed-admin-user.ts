import { db } from './index.ts';
import { sql } from 'drizzle-orm';
import { hashPassword, ROLE } from '../server/auth.ts';

// Siembra el usuario administrador real en base de datos, sustituyendo las
// credenciales que hasta la Fase 2 estaban escritas directamente en el código
// del cliente (`AuthContext`) — donde eran visibles para cualquiera que
// abriese las herramientas de desarrollo del navegador.
//
// La contraseña se toma de ADMIN_PASSWORD si está definida; si no, se usa la
// que ya venía usando el proyecto, para no cambiarle el acceso al usuario sin
// avisar. En ambos casos se guarda hasheada con scrypt, nunca en claro.

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'eugenio@lighthumanity.org';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AdminEvo2026!';
const ADMIN_ID = 'U_ADMIN_EUGENIO';

async function main() {
  const existing = await db.execute(sql`SELECT id FROM users WHERE lower(email) = ${ADMIN_EMAIL.toLowerCase()}`);

  if (existing.rows.length > 0) {
    const id = (existing.rows[0] as any).id;
    await db.execute(sql`
      UPDATE users SET
        password_hash = ${hashPassword(ADMIN_PASSWORD)},
        role_level = ${ROLE.ADMIN},
        email_verified = true,
        display_name = COALESCE(display_name, 'Eugenio'),
        version = version + 1,
        updated_at = now()
      WHERE id = ${id}
    `);
    console.log(`Administrador actualizado: ${ADMIN_EMAIL} (${id}), nivel ${ROLE.ADMIN}.`);
  } else {
    await db.execute(sql`
      INSERT INTO users (id, email, name, display_name, password_hash, role, role_level, email_verified, bio, created_by)
      VALUES (${ADMIN_ID}, ${ADMIN_EMAIL}, 'Eugenio', 'Eugenio',
              ${hashPassword(ADMIN_PASSWORD)}, 'admin', ${ROLE.ADMIN}, true,
              'Impulsor de Humanity.wiki.', ${ADMIN_ID})
    `);
    console.log(`Administrador creado: ${ADMIN_EMAIL} (${ADMIN_ID}), nivel ${ROLE.ADMIN}.`);
  }

  console.log('La contraseña se ha almacenado hasheada (scrypt). Nunca se guarda en claro.');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
