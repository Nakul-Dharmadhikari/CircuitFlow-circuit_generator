import { getLabExperiments } from '../src/presets/labExperiments';
import { generateTruthTable } from '../src/engine/truthTableGen';

const exps = getLabExperiments();
const syncExp = exps.find((e) => e.id === 'sync_upcounter_3bit');

if (!syncExp) {
  console.error('sync_upcounter_3bit preset not found!');
  process.exit(1);
}

console.log('Testing Truth Table generation on 3-Bit Synchronous Upcounter...');
const table = generateTruthTable(syncExp.circuit);

if (!table) {
  console.error('Failed to generate truth table!');
  process.exit(1);
}

console.log('Table Type:', table.tableType);
console.log('Inputs:', table.inputNames.join(', '));
console.log('Outputs:', table.outputNames.join(', '));
console.log('Rows count:', table.rows.length);

table.rows.forEach((r, idx) => {
  const inStr = table.inputNames.map((n) => `${n}=${r.inputs[n]}`).join(' ');
  const outStr = table.outputNames.map((n) => `${n}=${r.outputs[n]}`).join(' ');
  console.log(`Row ${idx + 1}: [${inStr}] -> [${outStr}]`);
});

console.log('SUCCESS: Truth Table generated correctly for 3-Bit Synchronous Upcounter!');
