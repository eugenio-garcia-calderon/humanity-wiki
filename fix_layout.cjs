const fs = require('fs');
let code = fs.readFileSync('src/components/layout/Layout.tsx', 'utf8');

code = code.replaceAll("location.pathname === '/mapa'", "(location.pathname === '/' || location.pathname === '/mapa')");
code = code.replaceAll("location.pathname !== '/mapa'", "(location.pathname !== '/' && location.pathname !== '/mapa')");

fs.writeFileSync('src/components/layout/Layout.tsx', code);
