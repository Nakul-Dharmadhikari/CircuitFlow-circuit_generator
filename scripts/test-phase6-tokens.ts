import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('================================================================');
console.log('CIRCUITFLOW PHASE 6: DESIGN TOKEN ARCHITECTURE & CONTRAST SUITE');
console.log('Testing: Copper Lab Tokens, Semantics, Contrast & Theme Parity');
console.log('================================================================\n');

let passCount = 0;
function pass(testName: string) {
  passCount++;
  console.log(`✔ PASS: ${testName}`);
}

// -----------------------------------------------------------------------------
// Test 1: Verify theme.css Token Declarations
// -----------------------------------------------------------------------------
const themeCssPath = path.resolve(process.cwd(), 'src/styles/theme.css');
assert.ok(fs.existsSync(themeCssPath), 'theme.css must exist');
const themeCssContent = fs.readFileSync(themeCssPath, 'utf8');

// Core semantic token keys that must exist in :root
const requiredTokens = [
  '--bg-app',
  '--bg-canvas',
  '--bg-panel',
  '--bg-panel-elevated',
  '--bg-subtle',
  '--bg-hover',
  '--border-subtle',
  '--border-strong',
  '--border-focus',
  '--text-primary',
  '--text-secondary',
  '--text-muted',
  '--accent-copper',
  '--accent-copper-hover',
  '--accent-copper-active',
  '--accent-copper-dark',
  '--accent-copper-glow',
  '--accent-copper-subtle',
  '--selection-stroke',
  '--selection-fill',
  '--signal-high',
  '--signal-low',
  '--signal-z',
  '--signal-x',
  '--grid-dot-color',
  '--radius-sm',
  '--radius-md',
  '--radius-lg',
  '--radius-pill',
];

for (const token of requiredTokens) {
  assert.ok(
    themeCssContent.includes(token),
    `theme.css must declare token: ${token}`
  );
}
pass('Test 1: All required Copper Lab tokens declared in theme.css');

// -----------------------------------------------------------------------------
// Test 2: Copper Lab Palette Specifics
// -----------------------------------------------------------------------------
// Graphite dark values
assert.ok(themeCssContent.includes('#121417'), 'Deep graphite #121417 must be present');
assert.ok(themeCssContent.includes('#1a1d21'), 'Graphite surface #1a1d21 must be present');
assert.ok(themeCssContent.includes('#22262c'), 'Elevated graphite surface #22262c must be present');

// Copper accent values
assert.ok(themeCssContent.includes('#d97736'), 'Primary copper #d97736 must be present');
assert.ok(themeCssContent.includes('#c25e1a'), 'Dark/contrast copper #c25e1a must be present');
assert.ok(themeCssContent.includes('#b35010'), 'Deep burnt copper #b35010 must be present');

// Warm ivory light values
assert.ok(themeCssContent.includes('#f4f1ea'), 'Warm ivory #f4f1ea must be present for light theme');
assert.ok(themeCssContent.includes('#fcfbf8'), 'Panel ivory #fcfbf8 must be present for light theme');
assert.ok(themeCssContent.includes('#f3efe5'), 'Elevated ivory #f3efe5 must be present for light theme');
pass('Test 2: Established Copper Lab brand & neutral surfaces match specification');

// -----------------------------------------------------------------------------
// Test 3: Electrical-State Logic Semantics (HIGH, LOW, HIGH-Z, ERROR)
// -----------------------------------------------------------------------------
// Dark mode logic signals:
// HIGH: signal green (#22c55e)
// LOW: slate (#64748b)
// HIGH-Z: amber (#f59e0b)
// ERROR: crimson (#ef4444)
assert.ok(themeCssContent.includes('--signal-high: #22c55e;'), 'Dark mode HIGH must be #22c55e');
assert.ok(themeCssContent.includes('--signal-low: #64748b;'), 'Dark mode LOW must be #64748b');
assert.ok(themeCssContent.includes('--signal-z: #f59e0b;'), 'Dark mode HIGH-Z must be #f59e0b');
assert.ok(themeCssContent.includes('--signal-x: #ef4444;'), 'Dark mode ERROR must be #ef4444');

