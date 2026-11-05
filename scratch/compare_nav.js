const fs = require('fs');
const oldApp = fs.readFileSync('c:/Users/khademul/Herd/kiko/AppNavigator.js', 'utf8');
const newApp = fs.readFileSync('c:/Users/khademul/Herd/kiko_mobile/AppNavigator.js', 'utf8');

function getNames(code) {
  const matches = [...code.matchAll(/<Stack\.Screen[^>]*name=["']([^"']+)["']/g)];
  return matches.map(m => m[1]);
}

console.log('=== OLD STACK SCREENS ===', getNames(oldApp));
console.log('=== NEW STACK SCREENS ===', getNames(newApp));
