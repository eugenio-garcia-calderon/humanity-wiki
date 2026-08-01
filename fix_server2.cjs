const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  "if (zoom < 2.0) queryType = 'planet';",
  "if (zoom < 2.5) queryType = 'planet';"
);

fs.writeFileSync('server.ts', code);
