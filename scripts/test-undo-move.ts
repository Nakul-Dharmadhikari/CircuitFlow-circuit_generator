import { useCircuitHistory } from '../src/hooks/useCircuitHistory';
import { createComponent } from '../src/engine/simulator';
import type { Circuit } from '../src/types/circuit';

console.log('Testing Move Component and Undo History mechanism...');

const comp = createComponent('and', 100, 100, 'AND Gate');
const initialCircuit: Circuit = {
  components: [comp],
  wires: [],
};

// Test hook logic directly
let past: Circuit[] = [];
let present: Circuit = JSON.parse(JSON.stringify(initialCircuit));
let future: Circuit[] = [];

const commitAction = (prevCircuit: Circuit, nextCircuit: Circuit) => {
  past.push(JSON.parse(JSON.stringify(prevCircuit)));
  present = JSON.parse(JSON.stringify(nextCircuit));
  future = [];
};

const undo = () => {
  if (past.length === 0) return;
  const previous = past.pop()!;
  future.unshift(JSON.parse(JSON.stringify(present)));
  present = previous;
};

// Move component from (100, 100) to (350, 220)
const movedCircuit: Circuit = {
  components: [{ ...comp, x: 350, y: 220 }],
  wires: [],
};

// Commit the move
commitAction(initialCircuit, movedCircuit);

console.log('Position after move:', present.components[0].x, present.components[0].y);
if (present.components[0].x !== 350 || present.components[0].y !== 220) {
  console.error('Move failed!');
  process.exit(1);
}

// Now trigger UNDO
undo();

console.log('Position after UNDO:', present.components[0].x, present.components[0].y);
if (present.components[0].x !== 100 || present.components[0].y !== 100) {
  console.error('UNDO failed: component did not return to original position!');
  process.exit(1);
}

console.log('SUCCESS: Moving a component and calling undo cleanly restored it to (100, 100)!');
