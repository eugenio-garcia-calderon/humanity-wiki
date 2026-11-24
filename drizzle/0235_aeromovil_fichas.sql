-- 2026-11-24 (Eugenio): «cada componente… el proveedor, las alternativas, las características, el precio… el stock, el peso…
-- una imagen de referencia… documentación… que en cada componente se pueda manejar información en todos los niveles» and
-- «cada componente tenga un número de serie… interior 1, chasis 2, rodaje 1».
--
-- THE RECORD OF A COMPONENT of the Aeromóvil family (what you see when you click a part in the 3D view): its internal
-- number, what it is, the alternatives, the stock, the reference images, the documents and the free notes. One row per
-- vehicle family and component, the value a JSON document:
--   vehiculo  the family the page is showing (`Parametros.disposicion`: triciclo, basculante, cuatro, rombo, bala…)
--   clave     the component by path: 'interior/asientos'; a sub-part is one level deeper: 'interior/asientos/tapizado'
--             (same shape of record at every level; the catalogue of components is in the code, src/components/aeromovil/fichas/registro.ts)
-- It does NOT hold the weight, the price, nor the supplier/model/files of a PART: those already live in the design
-- (`Parametros.pesos`, `.precios`, `.proveedores`: one list of components, no second one). It holds what the design cannot:
-- the design's parameters are capped at 20 KB and are saved by hand; a component's record is saved as it is typed.
-- Not a junction table and not a table per entity. `version` is the optimistic lock: two tabs (or the engineer and an AI
-- session) editing the same record get a conflict instead of silently overwriting each other.
--
-- ── WHAT LEAVES THE BUILDING EVERY NIGHT ─────────────────────────────────────
-- The nightly dump copies this table. What is here is product information (a seat's supplier, a stock count, a link to a
-- datasheet): no person's data, no ID, card or bank numbers (the form does not ask for them). The files themselves are not
-- here (`aeromovil_adjuntos` registers them; the bytes stay on the volume). Read: anyone (the page is public, like the
-- designs); write: the Aeromóvil's owner or an admin (src/server/aeromovilFichas.ts).
CREATE TABLE IF NOT EXISTS aeromovil_fichas (
  vehiculo   text NOT NULL CHECK (vehiculo ~ '^[a-z0-9][a-z0-9_-]{0,39}$'),
  clave      text NOT NULL CHECK (clave ~ '^[a-z0-9][a-z0-9_/-]{0,119}$'),
  valor      jsonb   NOT NULL,
  version    integer NOT NULL DEFAULT 1,
  updated_by text    REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (vehiculo, clave)
);
CREATE INDEX IF NOT EXISTS aeromovil_fichas_updated_by_idx ON aeromovil_fichas(updated_by);
