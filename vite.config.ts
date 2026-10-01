import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

// ============================================================================
// QUÉ TROZOS HAY QUE ANUNCIAR EN EL HTML (2026-10-01)
// ============================================================================
// `main.tsx` elige entre dos aplicaciones —la plataforma o la web de un
// dominio propio— y cada una llega en su trozo, para que quien abre
// `luzhumanidad.com` no se baje la plataforma entera. El precio de partirlas
// es un viaje más: el navegador no sabe que necesita `App` hasta que ha bajado
// y ejecutado `main`. Se paga con `<link rel="modulepreload">`, que le dice
// desde el HTML qué bajar a la vez.
//
//   · La plataforma: los enlaces van escritos en `index.html` con
//     `data-app="casa"`. El servidor los quita cuando sirve un dominio propio.
//   · El dominio propio: la lista va a `dist/precarga.json` y la añade el
//     servidor (`sitios.ts`) al HTML que sirve en un dominio propio.
function trozosDe(bundle: Record<string, any>, modulo: string): string[] {
  const porNombre = bundle;
  // En `transformIndexHtml` Vite entrega los trozos sin `facadeModuleId`:
  // se reconoce entonces por ser una entrada dinámica que contiene el módulo.
  const raiz = Object.values(bundle).find((c: any) => c.type === 'chunk'
    && (c.facadeModuleId ? c.facadeModuleId.endsWith(modulo)
      : c.isDynamicEntry && c.moduleIds?.some((m: string) => m.endsWith(modulo)))) as any;
  if (!raiz) return [];
  // Lo que ya importa la entrada ya lo anuncia Vite: no repetirlo.
  const entrada = Object.values(bundle).find((c: any) => c.type === 'chunk' && c.isEntry) as any;
  const yaEsta = new Set<string>([entrada?.fileName, ...(entrada?.imports || [])]);
  const vistos = new Set<string>();
  const pila = [raiz.fileName];
  while (pila.length) {
    const f = pila.pop()!;
    if (vistos.has(f) || yaEsta.has(f)) continue;
    vistos.add(f);
    pila.push(...(porNombre[f]?.imports || []));
  }
  return [...vistos];
}

function precargas(): Plugin {
  return {
    name: 'precargas',
    apply: 'build',
    enforce: 'post',
    // `order: 'post'`: sólo después de que Vite haya escrito los trozos
    // existe `ctx.bundle`.
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html;
        const enlaces = trozosDe(ctx.bundle, '/src/App.tsx')
          .map(f => `<link rel="modulepreload" crossorigin href="/${f}" data-app="casa">`).join('\n    ');
        return html.replace('</head>', `    ${enlaces}\n  </head>`);
      },
    },
    generateBundle(_, bundle) {
      this.emitFile({
        type: 'asset', fileName: 'precarga.json',
        source: JSON.stringify({ dominio: trozosDe(bundle, '/src/AplicacionDeDominio.tsx').map(f => '/' + f) }),
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), precargas()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // PODER PROBAR LOS DOMINIOS PROPIOS EN LOCAL (2026-08-22).
      //
      // Un dominio propio se reconoce por el `Host`, así que probarlo obliga a
      // entrar por un nombre que NO sea `localhost` — si no, el código lo trata
      // como la plataforma y nunca se ejecuta la rama que se quiere probar.
      //
      // `sslip.io` resuelve cualquier `1.2.3.4.sslip.io` a esa IP, así que
      // `http://127.0.0.1.sslip.io:3001` llega a este mismo servidor con otro
      // nombre. Vite bloquea por defecto los anfitriones que no conoce, y sin
      // esta línea la prueba termina en «Blocked request» y no en la página.
      //
      // Sólo afecta al servidor de desarrollo: en producción sirve Express.
      // `localtest.me` va primero porque algunos navegadores y bloqueadores
      // tratan `sslip.io` como sospechosa y no cargan sus scripts: la prueba
      // termina en una página en blanco que parece un fallo del código.
      allowedHosts: ['.localtest.me', '.sslip.io', '.localhost'],
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
