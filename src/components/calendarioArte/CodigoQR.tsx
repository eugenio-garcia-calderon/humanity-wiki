// QR vectorial: se genera como SVG para que en la impresión salga nítido a
// cualquier tamaño (un PNG pequeño se vería borroso en imprenta).
import { useEffect, useState } from 'react';

export function CodigoQR({ url, lado }: { url: string; lado: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    import('qrcode').then(QR => QR.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' }))
      .then(s => { if (vivo) setSvg(s); })
      .catch(() => { if (vivo) setSvg(null); });
    return () => { vivo = false; };
  }, [url]);
  if (!svg) return <div style={{ width: lado, height: lado }} />;
  return (
    <img
      src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
      alt={`Código QR: ${url}`}
      style={{ width: lado, height: lado }}
    />
  );
}

export function urlConocerMas(mes: number): string {
  return `https://humanity.wiki/calendario-arte?mes=${mes}&conocer=1`;
}