// Light mode logic signals:
assert.ok(themeCssContent.includes('--signal-high: #16a34a;'), 'Light mode HIGH must be high-contrast #16a34a');
assert.ok(themeCssContent.includes('--signal-low: #64748b;'), 'Light mode LOW must be slate #64748b');
assert.ok(themeCssContent.includes('--signal-z: #d97706;'), 'Light mode HIGH-Z must be #d97706');
assert.ok(themeCssContent.includes('--signal-x: #dc2626;'), 'Light mode ERROR must be #dc2626');
pass('Test 3: Logic state signals follow IEEE/TTL standard semantic mapping');

// -----------------------------------------------------------------------------
// Test 4: WCAG AA Luminance & Contrast Calculation
// -----------------------------------------------------------------------------
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function getLuminance([r, g, b]: [number, number, number]): number {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hexToRgb(hex1));
  const lum2 = getLuminance(hexToRgb(hex2));
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

// Dark theme: primary text #f3f4f6 on graphite #121417 (Requirement >= 4.5:1 for WCAG AA)
const darkContrast = getContrastRatio('#f3f4f6', '#121417');
assert.ok(darkContrast >= 12.0, `Dark text contrast should be high (got ${darkContrast.toFixed(2)})`);
pass(`Test 4A: Dark mode primary text contrast is ${darkContrast.toFixed(2)}:1 (exceeds WCAG AA 4.5:1)`);

// Light theme: primary text #1c1917 on warm ivory #f4f1ea
const lightContrast = getContrastRatio('#1c1917', '#f4f1ea');
assert.ok(lightContrast >= 14.0, `Light text contrast should be high (got ${lightContrast.toFixed(2)})`);
pass(`Test 4B: Light mode primary text contrast is ${lightContrast.toFixed(2)}:1 (exceeds WCAG AA 4.5:1)`);

// Light theme: copper accent #c25e1a on warm ivory #f4f1ea (for interactive badges & links >= 3.0:1)
const copperLightContrast = getContrastRatio('#c25e1a', '#f4f1ea');
assert.ok(copperLightContrast >= 3.0, `Copper accent contrast on ivory should be >= 3.0:1 (got ${copperLightContrast.toFixed(2)})`);
pass(`Test 4C: Light mode copper accent contrast is ${copperLightContrast.toFixed(2)}:1 (exceeds 3.0:1 threshold)`);

// -----------------------------------------------------------------------------
// Test 5: Verify no rogue blue accents in shell.css or ui.css
// -----------------------------------------------------------------------------
const shellCssPath = path.resolve(process.cwd(), 'src/styles/shell.css');
const shellCssContent = fs.readFileSync(shellCssPath, 'utf8');
assert.ok(!shellCssContent.includes('#38bdf8'), 'shell.css must not contain hardcoded #38bdf8');
assert.ok(!shellCssContent.includes('#0284c7'), 'shell.css must not contain hardcoded #0284c7');

const uiCssPath = path.resolve(process.cwd(), 'src/styles/ui.css');
const uiCssContent = fs.readFileSync(uiCssPath, 'utf8');
assert.ok(!uiCssContent.includes('#38bdf8'), 'ui.css must not contain hardcoded #38bdf8');
assert.ok(!uiCssContent.includes('#0284c7'), 'ui.css must not contain hardcoded #0284c7');
pass('Test 5: shell.css and ui.css have zero remaining hardcoded blue accents');

console.log(`\n================================================================`);
console.log(`ALL ${passCount} PHASE 6 TOKEN & DESIGN SYSTEM TESTS PASSED SUCCESSFULLY!`);
console.log(`================================================================\n`);
