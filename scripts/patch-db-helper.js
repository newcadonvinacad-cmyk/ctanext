const fs = require('fs');
let c = fs.readFileSync('tests/helpers/production-db.cjs', 'utf8');
c = c.replace(
  /'\.\/authorization\.service':\{[^\r\n]+\}/,
  "'./authorization.service':{AuthorizationService:{getUserCapabilities:async()=>({roles:[],membershipStatus:'active',employeeId:employee,membershipId:membership,capabilities})},invalidateUserCapabilitiesCache:()=>{}}"
);
c = c.replace(
  /'@\/services\/authorization\.service':\{[^\r\n]+\}/,
  "'@/services/authorization.service':{AuthorizationService:{getUserCapabilities:async()=>({roles:[],membershipStatus:'active',employeeId:employee,membershipId:membership,capabilities})},invalidateUserCapabilitiesCache:()=>{}}"
);
fs.writeFileSync('tests/helpers/production-db.cjs', c, 'utf8');
console.log('Successfully patched production-db.cjs!');
