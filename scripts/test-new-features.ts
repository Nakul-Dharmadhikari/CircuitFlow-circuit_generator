import { registerUser, loginUser, getCurrentUser, logoutUser } from '../src/services/storage';
import { cleanupOrphanJunctions, createComponent } from '../src/engine/simulator';
import type { CircuitComponent, Wire } from '../src/types/circuit';

console.log('--- Testing New CircuitFlow Features ---');

// Mock localStorage if in node environment
if (typeof localStorage === 'undefined') {
  const store: Record<string, string> = {};
  (global as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { for (const k in store) delete store[k]; },
  };
}

// 1. Test Private User Authentication with Username and Password
console.log('1. Testing User Registration & Password Authentication...');
const regRes = registerUser('test_eng', 'pass1234', 'Test Engineer');
if (!regRes.success || !regRes.user) {
  console.error('Registration failed:', regRes.error);
  process.exit(1);
}
console.log('Registered user successfully:', regRes.user.username);

// Test wrong password
const badLogin = loginUser('test_eng', 'wrongpassword');
if (badLogin.success) {
  console.error('Expected bad login to fail, but succeeded!');
  process.exit(1);
}
console.log('Rejected bad password correctly:', badLogin.error);

// Test correct password
const goodLogin = loginUser('test_eng', 'pass1234');
if (!goodLogin.success || !goodLogin.user) {
  console.error('Expected good login to succeed, but failed:', goodLogin.error);
  process.exit(1);
}
console.log('Authenticated valid user with password successfully!');

// Test session tracking and logout
const activeUser = getCurrentUser();
if (!activeUser || activeUser.username !== 'test_eng') {
  console.error('Current active user mismatch:', activeUser);
  process.exit(1);
}
logoutUser();
if (getCurrentUser() !== null) {
  console.error('Expected null user after logout!');
  process.exit(1);
}
console.log('Session logout verified: user session cleared to null.');

// 2. Test Orphan Junction Auto-Cleanup
console.log('2. Testing Automatic Junction Node Cleanup when wire is deleted...');
const gateA = createComponent('toggle', 100, 100, 'A');
const gateB = createComponent('led', 500, 100, 'LED');
const gateC = createComponent('probe', 300, 300, 'Probe');
const junction = createComponent('junction', 250, 100);

// Driver wire: A -> Junction.in
const wDriver: Wire = { id: 'w_driver', fromCompId: gateA.id, fromPinId: 'out', toCompId: junction.id, toPinId: 'in', value: '1' };
// Out wire 1: Junction.out1 -> B.in
const wOut1: Wire = { id: 'w_out1', fromCompId: junction.id, fromPinId: 'out1', toCompId: gateB.id, toPinId: 'in', value: '1' };
// Branch wire 2: Junction.out2 -> C.in
const wBranch: Wire = { id: 'w_branch', fromCompId: junction.id, fromPinId: 'out2', toCompId: gateC.id, toPinId: 'in', value: '1' };

const initialComps: CircuitComponent[] = [gateA, gateB, gateC, junction];
const initialWires: Wire[] = [wDriver, wOut1, wBranch];

// Now suppose user deletes the branch wire (wBranch):
const remainingWiresAfterBranchDelete = [wDriver, wOut1]; // only 2 wires remain (1 in, 1 out)
const cleanedAfterBranch = cleanupOrphanJunctions(initialComps, remainingWiresAfterBranchDelete);

// Junction should be removed and the 2 remaining wires should be merged back into 1 direct wire from A to B!
const junctionStillExists = cleanedAfterBranch.components.some((c) => c.id === junction.id);
if (junctionStillExists) {
  console.error('Failed: Junction still exists after branch wire was deleted!');
  process.exit(1);
}
if (cleanedAfterBranch.wires.length !== 1) {
  console.error('Failed: Expected 1 merged continuous wire, got:', cleanedAfterBranch.wires.length);
  process.exit(1);
}
const mergedWire = cleanedAfterBranch.wires[0];
if (mergedWire.fromCompId !== gateA.id || mergedWire.toCompId !== gateB.id) {
  console.error('Merged wire endpoints incorrect:', mergedWire);
  process.exit(1);
}
console.log('Junction auto-cleanup and wire splicing verified: junction removed and unbroken wire restored!');

// Now suppose user deletes all wires connected to a junction:
const cleanedZeroWires = cleanupOrphanJunctions([gateA, junction], []);
if (cleanedZeroWires.components.some((c) => c.id === junction.id)) {
  console.error('Failed: Junction still exists with 0 wires!');
  process.exit(1);
}
console.log('Dead junction with 0 wires cleaned up successfully.');

console.log('--- ALL NEW FEATURES VERIFIED SUCCESSFULLY! ---');
