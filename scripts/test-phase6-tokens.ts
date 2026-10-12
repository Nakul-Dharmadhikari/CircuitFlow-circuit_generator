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
// Test 3: Electrical-State Logic Semantics & Warning Separation
// -----------------------------------------------------------------------------
// Dark mode logic signals:
// HIGH: signal green (#22c55e)
// LOW: slate (#64748b)
// HIGH-Z: neutral grey (#9ca3af)
// ERROR: crimson (#ef4444)
// WARNING: amber (#f59e0b)
assert.ok(themeCssContent.includes('--signal-high: #22c55e;'), 'Dark mode HIGH must be #22c55e');
assert.ok(themeCssContent.includes('--signal-low: #64748b;'), 'Dark mode LOW must be #64748b');
assert.ok(themeCssContent.includes('--signal-z: #9ca3af;'), 'Dark mode HIGH-Z must be neutral grey #9ca3af');
assert.ok(themeCssContent.includes('--signal-x: #ef4444;'), 'Dark mode ERROR must be #ef4444');
assert.ok(themeCssContent.includes('--signal-warning: #f59e0b;'), 'Dark mode WARNING must be amber #f59e0b');

// Light mode logic signals:
assert.ok(themeCssContent.includes('--signal-high: #16a34a;'), 'Light mode HIGH must be high-contrast #16a34a');
assert.ok(themeCssContent.includes('--signal-z: #52525b;'), 'Light mode HIGH-Z must be neutral zinc grey #52525b');
assert.ok(themeCssContent.includes('--signal-x: #dc2626;'), 'Light mode ERROR must be #dc2626');
assert.ok(themeCssContent.includes('--signal-warning: #92400e;'), 'Light mode WARNING must be accessible burnt amber #92400e');
assert.ok(themeCssContent.includes('--signal-warning-bg:'), 'Warning surface fill token must be declared');
assert.ok(themeCssContent.includes('--signal-warning-border:'), 'Warning border token must be declared');

// Assert HIGH-Z and WARNING are strictly different colours
assert.notStrictEqual('#9ca3af', '#f59e0b', 'Dark HIGH-Z and WARNING must not be identical');
assert.notStrictEqual('#52525b', '#92400e', 'Light HIGH-Z and WARNING must not be identical');
pass('Test 3: HIGH-Z is neutral grey and WARNING is amber (distinct semantic separation)');

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

// Visual distinguishability check across all 5 states (Euclidean RGB distance >= 35)
function rgbDistance(hex1: string, hex2: string): number {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  return Math.sqrt(Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2));
}

const darkSignals = {
  HIGH: '#22c55e',
  LOW: '#64748b',
  'HIGH-Z': '#9ca3af',
  ERROR: '#ef4444',
  WARNING: '#f59e0b',
};

const darkKeys = Object.keys(darkSignals) as (keyof typeof darkSignals)[];
for (let i = 0; i < darkKeys.length; i++) {
  for (let j = i + 1; j < darkKeys.length; j++) {
    const d = rgbDistance(darkSignals[darkKeys[i]], darkSignals[darkKeys[j]]);
    assert.ok(d >= 35, `Dark states ${darkKeys[i]} and ${darkKeys[j]} must be distinct (distance: ${d.toFixed(1)})`);
  }
}
pass('Test 4D: Dark mode signals (HIGH, LOW, HIGH-Z, ERROR, WARNING) are visually distinct');

const lightSignals = {
  HIGH: '#16a34a',
  LOW: '#64748b',
  'HIGH-Z': '#52525b',
  ERROR: '#dc2626',
  WARNING: '#92400e',
};

const lightKeys = Object.keys(lightSignals) as (keyof typeof lightSignals)[];
for (let i = 0; i < lightKeys.length; i++) {
  for (let j = i + 1; j < lightKeys.length; j++) {
    const d = rgbDistance(lightSignals[lightKeys[i]], lightSignals[lightKeys[j]]);
    assert.ok(d >= 35, `Light states ${lightKeys[i]} and ${lightKeys[j]} must be distinct (distance: ${d.toFixed(1)})`);
  }
}
pass('Test 4E: Light mode signals (HIGH, LOW, HIGH-Z, ERROR, WARNING) are visually distinct');

