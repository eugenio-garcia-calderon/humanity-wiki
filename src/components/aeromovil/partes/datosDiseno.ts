// The numbers a part has in THIS design (2026-11-24, Eugenio: «la geometría que está detrás, los ángulos, dimensiones»): the power
// the design asks of the motor, the size of the battery pack, the tubes of the frame. Read from the design and from the results the
// page already computes — never a second source — as [label, value] rows. The steering's own geometry (Ackermann, the angles) has
// its own section (`PanelSubsistema.tsx`, `geometriaDireccion.ts`); the rest of the parts show these rows.
import type { ModeloTriciclo, Parametros, Resultados } from '../geometria';
import { MATERIALES_CARENADO, MATERIALES_CHASIS, RENDIMIENTO_SOLAR, areas } from '../geometria';
import { MASA_SALPICADERO_BLANCO, SELECTORES_TRICICLO, camposTriciclo, limitarTriciclo } from '../geometriaTriciclo';
import { ARQUITECTURAS_HIBRIDO } from '../hibrido';
import { controladorDe, motorDe, reductoraDe, termicoDe } from '../catalogoTren';
import { fichaRueda } from '../ruedas/catalogo';
import type { IdSub } from './tipos';

const f = (v: number, d = 1) => v.toLocaleString('es-ES', { maximumFractionDigits: d });
type Fila = [string, string];
/** The words the page uses for a choice («Dos puertas como el Aptera»), by the field and the value the design holds. */
const nombreDe = (clave: string, valor: unknown) => SELECTORES_TRICICLO.find(x => x.clave === clave)?.opciones.find(o => o.k === valor)?.n ?? String(valor);

