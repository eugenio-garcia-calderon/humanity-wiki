import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from './index';

// ============================================================================
// EL MAPA DE INDICADORES DE LA HUMANIDAD, COMO PUBLICACIÓN REAL
// (2026-08-08, petición del usuario)
// ============================================================================
// Hasta hoy este mapa era un nodo pintado a mano en src/pages/Mapas.tsx: se
// veía, se podía abrir, y decía «de Eugenio García-Calderón Huerta» — pero no
// existía en ninguna tabla. Nadie podía editarlo, ni hacerlo privado, ni
// invitar a nadie, porque no había nada que editar.
//
// En la nueva visión un mapa es una publicación como cualquier otra, así que
// pasa a ser una fila de user_maps de eugenio@lighthumanity.org. `config`
// lleva `principal: true`, que es lo único que lo distingue de los demás: en
// vez de dibujarse desde su propia configuración, abre /mapa, el mapa mayor de
// la plataforma.
//
// Idempotente: se puede volver a lanzar sin duplicar ni pisar los cambios de
// título o descripción que se hayan hecho desde la interfaz.

const AUTOR = 'U_ADMIN_EUGENIO';
const ID = 'UM_MAPA_HUMANIDAD';
const SLUG = 'mapa-de-indicadores-de-la-humanidad';

async function main() {
  const autor = await db.execute(sql`SELECT id FROM users WHERE id = ${AUTOR}`);
  if (!autor.rows.length) {
    throw new Error(`No existe el usuario ${AUTOR}. Lanza antes seed-admin-user.ts`);
  }

  const config = {
    principal: true,
    ruta: '/mapa',
    objetivos: 14,
    nota: 'Los datos los sirve el mapa de la plataforma, no este config.',
  };

  await db.execute(sql`
    INSERT INTO user_maps (id, title, slug, description, creator_user_id, config,
                           trigger_keywords, status, is_ai_generated, created_by, updated_by)
    VALUES (${ID},
            'Mapa de Indicadores de la Humanidad',
            ${SLUG},
            'El mapa mayor de la plataforma: los 14 objetivos, sus indicadores y todos los territorios, del planeta al municipio.',
            ${AUTOR},
            ${JSON.stringify(config)}::jsonb,
            ${JSON.stringify(['mapa', 'indicadores', 'territorios', 'objetivos'])}::jsonb,
            'publicado', false, ${AUTOR}, ${AUTOR})
    ON CONFLICT (id) DO UPDATE SET
      -- El título y la descripción son editables desde «Mis publicaciones»:
      -- la semilla no los pisa una vez existen.
      config = EXCLUDED.config,
      creator_user_id = EXCLUDED.creator_user_id,
      updated_at = now()
  `);

  // Está terminado: es el mapa que lleva viviendo en producción desde el
  // principio, no algo a medias.
  await db.execute(sql`
    INSERT INTO publicacion_meta (tipo, entity_id, estado, colaboradores, updated_by)
    VALUES ('mapa', ${ID}, 'terminado', '[]'::jsonb, ${AUTOR})
    ON CONFLICT (tipo, entity_id) DO NOTHING
  `);

  const r = await db.execute(sql`
    SELECT m.title, m.slug, m.status, u.email, pm.estado
    FROM user_maps m
    LEFT JOIN users u ON u.id = m.creator_user_id
    LEFT JOIN publicacion_meta pm ON pm.tipo = 'mapa' AND pm.entity_id = m.id
    WHERE m.id = ${ID}
  `);
  console.log('Mapa principal listo:', r.rows[0]);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
