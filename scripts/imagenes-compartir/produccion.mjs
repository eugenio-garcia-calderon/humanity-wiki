// ============================================================================
// PRODUCCIÓN, POR SSH (2026-11-07) — lo comparten `generar.mjs` y `../videos-youtube.mjs`
// ============================================================================
// Las dos herramientas del escaparate leen y escriben la base de datos de producción
// y suben ficheros a `/data/uploads`. Se entra con la llave del despliegue; nada de
// esto vive en el servidor de la aplicación ni se ejecuta desde él.
//
//   HW_SSH   la orden ssh (por defecto la llave de despliegue contra el servidor de producción)
//   HW_DB    el contenedor de Postgres (humanity-wiki-db-1)
//   HW_APP   el contenedor de la aplicación (humanity-wiki-app-1), dueño de /data/uploads
//
// Antes de escribir una fila se guarda entera en `~/copias-manuales/web-top/` (la regla de la
// casa: nunca una escritura en producción sin copia). Solo se cambia la clave que toca, con
// `jsonb_set`, y se sube `version` para que un editor abierto con la página vieja reciba un
// 409 y fusione en vez de pisar lo escrito.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const casa = (s) => s.replace(/(^|\s)~\//g, `$1${os.homedir()}/`);
const SSH = casa(process.env.HW_SSH || 'ssh -i ~/.ssh/humanity_deploy -o BatchMode=yes -o ConnectTimeout=15 deploy@37.27.244.35').split(/\s+/).filter(Boolean);
const DB = process.env.HW_DB || 'humanity-wiki-db-1';
const APP = process.env.HW_APP || 'humanity-wiki-app-1';
export const COPIAS = path.join(os.homedir(), 'copias-manuales', 'web-top');

function ssh(orden, entrada) {
  const r = spawnSync(SSH[0], [...SSH.slice(1), orden], { input: entrada, maxBuffer: 256 * 1024 * 1024 });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`ssh (${r.status}): ${String(r.stderr || '').slice(-600)}`);
  return r.stdout;
}

/** Un texto literal para SQL, a prueba de comillas (dólar con etiqueta al azar). */
export function literal(s) {
  const tag = `hw${crypto.randomBytes(6).toString('hex')}`;
  return `$${tag}$${String(s)}$${tag}$`;
}

/** Una consulta de solo lectura: devuelve sus filas como objetos. */
export function leer(consulta) {
  const sql = `SELECT coalesce(json_agg(t), '[]'::json) FROM (${consulta.trim().replace(/;\s*$/, '')}) t;`;
  const out = ssh(`docker exec -i ${DB} psql -U humanity -d humanity -v ON_ERROR_STOP=1 -At`, sql).toString('utf8').trim();
  return JSON.parse(out || '[]');
}

/** Guarda la fila entera de esas páginas antes de tocarlas. Devuelve el fichero. */
export function copiar(ids, motivo) {
  if (!ids.length) return null;
  const filas = leer(`SELECT id, title, version, updated_at, config FROM knowledge_windows WHERE id IN (${ids.map(literal).join(', ')})`);
  fs.mkdirSync(COPIAS, { recursive: true });
  const f = path.join(COPIAS, `${motivo}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(f, JSON.stringify(filas, null, 1));
  return f;
}

/** Cambia UNA clave de `config` (un camino de `jsonb_set`, p. ej. `{imagenCompartir}` o
 *  `{sitio,videos}`) en cada página: `[{ id, valor }]`. Todo en una transacción. */
export function escribirClave(camino, cambios) {
  if (!cambios.length) return 0;
  const sql = ['BEGIN;', ...cambios.map(c =>
    `UPDATE knowledge_windows SET config = jsonb_set(config, ${literal(camino)}::text[], ${literal(JSON.stringify(c.valor))}::jsonb, true), version = version + 1 WHERE id = ${literal(c.id)};`), 'COMMIT;'].join('\n');
  const out = ssh(`docker exec -i ${DB} psql -U humanity -d humanity -v ON_ERROR_STOP=1 -At`, sql).toString('utf8');
  const n = (out.match(/^UPDATE 1$/gm) || []).length;
  if (n !== cambios.length) throw new Error(`se esperaban ${cambios.length} filas cambiadas y fueron ${n}: ${out.slice(-300)}`);
  return n;
}

/** Sube ficheros locales a `/data/uploads/<carpeta>/` dentro del contenedor de la aplicación. */
export function subir(ficheros, carpeta) {
  if (!ficheros.length) return;
  if (!/^[\w/-]+$/.test(carpeta)) throw new Error(`carpeta rara: ${carpeta}`);
  const tmp = `/tmp/compartir-${process.pid}-${Date.now()}`;
  // Un tar con los ficheros (aplanados: cada uno con su nombre) y, al otro lado, docker cp.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'compartir-'));
  for (const f of ficheros) fs.copyFileSync(f, path.join(dir, path.basename(f)));
  const tar = spawnSync('tar', ['czf', '-', '-C', dir, ...ficheros.map(f => path.basename(f))], { maxBuffer: 512 * 1024 * 1024 });
  fs.rmSync(dir, { recursive: true, force: true });
  if (tar.status !== 0) throw new Error('tar: ' + tar.stderr);
  ssh(`set -e; mkdir -p ${tmp}; tar xzf - -C ${tmp}; docker exec ${APP} mkdir -p /data/uploads/${carpeta}; docker cp ${tmp}/. ${APP}:/data/uploads/${carpeta}/; rm -rf ${tmp}`, tar.stdout);
}
