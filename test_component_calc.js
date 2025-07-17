// Load the actual TLC_Hizlar.csv data
const fs = require('fs');
const csvData = fs.readFileSync('TLC_Hizlar.csv', 'utf8');
const lines = csvData.split('\n');

// Parse CSV and create lookup cache (exactly like the component does)
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

// Exact calculateTlcHiz function from component
const calculateTlcHiz = (hmCap, cap) => {
  const formattedHmCap = parseFloat(hmCap);
  const formattedCap = parseFloat(cap);
  
  const exactLookupCode = formattedHmCap + 'x' + formattedCap;
  
  if (tlcHizlarCache[exactLookupCode]) {
    const exactMatch = tlcHizlarCache[exactLookupCode];
    return exactMatch * 0.7; // Apply 0.7 multiplier as per formula
  }
  
  return null;
};

// Exact TLC01 calculation from component (lines 2597-2598)
const calculateTLC01FromComponent = (ymStCap, tlcHiz) => {
  const tlc01Raw = (1000 * 4000 / Math.PI / 7.85 / ymStCap / ymStCap / tlcHiz / 60);
  const tlcValue = parseFloat((tlc01Raw / 1000).toFixed(5)); // Exact component formula
  return tlcValue;
};

const products = [
  { code: 'YM.ST.0768.1000.1010', diameter: 7.68 },
  { code: 'YM.ST.0769.1000.1010', diameter: 7.69 },
  { code: 'YM.ST.0778.1000.1010', diameter: 7.78 },
  { code: 'YM.ST.0779.1000.1010', diameter: 7.79 },
  { code: 'YM.ST.0783.1000.1010', diameter: 7.83 },
  { code: 'YM.ST.0784.1000.1010', diameter: 7.84 },
  { code: 'YM.ST.0798.1000.1010', diameter: 7.98 },
  { code: 'YM.ST.0799.1000.1010', diameter: 7.99 },
  { code: 'YM.ST.0808.1000.1010', diameter: 8.08 },
  { code: 'YM.ST.0809.1000.1010', diameter: 8.09 }
];

console.log('ACTUAL VALUES YOUR COMPONENT WOULD CALCULATE:');
console.log('(Using exact component logic with FLM.0900.1010)');
console.log('='.repeat(60));

products.forEach(product => {
  // For FLM.0900.1010, hmCap = 9
  const hmCap = 9;
  const cap = product.diameter;
  
  const tlcHiz = calculateTlcHiz(hmCap, cap);
  
  if (tlcHiz) {
    const tlc01 = calculateTLC01FromComponent(product.diameter, tlcHiz);
    console.log(product.code + ' → TLC01: ' + tlc01);
  } else {
    console.log(product.code + ' → NO TLC_Hiz DATA FOUND');
  }
});

// Test specific known values
console.log('\nCOMPARISON WITH YOUR DATABASE:');
const tlcHiz769 = calculateTlcHiz(9, 7.69);
const tlcHiz779 = calculateTlcHiz(9, 7.79);

if (tlcHiz769) {
  const calc769 = calculateTLC01FromComponent(7.69, tlcHiz769);
  console.log('YM.ST.0769 - Component calc: ' + calc769 + ', Your DB: 0.02041');
}

if (tlcHiz779) {
  const calc779 = calculateTLC01FromComponent(7.79, tlcHiz779);
  console.log('YM.ST.0779 - Component calc: ' + calc779 + ', Your DB: 0.01989');
}
