// ============================================================================
// TRICICLO BALA · el cuarto vehículo del editor (2026-11-10, Eugenio)
// ============================================================================
// Eugenio: «Desarrolla una ramificación del cuadriciclo bala… que en vez de ser
// de 4 ruedas sea de 3… las dos ruedas delanteras están como en una posición
// como el aptera, y luego tiene una rueda trasera alineada con el eje del
// vehículo, y tiene una forma exactamente igual que la que tiene el cuadriciclo
// bala… Métele también dos pasajeros… la capacidad de reclinación del asiento»,
// y que se pueda modificar todo lo que se modifica en el «Aptera like» (el
// Aeromóvil 1): carrocería, carenados, chasis, rodaje, motor, batería, interior.
//
// THE SHAPE IS THE CUADRICICLO'S: the same parametrised code (garaje/balaForma.ts,
// balaMedidas.ts), fed with this vehicle's own `t…` fields. With the defaults
// the body (skin, canopy, nose, tail, fin, livery, lamps) is the Cuadriciclo en rombo
// Bala's default body to the last vertex (scripts/triciclo-disenos.ts checks it).
// What changes is the wheels: a tadpole layout.
//   · No front centre wheel. Where it was (the nose, around the front axle)
//     goes the battery: low and as far forward as it fits, which is where a
//     three-wheeler with two wheels in front wants its weight (see `vuelco`).
//   · Two front wheels in Aptera-like pods on streamlined arms, beside the
//     front of the body, at the front axle (x = 0, where the Cuadriciclo en rombo's
//     front wheel was). They steer, and the pods turn with them, as on the
//     Aptera: a fixed pod with room for a 28° lock inside would be twice as
//     wide. The check is that the turned pod clears the body.
//   · One rear wheel on the centre line inside the tail, on a swing arm, with
//     the motor in its hub.
//
// Pure (no three.js): the wind tunnel's Web Worker builds it for «Probar» and
// for the Cd the results use.
//
// 2026-11-16 (refactor «ordenar»): the code lives in ./triciclo/, one file per topic (see CLAUDE.md in this folder).
// This file only re-exports it, so every existing import from './geometriaTriciclo' keeps working. New code inside
// triciclo/ imports its siblings directly, never this file (a cycle through here would load half-built modules).
export * from './triciclo/campos';
export * from './triciclo/medidas';
export * from './triciclo/ocupantes';
export * from './triciclo/bascula';
export * from './triciclo/modelo';
export * from './triciclo/masas';
export * from './triciclo/comprobaciones';
export * from './triciclo/energia';