export function datosDelDiseno(sub: IdSub, P: Parametros, modelo: ModeloTriciclo, res: Resultados): Fila[] {
  const T = camposTriciclo(P), rt = res.triciclo;
  if (!rt) return [];
  const n = T.tTraseras === 'dos' && T.tRuedas !== 'rombo' ? 2 : 1;
  switch (sub) {
    case 'motor': {
      const cat = motorDe(T.tCatMotor), buje = modelo.motor.tipo === 'buje', motores = buje ? n : 1;
      return [
        ['Dónde va', buje ? `en el buje de la rueda trasera (${motores === 2 ? 'uno en cada una' : 'una sola'})` : 'central, en la corona del planetario del híbrido (MG2)'],
        ['Potencia continua que pide el diseño', `${f(T.tKWNom)} kW${motores > 1 ? ` (${f(T.tKWNom / motores)} kW cada motor)` : ''}`],
        ['Potencia de pico que pide el diseño', `${f(T.tKWPico)} kW${motores > 1 ? ` (${f(T.tKWPico / motores)} kW cada motor)` : ''}`],
        ['Masa que cuenta el proyecto', `${f(modelo.motor.kg, 1)} kg${cat?.kg != null ? ` (la del catálogo: ${f(cat.kg, 1)} kg${cat.montaje === 'buje' ? ` × ${motores}` : ''})` : cat ? ' (el catálogo no la publica: el deslizador)' : ' (el deslizador «Motor»)'}`],
        ['Tamaño del motor dibujado', `${f(modelo.motor.r * 2000, 0)} mm de diámetro × ${f(modelo.motor.ancho * 1000, 0)} mm de ancho`],
        ['Altura de su eje sobre el suelo', `${f(modelo.motor.c[1] * 1000, 0)} mm`],
        ['Velocidad de cálculo del diseño', `${f(T.tVel, 0)} km/h`],
      ];
    }
    case 'controlador': {
      const cat = controladorDe(T.tCatCtrl);
      return [
        ['Potencia de pico que debe dar', `${f(T.tKWPico)} kW`], ['Potencia continua que debe dar', `${f(T.tKWNom)} kW`],
        ['Masa que cuenta el proyecto', `${f(T.tMInversor, 2)} kg${cat?.kg != null ? ' (la del catálogo)' : cat ? ' (el catálogo no la publica: el deslizador «Inversor»)' : ' (el deslizador «Inversor»)'}`],
        ['Dónde va', 'en el módulo del morro o junto al motor, dentro de la carrocería (una comprobación lo vigila)'],
      ];
    }
    case 'reductora': {
      const r = reductoraDe(T.tCatReductora), cat = motorDe(T.tCatMotor), d = fichaRueda(String(T.tRuedaTras))?.d;
      return [
        ['Potencia de pico del diseño', `${f(T.tKWPico)} kW`], ['Velocidad de cálculo', `${f(T.tVel, 0)} km/h`],
        ['Tiene reductora', r ? `sí: ${r.marca} ${r.modelo}, ${f(r.relacion, 2)} : 1` : cat?.reduccion ? `no hace falta: el motor lleva una de ${f(cat.reduccion, 2)} : 1 incorporada` : modelo.motor.tipo === 'buje' ? 'no: un motor de buje mueve la rueda directamente' : 'ninguna elegida todavía'],
        ...(d ? [['Rueda motriz', `${f(d * 1000, 0)} mm de diámetro`] as Fila, ['Vueltas de la rueda a esa velocidad', `${f(T.tVel / 3.6 / (Math.PI * d) * 60, 0)} rpm`] as Fila] : []),
      ];
    }
    case 'termico': {
      const t = termicoDe(T.tCatTermico);
      return [
        ['Potencia que pide el diseño', `${f(T.tPhevKW)} kW`], ['Rendimiento que usa el modelo', `${f(T.tRendTerm, 1)} %`],
        ['Arquitectura del híbrido', ARQUITECTURAS_HIBRIDO.find(a => a.k === (T.tHibArq ?? 'reparto'))?.n ?? 'reparto con planetario'],
        ['Motor elegido', t ? `${t.marca} ${t.modelo}` : 'ninguno del catálogo: el deslizador'],
      ];
    }
    case 'carenado': {
      const ar = areas(modelo) as { carroceria: number; cristal: number; solar: number }, mat = MATERIALES_CARENADO[T.tMatCarenado], esp = limitarTriciclo('tEspCarenado', T);
      return [
        ['Material de la piel', `${mat.n} (${f(mat.kgm2mm, 2)} kg por m² y mm de espesor)`], ['Espesor de la piel', `${f(esp, 1)} mm → ${f(mat.kgm2mm * esp, 2)} kg por m²`],
        ['Superficie de la carrocería', `${f(ar.carroceria, 2)} m²`], ['Morro y cola por arriba', nombreDe('tCubierta', T.tCubierta)],
        ['Formato de la cola', nombreDe('tColaCorte', T.tColaCorte)], ['Aleta', nombreDe('tConAleta', T.tConAleta)],
      ];
    }
    case 'cristales': {
      const ar = areas(modelo) as { carroceria: number; cristal: number; solar: number }, esp = limitarTriciclo('tEspCristal', T);
      return [
        ['Tipo de cúpula', nombreDe('tVentanas', T.tVentanas)], ['Superficie de cristal', `${f(ar.cristal, 2)} m²`], ['Espesor (policarbonato)', `${f(esp, 1)} mm → ${f(esp * 1.2, 2)} kg por m²`],
        ...rt.cabezas.slice(0, 2).map(c => [`Aire sobre la cabeza del ${c.quien}`, `${f(c.p50 * 100, 1)} cm (talla media) · ${f(c.p95 * 100, 1)} cm (talla alta)`] as Fila),
      ];
    }
    case 'solar': {
      const ar = areas(modelo) as { carroceria: number; cristal: number; solar: number }, kgm2 = limitarTriciclo('tSolarM2', T);
      return [
        ['Superficie de panel', `${f(ar.solar, 2)} m²`], ['Masa por m²', `${f(kgm2, 1)} kg/m²`], ['Rendimiento de las células', `${f(RENDIMIENTO_SOLAR * 100, 0)} %`],
        ['Por detrás', nombreDe('tSolarCola', T.tSolarCola)], ['En el morro', nombreDe('tSolarMorro', T.tSolarMorro)],
        ...(rt.energia ? [['Kilómetros que da un día de sol', `${f(rt.energia.kmSol, 1)} km`] as Fila] : []),
      ];
    }
    case 'accesos':
      return [
        ['Acceso', nombreDe('tAcceso', T.tAcceso)], ...(T.tAcceso === 'puertas' ? [['Puertas por lado', nombreDe('tPuertas2', T.tPuertas2)] as Fila, ['Maletero', nombreDe('tMaletero', T.tMaletero)] as Fila] : []),
        ['Maletero ahora', `${f(rt.maletero.ahora, 0)} L (${rt.maletero.estado.toLowerCase()})`],
        ...rt.maletero.estados.slice(0, 4).map(e => [`Maletero: ${e.nombre.toLowerCase()}`, `${f(e.litros, 0)} L`] as Fila),
      ];
    case 'retrovisores':
      return [
        ['Retrovisores', nombreDe('tRetrovisores', T.tRetrovisores)],
        ['Pieza en la lista de pesos', modelo.retrovisor ? `sí: dos espejos de 0,9 kg en total, ${modelo.retrovisor.enPuerta ? 'en la puerta' : 'en la carrocería'}` : 'ninguna: el modelo no cuenta masa para las cámaras en cápsulas'],
      ];
    case 'luces':
      return [
        ['Faro del morro', nombreDe('tFaro', T.tFaro)],
        ['Pieza en la lista de pesos', T.tFaro === 'barra' ? 'sí: la barra de luz por todo el borde del morro, 0,9 kg' : T.tFaro === 'si' ? 'sí: el faro central redondo, 0,7 kg' : 'ninguna: sin faro no hay pieza'],
      ];
    case 'asientos':
      return [
        ['Asientos', nombreDe('tAsientos', T.tAsientos)], ['Plazas', String(rt.ocupantes)], ['Tapicería', nombreDe('tTapiz', T.tTapiz)],
        ['Costura', T.tTapiz === 'serie' ? 'la del vinilo de serie' : nombreDe('tCostura', T.tCostura)], ['Cinturones', nombreDe('tCinturon', T.tCinturon)],
        ...rt.cabezas.map(c => [`Aire sobre la cabeza del ${c.quien}`, `${f(c.p50 * 100, 1)} cm (talla media) · ${f(c.p95 * 100, 1)} cm (talla alta)`] as Fila),
      ];
    case 'mandos':
      return [
        ['Con qué se conduce', nombreDe('tMando', T.tMando)],
        ...(T.tMando === 'volante' ? [['Diámetro del volante', `${f(limitarTriciclo('tVolD', T) * 100, 0)} cm`] as Fila, ['Masa de la columna y el volante', 'figura aparte en la lista de pesos: 1,8 kg'] as Fila] : [['Manillar', 'su masa va dentro del triciclo, no hay pieza aparte'] as Fila]),
      ];
    case 'salpicadero':
      return [['Salpicadero', nombreDe('tSalpicadero', T.tSalpicadero)], ['Pieza en la lista de pesos', T.tSalpicadero === 'blanco' ? `sí: ${f(MASA_SALPICADERO_BLANCO, 1)} kg` : T.tSalpicadero === 'si' ? 'sí: 4,5 kg' : 'ninguna: la pantallita sobre el depósito no es una pieza aparte']];
    case 'acabado': {
      const lineas = rt.piezas.filter(p => /^Interior:/.test(p.nombre));
      return [
        ['Forro del interior', nombreDe('tAcabado', T.tAcabado)],
        ...(T.tAcabado !== 'chasis' ? [['Color', nombreDe('tForroColor', T.tForroColor)] as Fila, ['Molduras', nombreDe('tMoldura', T.tMoldura)] as Fila, ['Consola de techo', nombreDe('tConsolaTecho', T.tConsolaTecho)] as Fila, ['Luz ambiente', nombreDe('tAmbiente', T.tAmbiente)] as Fila] : []),
        ['Reposabrazos y consola', nombreDe('tConsolaCentral', T.tConsolaCentral)],
        ...lineas.map(p => [p.nombre.replace(/^Interior: /, ''), `${f(p.kg, 2)} kg`] as Fila),
      ];
    }
    case 'bateria': {
      const b = rt.bateria;
      return [
        ['Energía', `${f(T.tKWh, 1)} kWh`], ['Densidad del paquete', `${f(T.tWhKg, 0)} Wh/kg · ${f(T.tWhL, 0)} Wh/L`],
        ['Masa del paquete', `${f(b.kg, 1)} kg`], ['Volumen del paquete', `${f(b.litros, 0)} L (caben ${f(b.cabe, 0)} L en sus sitios)`],
        ['Dónde va', T.tBatDisp === 'chasis' ? `un paquete a lo largo del bastidor: ${f(T.tBatLargo, 2)} m de largo, ${f(T.tBatAlto, 2)} m de alto, el ${f(T.tBatAncho, 0)} % del ancho del bastidor` : 'repartida: un módulo en el morro (' + f(b.litrosMorro, 0) + ' L caben), otro entre los pies y, si hace falta, uno bajo los sillines'],
        ['Altura del centro de gravedad del vehículo', `${f(rt.cg.y * 100, 0)} cm`],
      ];
    }
    case 'bastidor': {
      const m = MATERIALES_CHASIS[T.tChMat];
      return [
        ['Material de los tubos', `${m.n} (${f(m.densidad, 0)} kg/m³, aguanta ${f(m.limite, 0)} MPa)`], ['Tubo principal', `${f(T.tChD, 0)} mm de diámetro × ${f(T.tChT, 1)} mm de pared`],
        ['Tubos del bastidor', `${modelo.tubos.length} tramos, ${f(rt.bastidor.metros, 1)} m en total`], ['Separación de los dos largueros', `${f(T.tChSep * 1000, 0)} mm de eje a eje`],
        ['Largueros hasta', T.tChLargo === 'eje' ? 'el eje trasero, con una cuna trasera' : 'la torreta del amortiguador'],
        ['Momento flector en los largueros', `${f(rt.bastidor.M, 0)} N·m`], ['Tensión en los largueros', `${f(rt.bastidor.tension, 0)} MPa`], ['Coeficiente de seguridad', f(rt.bastidor.seguridad, 2)],
      ];
    }
    default: return [];
  }
}
