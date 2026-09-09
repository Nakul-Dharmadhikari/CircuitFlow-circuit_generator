import { useState, useCallback } from 'react';
import type { Circuit } from '../types/circuit';

const MAX_HISTORY = 50;

function cloneCircuit(c: Circuit): Circuit {
  return {
    components: c.components.map((comp) => ({
      ...comp,
      inputs: comp.inputs.map((p) => ({ ...p })),
      outputs: comp.outputs.map((p) => ({ ...p })),
      state: { ...comp.state },
      customProps: { ...comp.customProps },
    })),
    wires: c.wires.map((w) => ({ ...w })),
  };
}

export function useCircuitHistory(initialCircuit: Circuit) {
  const [past, setPast] = useState<Circuit[]>([]);
  const [present, setPresent] = useState<Circuit>(() => cloneCircuit(initialCircuit));
  const [future, setFuture] = useState<Circuit[]>([]);

  // Push an action with optional explicit previous state (essential for drag & drop undo)
  const pushState = useCallback((nextCircuit: Circuit, explicitPreviousState?: Circuit) => {
    const prevStateToRecord = explicitPreviousState ? cloneCircuit(explicitPreviousState) : cloneCircuit(present);
    setPast((prevPast) => {
      const newPast = [...prevPast, prevStateToRecord];
      if (newPast.length > MAX_HISTORY) {
        newPast.shift();
      }
      return newPast;
    });
    setPresent(cloneCircuit(nextCircuit));
    setFuture([]);
  }, [present]);

  const commitAction = useCallback((previousCircuit: Circuit, nextCircuit: Circuit) => {
    setPast((prevPast) => {
      const newPast = [...prevPast, cloneCircuit(previousCircuit)];
      if (newPast.length > MAX_HISTORY) {
        newPast.shift();
      }
      return newPast;
    });
    setPresent(cloneCircuit(nextCircuit));
    setFuture([]);
  }, []);

  const undo = useCallback(() => {
    if (past.length === 0) return;

    setPast((prevPast) => {
      const previous = prevPast[prevPast.length - 1];
      const newPast = prevPast.slice(0, prevPast.length - 1);

      setFuture((prevFuture) => [cloneCircuit(present), ...prevFuture]);
      setPresent(cloneCircuit(previous));

      return newPast;
    });
  }, [past, present]);

  const redo = useCallback(() => {
    if (future.length === 0) return;

    setFuture((prevFuture) => {
      const next = prevFuture[0];
      const newFuture = prevFuture.slice(1);

      setPast((prevPast) => [...prevPast, cloneCircuit(present)]);
      setPresent(cloneCircuit(next));

      return newFuture;
    });
  }, [future, present]);

  const resetHistory = useCallback((newCircuit: Circuit) => {
    setPast([]);
    setPresent(cloneCircuit(newCircuit));
    setFuture([]);
  }, []);

  return {
    circuit: present,
    setCircuitDirect: setPresent,
    pushState,
    commitAction,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    resetHistory,
  };
}
