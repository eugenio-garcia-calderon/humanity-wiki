// ============================================================================
// LAS GRÁFICAS DE UNA VENTANA (2026-08-22)
// ============================================================================
// Estaban dentro de `WindowContent`, que pinta cualquier tipo de ventana y se
// usa en la portada, en el lienzo y en el editor de páginas. Como estaban ahí,
// la librería de gráficas entraba en el fichero que se descarga al ENTRAR: todo
// el mundo pagaba el motor de gráficas aunque no hubiera una sola en pantalla.
//
// Sacadas a su propio fichero, se descargan la primera vez que aparece una
// gráfica de verdad y se quedan en la caché del navegador. Quien no vea
// ninguna, no las baja nunca.
//
// ES SOLO UN TRASLADO: el dibujo es exactamente el mismo que había, con los
// mismos colores, la misma altura y el mismo formato del rótulo. Si algo se ve
// distinto a como se veía ayer, es un fallo de este traslado y no un cambio de
// diseño.
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

// LOS COLORES SON LOS DE SIEMPRE, copiados tal cual de donde estaban. Al mover
// esto por poco me invento una paleta parecida: las gráficas que ya existen
// habrían cambiado de color sin que nadie lo hubiera pedido, y eso es un fallo
// disfrazado de mejora.
const CHART_COLORS = ['#059669', '#0284c7', '#d97706', '#7c3aed', '#dc2626', '#64748b', '#0d9488'];

export default function Graficas({ chart, height }: { chart: any; height: number }) {
  const data = Array.isArray(chart?.data) ? chart.data : [];
  if (!data.length) return null;

  if (chart.type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
          <XAxis dataKey="name" tick={{ fontSize: 9 }} />
          <YAxis tick={{ fontSize: 9 }} />
          <Tooltip contentStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="value" stroke="#059669" strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
          {data.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: any, n: any) => [`${v}${chart.unit || '%'}`, n]} />
      </PieChart>
    </ResponsiveContainer>
  );
}
