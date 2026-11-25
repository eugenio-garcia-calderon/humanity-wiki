#!/usr/bin/env node
// Measures per aspect and level for the Geometría test, written by the evaluador-geometria agent.
//   node scripts/geometria-medidas.mjs --verificar [tema]   validate scripts/medidas/datos/*.json
//   node scripts/geometria-medidas.mjs --aplicar            validate all and build public/geometria-figura/medidas.json
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DATOS = JSON.parse(fs.readFileSync(path.join(RAIZ, "public/geometria-figura/datos.json"), "utf8"));
const DIR = path.join(RAIZ, "scripts/medidas/datos");
const SALIDA = path.join(RAIZ, "public/geometria-figura/medidas.json");

// Labels and party names stay out of the measures: the page values measures, not people
const PROHIBIDO = /\b(antisistema|ultras?|radical(es)?|extremas?|extremos?|extremistas?|fachas?|izquierda|derecha|PP|PSOE|Vox|Sumar|Podemos|Bildu|ERC|Junts|PNV|Frente Amplio)\b/i;
const CIFRA = /\d+([.,]\d+)?\s?(%|€|euros|millones|mil millones)/i;

function validar(k) {
  const err = [];
  const tema = DATOS.temas.find((t) => t.k === k);
  if (!tema) return [`tema desconocido: ${k}`];
  const f = path.join(DIR, `${k}.json`);
  if (!fs.existsSync(f)) return [`falta ${path.relative(RAIZ, f)}`];
  let d;
  try { d = JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { return [`JSON no válido: ${e.message}`]; }
  const largo = (s, a, b, donde) => { if (typeof s !== "string" || s.trim().length < a || s.trim().length > b) err.push(`${donde}: debe tener entre ${a} y ${b} caracteres (tiene ${typeof s === "string" ? s.trim().length : "nada"})`); };
  const limpio = (s, donde) => { const m = typeof s === "string" && s.match(PROHIBIDO); if (m) err.push(`${donde}: no se usa «${m[0]}»`); };
  if (d.tema !== k) err.push(`"tema" debe ser "${k}"`);
  const ev = d.evaluacion || {};
  if (!Number.isInteger(ev.nota) || ev.nota < 1 || ev.nota > 10) err.push("evaluacion.nota: entero de 1 a 10");
  largo(ev.resumen, 40, 600, "evaluacion.resumen");
  if (!Array.isArray(ev.problemas) || ev.problemas.length < 3) err.push("evaluacion.problemas: al menos 3");
  else ev.problemas.forEach((p, j) => { largo(p.problema, 15, 400, `problema ${j + 1}`); largo(p.mejora, 15, 400, `problema ${j + 1} (mejora)`); });
  if (!Array.isArray(d.aspectos) || d.aspectos.length !== tema.ejes.length) { err.push(`aspectos: deben ser ${tema.ejes.length}`); return err; }
  d.aspectos.forEach((a, i) => {
    const donde = `aspecto ${i + 1}`;
    if (a.i !== i) err.push(`${donde}: "i" debe ser ${i}`);
    if (a.n !== tema.ejes[i].n) err.push(`${donde}: "n" debe ser «${tema.ejes[i].n}»`);
    if (!Array.isArray(a.niveles) || a.niveles.length !== 5) { err.push(`${donde}: 5 niveles`); return; }
    const vistos = new Set();
    a.niveles.forEach((nv, j) => {
      const dn = `${donde}, nivel ${j}`;
      if (nv.nivel !== j) err.push(`${dn}: "nivel" debe ser ${j}`);
      largo(nv.resumen, 40, 200, `${dn} (resumen)`); limpio(nv.resumen, `${dn} (resumen)`);
      const [mn, mx] = j === 0 ? [2, 3] : [3, 5];
      if (!Array.isArray(nv.medidas) || nv.medidas.length < mn || nv.medidas.length > mx) { err.push(`${dn}: de ${mn} a ${mx} medidas`); return; }
      nv.medidas.forEach((m, q) => {
        const dm = `${dn}, medida ${q + 1}`;
        largo(m.nombre, 3, 70, `${dm} (nombre)`); largo(m.texto, 40, 300, `${dm} (texto)`);
        limpio(m.nombre, dm); limpio(m.texto, dm);
        if (typeof m.nombre === "string" && /\.\s*$/.test(m.nombre)) err.push(`${dm}: el nombre va sin punto final`);
        const clave = String(m.nombre || "").toLowerCase().trim();
        if (vistos.has(clave)) err.push(`${dm}: nombre repetido en este aspecto («${m.nombre}»)`);
        vistos.add(clave);
        if (CIFRA.test(m.texto || "") && m.meta !== true && !/^https?:\/\//.test(m.fuente || "")) err.push(`${dm}: tiene una cifra; marca "meta": true si es un objetivo, o pon "fuente" si es un dato`);
      });
    });
  });
  return err;
}

const args = process.argv.slice(2);
const temas = args[1] ? [args[1]] : DATOS.temas.map((t) => t.k);
if (args[0] === "--verificar" || args[0] === "--aplicar") {
  let mal = 0;
  for (const k of temas) {
    const e = validar(k);
    if (e.length) { mal++; console.log(`✗ ${k}: ${e.length} problema(s)`); e.slice(0, 40).forEach((x) => console.log("   - " + x)); }
    else console.log(`✓ ${k}: el tema está bien`);
  }
  if (mal) process.exit(1);
  if (args[0] === "--aplicar") {
    // Compact copy for the page: per topic, per aspect, per level → [resumen, [[nombre, texto], …]]
    const out = { version: 1, temas: {} };
    for (const k of temas) {
      const d = JSON.parse(fs.readFileSync(path.join(DIR, `${k}.json`), "utf8"));
      out.temas[k] = d.aspectos.map((a) => a.niveles.map((nv) => [nv.resumen.trim(), nv.medidas.map((m) => [m.nombre.trim(), m.texto.trim()])]));
    }
    fs.writeFileSync(SALIDA, JSON.stringify(out));
    console.log(`Escrito ${path.relative(RAIZ, SALIDA)} (${Math.round(fs.statSync(SALIDA).size / 1024)} KB)`);
  }
} else {
  console.log("Uso: --verificar [tema] | --aplicar");
}
