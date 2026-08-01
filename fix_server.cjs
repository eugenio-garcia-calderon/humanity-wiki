const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  "if (zoom < 2.5) queryType = 'continent';",
  "if (zoom < 2.0) queryType = 'planet';\n      else if (zoom < 3.5) queryType = 'continent';"
);

fs.writeFileSync('server.ts', code);
