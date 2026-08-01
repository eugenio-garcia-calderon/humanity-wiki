const fs = require('fs');
let code = fs.readFileSync('src/components/HumanityMap.tsx', 'utf8');

code = code.replace(
  "const hasPlanets = zoom < 2.0;",
  "const hasPlanets = zoom < 2.5;"
);
code = code.replace(
  "const hasContinents = zoom >= 2.0 && zoom < 3.5;",
  "const hasContinents = zoom >= 2.5 && zoom < 3.5;"
);
code = code.replace(
  "maxzoom: 2.0,",
  "maxzoom: 2.5,"
);
code = code.replace(
  "maxzoom: 2.0,",
  "maxzoom: 2.5,"
);
code = code.replace(
  "minzoom: 2.0,",
  "minzoom: 2.5,"
);
code = code.replace(
  "minzoom: 2.0,",
  "minzoom: 2.5,"
);

fs.writeFileSync('src/components/HumanityMap.tsx', code);
