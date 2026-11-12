import { parseReceiptText } from '../src/lib/ocr';

const receipts = [
  {
    name: "Receipt 1 (Trader Joe's)",
    text: `TRADER JOE'S
Organic Whole Milk $4.99
Bananas Bunch $1.29
Sourdough Boule $3.99
Subtotal: $10.27
Tax: $0.82
Grand Total: $11.09`
  },
  {
    name: "Receipt 2 (Whole Foods Market)",
    text: `WHOLE FOODS MARKET
Almond Butter $8.49
Honeycrisp Apples $4.20
Organic Oats $3.75
Subtotal: $16.44
Tax: $1.15
Total: $17.59`
  },
  {
    name: "Receipt 3 (Target)",
    text: `TARGET STORE
Paper Towels $14.99
Laundry Detergent $19.99
Dish Soap $3.49
Subtotal: $38.47
Tax: $3.08
Amount Due: $41.55`
  }
];

receipts.forEach((r) => {
  const p = parseReceiptText(r.text);
  console.log(`=== ${r.name} ===`);
  console.log(`Merchant: ${p.merchant}`);
  console.log('Line Items:');
  p.items.forEach((item) => {
    console.log(`  - ${item.name.padEnd(20)} : $${(item.amountCents / 100).toFixed(2)} (${item.amountCents}¢)`);
  });
  const itemsSum = p.items.reduce((s, it) => s + it.amountCents, 0);
  console.log(`Items Subtotal Sum     : $${(itemsSum / 100).toFixed(2)} (${itemsSum}¢)`);
  console.log(`Tax Amount             : $${(p.taxCents / 100).toFixed(2)} (${p.taxCents}¢)`);
  console.log(`Items + Tax Calculated : $${((itemsSum + p.taxCents) / 100).toFixed(2)} (${itemsSum + p.taxCents}¢)`);
  console.log(`Grand Total Parsed     : $${(p.totalCents / 100).toFixed(2)} (${p.totalCents}¢)`);
  console.log(`Cent-Exact Match       : ${(itemsSum + p.taxCents) === p.totalCents ? 'PASS (EXACT)' : 'FAIL'}\n`);
});
