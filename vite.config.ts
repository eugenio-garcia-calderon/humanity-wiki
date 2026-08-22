import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
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