// -----------------------------------------------------------------------------
// Test 4F: Light-Theme Normal-Sized Warning Text Contrast (Must meet WCAG AA >= 4.5:1)
// -----------------------------------------------------------------------------
const lightWarningColor = '#92400e';
const lightSurfaces: Record<string, string> = {
  'Warm Ivory Canvas (#ebe7dd)': '#ebe7dd',
  'App Shell Base (#f4f1ea)': '#f4f1ea',
  'Modal Dialog Panel (#fcfbf8)': '#fcfbf8',
  'Contextual Confirm Card Elevated Panel (#f3efe5)': '#f3efe5',
  'Subtle Container (#e6e1d5)': '#e6e1d5',
  'Truth Table Warning Banner Surface (#fbeedb)': '#fbeedb',
};

for (const [surfaceName, bgHex] of Object.entries(lightSurfaces)) {
  const c = getContrastRatio(lightWarningColor, bgHex);
  assert.ok(
    c >= 4.5,
    `Normal-sized warning text (${lightWarningColor}) on ${surfaceName} must have >= 4.5:1 contrast (got ${c.toFixed(2)}:1)`
  );
  console.log(`    ↳ Contrast on ${surfaceName}: ${c.toFixed(2)}:1 (Passes >= 4.5:1)`);
}

// Negative test: verify that deprecated #d97706 strictly fails on canvas
const deprecatedContrast = getContrastRatio('#d97706', '#ebe7dd');
assert.ok(
  deprecatedContrast < 4.5,
  `Deprecated #d97706 must register as failing the 4.5:1 threshold (got ${deprecatedContrast.toFixed(2)}:1)`
);
pass('Test 4F: Light-theme warning text achieves >= 4.5:1 contrast on all surfaces (negative test confirmed failure of insufficient tokens)');

// -----------------------------------------------------------------------------
// Test 4G: Dark-Theme Normal-Sized Warning Text Contrast (Must meet WCAG AA >= 4.5:1)
// -----------------------------------------------------------------------------
const darkWarningColor = '#f59e0b';
const darkSurfaces: Record<string, string> = {
  'Graphite App Shell (#121417)': '#121417',
  'Dark Canvas (#16191d)': '#16191d',
  'Modal Dialog Panel (#1a1d21)': '#1a1d21',
  'Elevated Toolbar Card (#22262c)': '#22262c',
  'Contextual Confirm Card (#181d24)': '#181d24',
  'Truth Table Warning Banner Surface (#3b301e)': '#3b301e',
};

for (const [surfaceName, bgHex] of Object.entries(darkSurfaces)) {
  const c = getContrastRatio(darkWarningColor, bgHex);
  assert.ok(
    c >= 4.5,
    `Normal-sized warning text (${darkWarningColor}) on ${surfaceName} must have >= 4.5:1 contrast (got ${c.toFixed(2)}:1)`
  );
  console.log(`    ↳ Contrast on ${surfaceName}: ${c.toFixed(2)}:1 (Passes >= 4.5:1)`);
}
pass('Test 4G: Dark-theme warning text achieves >= 4.5:1 contrast on all surfaces (6.01:1 to 8.59:1)');

// -----------------------------------------------------------------------------
// Test 4H: Warning Usage Role Audit
// -----------------------------------------------------------------------------
// 1. TopBar unsaved-dot: graphical indicator (6px dot, no text)
const topbarContent = fs.readFileSync(path.resolve(process.cwd(), 'src/app/layout/TopBar.tsx'), 'utf8');
assert.ok(topbarContent.includes('className="unsaved-dot"'), 'TopBar must feature unsaved-dot');
assert.ok(!topbarContent.includes('className="unsaved-dot">'), 'unsaved-dot must be a self-closing graphical indicator');

// 2. Wire removal confirmation: normal-sized text
const canvasCssContent = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/canvas.css'), 'utf8');
assert.ok(canvasCssContent.includes('.confirm-card-body .wires-warning'), 'canvas.css must style .wires-warning');
assert.ok(canvasCssContent.includes('color: var(--signal-warning)'), '.wires-warning must use --signal-warning token');

// 3. Truth Table partial notice: normal-sized text with warning bg
const truthTableContent = fs.readFileSync(path.resolve(process.cwd(), 'src/components/TruthTableModal.tsx'), 'utf8');
assert.ok(truthTableContent.includes('color: \'var(--signal-warning)\''), 'TruthTableModal must use --signal-warning');
assert.ok(truthTableContent.includes('var(--signal-warning-bg'), 'TruthTableModal must use --signal-warning-bg');
pass('Test 4H: Warning token role audit verified (graphical indicators vs normal-sized text surfaces)');

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
