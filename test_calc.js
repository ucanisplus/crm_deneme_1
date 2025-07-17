const fs = require('fs');
const csvData = fs.readFileSync('TLC_Hizlar.csv', 'utf8');
const lines = csvData.split('\n');

const tlcHizlarCache = {};
lines.slice(1).forEach(line => {
  if (line.trim()) {
    const parts = line.split(';');
    if (parts.length >= 6) {
      const giris = parseFloat(parts[0]);
      const cikis = parseFloat(parts[1]);
      const calismahizi = parseFloat(parts[5]);
      
      if (\!isNaN(giris) && \!isNaN(cikis) && \!isNaN(calismahizi)) {
        const kod = giris + 'x' + cikis;
        tlcHizlarCache[kod] = calismahizi;
      }
    }
  }
});

const calculateTlcHiz = (hmCap, cap) => {
  const exactLookupCode = hmCap + 'x' + cap;
  if (tlcHizlarCache[exactLookupCode]) {
    return tlcHizlarCache[exactLookupCode] * 0.7;
  }
  return null;
};

const calculateTLC01FromComponent = (ymStCap, tlcHiz) => {
  const tlc01Raw = (1000 * 4000 / Math.PI / 7.85 / ymStCap / ymStCap / tlcHiz / 60);
  const tlcValue = parseFloat((tlc01Raw / 1000).toFixed(5));
  return tlcValue;
};

console.log('YOUR COMPONENT CALCULATIONS WITH FLM.0900.1010:');
console.log('================================================');

const tests = [
  { code: 'YM.ST.0769.1000.1010', diameter: 7.69, yourValue: 0.02041 },
  { code: 'YM.ST.0779.1000.1010', diameter: 7.79, yourValue: 0.01989 }
];

tests.forEach(test => {
  const tlcHiz = calculateTlcHiz(9, test.diameter);
  if (tlcHiz) {
    const componentCalc = calculateTLC01FromComponent(test.diameter, tlcHiz);
    console.log(test.code);
    console.log('  Component calc: ' + componentCalc);
    console.log('  Your DB value:  ' + test.yourValue);
    console.log('  Difference:     ' + Math.abs(componentCalc - test.yourValue).toFixed(5));
    console.log('  Ratio:          ' + (test.yourValue / componentCalc).toFixed(2));
    console.log('');
  }
});

// Calculate all 10 products
const products = [
  7.68, 7.69, 7.78, 7.79, 7.83, 7.84, 7.98, 7.99, 8.08, 8.09
];

console.log('ALL 10 PRODUCTS - COMPONENT CALCULATIONS:');
console.log('=========================================');
products.forEach(diameter => {
  const tlcHiz = calculateTlcHiz(9, diameter);
  if (tlcHiz) {
    const tlc01 = calculateTLC01FromComponent(diameter, tlcHiz);
    const code = 'YM.ST.' + (diameter * 100).toString().padStart(4, '0') + '.1000.1010';
    console.log(code + ' → ' + tlc01);
  }
});
