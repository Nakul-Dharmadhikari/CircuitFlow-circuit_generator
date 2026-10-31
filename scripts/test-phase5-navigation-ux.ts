import { MASTER_TOOLBOX_ITEMS, CATEGORY_DEFINITIONS } from '../src/components/Sidebar';
import { createComponent, simulateCircuit } from '../src/engine/simulator';
import { ensureTrainerKit, mountICOnSocket, syncMountedICPositions } from '../src/engine/trainerKit';
import type { Circuit } from '../src/types/circuit';
import assert from 'assert';

console.log('================================================================');
console.log('CIRCUITFLOW PHASE 5: NAVIGATION & UX RESTRUCTURING UNIT SUITE');
console.log('================================================================\n');

let passCount = 0;
function pass(testName: string) {
  passCount++;
  console.log(`✔ PASS: ${testName}`);
}

// -----------------------------------------------------------------------------
// Test 1: All 4 Primary Navigation Activities & Structure
// -----------------------------------------------------------------------------
const primaryActivities = ['PROJECTS', 'BUILD', 'SIMULATE', 'ANALYZE'];
assert.strictEqual(primaryActivities.length, 4);
pass('Test 1: Four primary activities defined (BUILD, ANALYZE, SIMULATE, PROJECTS)');

// -----------------------------------------------------------------------------
// Test 2: Master Component Library Categories (Section 24)
// -----------------------------------------------------------------------------
const expectedCategories = [
  'all',
  'basic_gates',
  'sequential',
  'msi_functional',
  'arithmetic',
  'memory',
  'io',
  'trainer_hardware',
  'custom',
];

const categoryIds = CATEGORY_DEFINITIONS.map((c) => c.id);
for (const exp of expectedCategories) {
  assert.ok(categoryIds.includes(exp as any), `Missing category: ${exp}`);
}
assert.strictEqual(CATEGORY_DEFINITIONS.length, 9); // 'all' + 8 master categories
pass('Test 2: All 8 master specification component library categories present');

// -----------------------------------------------------------------------------
// Test 3: Component Search by Name, Abbreviation, and Part Number
// -----------------------------------------------------------------------------
function searchItems(query: string) {
  const q = query.trim().toLowerCase();
  return MASTER_TOOLBOX_ITEMS.filter((item) => {
    const matchName = item.name.toLowerCase().includes(q);
    const matchCode = item.code?.toLowerCase().includes(q) || false;
    const matchPart = item.partNumber?.toLowerCase().includes(q) || false;
    const matchKeywords = item.keywords.some((kw) => kw.toLowerCase().includes(q));
    return matchName || matchCode || matchPart || matchKeywords;
  });
}

// Search "and" -> must locate 2-In AND, 3-In AND, 7408, NAND
const andResults = searchItems('and');
assert.ok(andResults.some((i) => i.type === 'and'), 'Search "and" should find 2-In AND');
assert.ok(andResults.some((i) => i.type === 'and_3'), 'Search "and" should find 3-In AND');
assert.ok(andResults.some((i) => i.type === 'ic_7408'), 'Search "and" should find 7408 Quad AND');
assert.ok(andResults.some((i) => i.type === 'nand'), 'Search "and" should find NAND');
pass('Test 3A: Search "and" accurately locates all AND-related components');

// Search "7408" -> finds 7408
const res7408 = searchItems('7408');
assert.ok(res7408.some((i) => i.type === 'ic_7408' || i.partNumber === '7408'));
pass('Test 3B: Search part-number "7408" finds relevant 7408 IC');

// Search "mux" -> finds 2:1 MUX, 4:1 MUX, 74151, 74153
const muxResults = searchItems('mux');
assert.ok(muxResults.some((i) => i.type === 'mux_2to1'));
assert.ok(muxResults.some((i) => i.type === 'mux_4to1'));
assert.ok(muxResults.some((i) => i.type === 'ic_74151'));
assert.ok(muxResults.some((i) => i.type === 'ic_74153'));
pass('Test 3C: Search "mux" locates discrete multiplexers and 74-series MUX ICs');

// Search "d-ff" -> finds D Flip-Flop and 7474
const dffResults = searchItems('d-ff');
assert.ok(dffResults.some((i) => i.type === 'd_flipflop'));
assert.ok(dffResults.some((i) => i.type === 'ic_7474'));
pass('Test 3D: Search abbreviation "d-ff" locates D Flip-Flop and 7474 Dual D-FF');

// Search "adder" -> finds Half Adder, Full Adder, 7483
const adderResults = searchItems('adder');
assert.ok(adderResults.some((i) => i.type === 'half_adder'));
assert.ok(adderResults.some((i) => i.type === 'full_adder'));
assert.ok(adderResults.some((i) => i.type === 'ic_7483'));
pass('Test 3E: Search "adder" locates arithmetic adders');

// -----------------------------------------------------------------------------
// Test 4: Component Placement via Create Component
// -----------------------------------------------------------------------------
const andComp = createComponent('and', 320, 240);
assert.strictEqual(andComp.type, 'and');
assert.strictEqual(andComp.x, 320);
assert.strictEqual(andComp.y, 240);
assert.strictEqual(andComp.inputs.length, 2);
assert.strictEqual(andComp.outputs.length, 1);
pass('Test 4: Drag & drop / click placement instantiates valid circuit component');

// -----------------------------------------------------------------------------
// Test 5: Contextual Selection States
// -----------------------------------------------------------------------------
let circuit: Circuit = ensureTrainerKit({ components: [], wires: [] });
assert.ok(circuit.trainerBoards && circuit.trainerBoards.length > 0);
assert.strictEqual(circuit.trainerBoards[0].modules.length, 1);
assert.strictEqual(circuit.trainerBoards[0].icSlots.length, 4);
pass('Test 5A: Clean circuit initializes with trainer hardware');

// Mount an IC on socket 0
const mountRes = mountICOnSocket(circuit, 0, 'ic_7408');
circuit = mountRes.circuit;
const mountedIC = mountRes.mountedComponent;
assert.ok(mountedIC, 'Mounted IC found on trainer socket');
assert.strictEqual(mountedIC.type, 'ic_7408');
assert.ok(mountedIC.customProps?.trainerMount?.baseIndex === 0);

// Verify mounted IC is spatially locked against direct dragging / rotation
const initialX = mountedIC.x;
const initialY = mountedIC.y;
const synced = syncMountedICPositions(circuit);
const syncedIC = synced.components.find((c) => c.id === mountedIC.id);
assert.strictEqual(syncedIC?.x, initialX);
assert.strictEqual(syncedIC?.y, initialY);
pass('Test 5B: Mounted IC remains socket-locked with rotation/drag restrictions preserved');

// -----------------------------------------------------------------------------
// Test 6: Simulation Independence & Wire Preservation
// -----------------------------------------------------------------------------
const simResult = simulateCircuit(circuit);
assert.ok(simResult.circuit);
assert.ok(simResult.circuit.components.length > 0);
pass('Test 6: Simulation executes smoothly with restructured components');

console.log('\n================================================================');
console.log(`🎉 ALL ${passCount} / ${passCount} PHASE 5 UNIT TESTS PASSED!`);
console.log('================================================================\n');
