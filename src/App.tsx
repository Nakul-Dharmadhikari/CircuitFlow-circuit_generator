import { useState, useEffect, useCallback, useRef } from 'react';
import type { Circuit, CircuitComponent, ComponentType, CustomICDefinition, User, Wire } from './types/circuit';
import { cleanupOrphanJunctions, createComponent, simulateCircuit, tickClocks } from './engine/simulator';
import type { LabExperiment } from './presets/labExperiments';
import { soundFx } from './audio/soundEffects';
import { getCurrentUser, logoutUser } from './services/storage';
import { useCircuitHistory } from './hooks/useCircuitHistory';
import { ensureTrainerKit, TRAINER_BOARD_LAYOUT } from './engine/trainerKit';
import { getUserCustomICs, deleteUserCustomIC } from './services/customIcStorage';

import { LandingPage } from './components/LandingPage';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Canvas } from './components/Canvas';
import { PropertiesPanel } from './components/PropertiesPanel';
import { WaveformViewer } from './components/WaveformViewer';
import { TruthTableModal } from './components/TruthTableModal';
import { LabExperimentsModal } from './components/LabExperimentsModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { AuthModal } from './components/AuthModal';
import { SavedCircuitsModal } from './components/SavedCircuitsModal';
import { CustomICModal } from './components/CustomICModal';
import { ICPickerModal } from './components/ICPickerModal';

const CLIPBOARD_STORAGE_KEY = 'circuitflow_clipboard';

export function App() {
  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('circuitflow_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('circuitflow_theme', theme);
  }, [theme]);

  // Current User Account State (starts null if no authenticated session exists)
  const [currentUser, setCurrentUser] = useState<User | null>(() => getCurrentUser());

  // Custom ICs stored for user/guest
  const [customICs, setCustomICs] = useState<CustomICDefinition[]>(() =>
    getUserCustomICs(currentUser?.id || 'guest')
  );

  useEffect(() => {
    setCustomICs(getUserCustomICs(currentUser?.id || 'guest'));
  }, [currentUser]);

  // Current View: starts on 'landing'
  const [currentView, setCurrentView] = useState<'landing' | 'simulator'>('landing');

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Initial circuit: Clean Digital Trainer Board with all fixed hardware ports ready (previous demo data removed)
  const initialCircuit = ensureTrainerKit({ components: [], wires: [] });

  // Circuit History with 50 states (supports full move undo / redo)
  const {
    circuit,
    setCircuitDirect,
    pushState,
    commitAction,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
  } = useCircuitHistory(initialCircuit);

  // Canvas Viewport Transforms - zero-scroll fit for digital trainer board
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 20, y: 15 });

  // Selection: Component, Wire, or Complete Circuit
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const [isAllSelected, setIsAllSelected] = useState<boolean>(false);

  // Simulation Controls
  const [isRunning, setIsRunning] = useState(false);
  const [clockHz, setClockHz] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Modals & Panels
  const [isWaveformOpen, setIsWaveformOpen] = useState(false);
  const [isTruthTableOpen, setIsTruthTableOpen] = useState(false);
  const [isLabPresetsOpen, setIsLabPresetsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSavedCircuitsOpen, setIsSavedCircuitsOpen] = useState(false);
  const [isCustomICModalOpen, setIsCustomICModalOpen] = useState(false);
  const [isComponentLibraryOpen, setIsComponentLibraryOpen] = useState(false);
  const [pickerBaseIndex, setPickerBaseIndex] = useState<number | null>(null);

  // Waveform History Buffer
  const [waveformHistory, setWaveformHistory] = useState<
    { timestamp: number; values: Record<string, '0' | '1' | 'Z' | 'X'> }[]
  >([]);

  const circuitRef = useRef(circuit);
  useEffect(() => {
    circuitRef.current = circuit;
  }, [circuit]);

  // Track component drag start snapshot for undoing moves
  const dragStartCircuitRef = useRef<Circuit | null>(null);

  const handleDragStart = (_id: string) => {
    dragStartCircuitRef.current = circuitRef.current;
  };

  const handleDragEnd = (id: string) => {
    if (dragStartCircuitRef.current) {
      const beforeComp = dragStartCircuitRef.current.components.find((c) => c.id === id);
      const afterComp = circuitRef.current.components.find((c) => c.id === id);
      if (beforeComp && afterComp && (beforeComp.x !== afterComp.x || beforeComp.y !== afterComp.y)) {
        // Component position changed: commit the move into undo history!
        commitAction(dragStartCircuitRef.current, circuitRef.current);
      }
      dragStartCircuitRef.current = null;
    }
  };

  // Record a sample for the waveform analyzer
  const recordWaveformSample = useCallback((c: Circuit) => {
    const sampleValues: Record<string, '0' | '1' | 'Z' | 'X'> = {};
    c.components.forEach((comp) => {
      const pin = comp.outputs[0] || comp.inputs[0];
      if (pin) {
        sampleValues[comp.id] = pin.value;
      }
    });

    setWaveformHistory((prev) => [
      ...prev.slice(-120),
      { timestamp: Date.now(), values: sampleValues },
    ]);
  }, []);

  // Update soundFx mute state
  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundFx.setEnabled(next);
  };

  // Run simulation step
  const runSimulationStep = useCallback(() => {
    const current = circuitRef.current;
    const res = tickClocks(current);
    setCircuitDirect(res.circuit);

    if (res.buzzerActive) {
      soundFx.startBuzzer();
    } else {
      soundFx.stopBuzzer();
    }

    recordWaveformSample(res.circuit);
  }, [recordWaveformSample, setCircuitDirect]);

  // Simulation loop interval
  useEffect(() => {
    if (!isRunning) {
      soundFx.stopBuzzer();
      return;
    }

    const intervalMs = Math.max(1000 / (clockHz * 2), 50);
    const timer = setInterval(() => {
      runSimulationStep();
    }, intervalMs);

    return () => {
      clearInterval(timer);
      soundFx.stopBuzzer();
    };
  }, [isRunning, clockHz, runSimulationStep]);

  // Add Component to Canvas (snaps ICs into empty horizontal IC base sockets when available)
  const handleAddComponent = (type: ComponentType) => {
    let posX = Math.round((-pan.x + 300) / zoom / 10) * 10;
    let posY = Math.round((-pan.y + 200) / zoom / 10) * 10;

    const isIC = type.startsWith('ic_') || type === 'custom_ic';
    if (isIC) {
      const { icBasesX, icBasesY } = TRAINER_BOARD_LAYOUT;
      for (let i = 0; i < icBasesX.length; i++) {
        const bx = icBasesX[i];
        const by = icBasesY;
        const occupied = circuit.components.some(
          (c) => Math.abs(c.x - bx) < 80 && Math.abs(c.y - by) < 50
        );
        if (!occupied) {
          posX = bx;
          posY = by;
          break;
        }
      }
    }

    const newComp = createComponent(type, Math.max(posX, 40), Math.max(posY, 40));
    const nextCircuit = {
      ...circuit,
      components: [...circuit.components, newComp],
    };

    const res = simulateCircuit(nextCircuit);
    pushState(res.circuit);
    setSelectedCompId(newComp.id);
    setSelectedWireId(null);
    soundFx.playButtonTap();
    showToast(`Added ${newComp.label} to circuit`);
  };

  // Mount or replace IC directly on Horizontal IC Base Socket (1..3)
  const handleSelectICFromPicker = (
    baseIndex: number,
    type: ComponentType,
    customICDef?: CustomICDefinition
  ) => {
    const baseX = TRAINER_BOARD_LAYOUT.icBasesX[baseIndex];
    const baseY = TRAINER_BOARD_LAYOUT.icBasesY;

    // Find if an IC is already mounted at this socket
    const existing = circuit.components.find(
      (c) =>
        (c.type.startsWith('ic_') || c.type === 'custom_ic') &&
        Math.abs(c.x - baseX) < 80 &&
        Math.abs(c.y - baseY) < 50
    );

    // Remove existing IC and any wires attached to its pins
    let remainingComps = circuit.components;
    let remainingWires = circuit.wires;
    if (existing) {
      remainingComps = remainingComps.filter((c) => c.id !== existing.id);
      remainingWires = remainingWires.filter(
        (w) => w.fromCompId !== existing.id && w.toCompId !== existing.id
      );
    }

    let newComp: CircuitComponent;
    if (type === 'custom_ic' && customICDef) {
      newComp = createComponent(
        'custom_ic',
        baseX,
        baseY,
        customICDef.partNumber || customICDef.code,
        { customIC: customICDef }
      );
    } else {
      newComp = createComponent(type, baseX, baseY);
    }

    const nextCircuit = {
      components: [...remainingComps, newComp],
      wires: remainingWires,
    };

    const res = simulateCircuit(nextCircuit);
    pushState(res.circuit);
    if (res.buzzerActive) {
      soundFx.startBuzzer();
    } else {
      soundFx.stopBuzzer();
    }
    setSelectedCompId(newComp.id);
    setSelectedWireId(null);
    setPickerBaseIndex(null);
    soundFx.playButtonTap();
    showToast(`Mounted ${newComp.label} on IC Socket ${baseIndex + 1}`);
  };

  // Remove IC from socket
  const handleRemoveICFromBase = (baseIndex: number) => {
    const baseX = TRAINER_BOARD_LAYOUT.icBasesX[baseIndex];
    const baseY = TRAINER_BOARD_LAYOUT.icBasesY;

    const existing = circuit.components.find(
      (c) =>
        (c.type.startsWith('ic_') || c.type === 'custom_ic') &&
        Math.abs(c.x - baseX) < 80 &&
        Math.abs(c.y - baseY) < 50
    );

    if (!existing) {
      setPickerBaseIndex(null);
      return;
    }

    const remainingComps = circuit.components.filter((c) => c.id !== existing.id);
    const remainingWires = circuit.wires.filter(
      (w) => w.fromCompId !== existing.id && w.toCompId !== existing.id
    );
    const cleaned = cleanupOrphanJunctions(remainingComps, remainingWires);

    const res = simulateCircuit({ components: cleaned.components, wires: cleaned.wires });
    pushState(res.circuit);
    if (res.buzzerActive) {
      soundFx.startBuzzer();
    } else {
      soundFx.stopBuzzer();
    }
    if (selectedCompId === existing.id) setSelectedCompId(null);
    setPickerBaseIndex(null);
    soundFx.playButtonTap();
    showToast(`Removed ${existing.label} from IC Socket ${baseIndex + 1}`);
  };

  // Update Component Position (continuous dragging at 60fps)
  const handleUpdateComponentPosition = (id: string, x: number, y: number) => {
    setCircuitDirect((prev) => ({
      ...prev,
      components: prev.components.map((c) => (c.id === id ? { ...c, x, y } : c)),
    }));
  };

  // Add Connection Wire
  const handleAddWire = (wire: Wire) => {
    const nextWires = [...circuit.wires, wire];
    const res = simulateCircuit({ ...circuit, wires: nextWires });
    pushState(res.circuit);
    if (res.buzzerActive) {
      soundFx.startBuzzer();
    } else {
      soundFx.stopBuzzer();
    }
    recordWaveformSample(res.circuit);
    setSelectedWireId(wire.id);
    setSelectedCompId(null);
  };

  // Wire Branching / Tapping
  const handleBranchWire = useCallback(
    (
      wireId: string,
      x: number,
      y: number,
      connectFrom?: { compId: string; pinId: string; pinType: 'input' | 'output' }
    ) => {
      const targetWire = circuit.wires.find((w) => w.id === wireId);
      if (!targetWire) return;

      const junction = createComponent('junction', x - 8, y - 8);

      const w1: Wire = {
        id: `wire_j1_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        fromCompId: targetWire.fromCompId,
        fromPinId: targetWire.fromPinId,
        toCompId: junction.id,
        toPinId: 'in',
        value: targetWire.value,
      };

      const w2: Wire = {
        id: `wire_j2_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        fromCompId: junction.id,
        fromPinId: 'out1',
        toCompId: targetWire.toCompId,
        toPinId: targetWire.toPinId,
        value: targetWire.value,
      };

      const newWires = circuit.wires.filter((w) => w.id !== wireId).concat(w1, w2);

      if (connectFrom) {
        if (connectFrom.pinType === 'input') {
          newWires.push({
            id: `wire_j3_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            fromCompId: junction.id,
            fromPinId: 'out2',
            toCompId: connectFrom.compId,
            toPinId: connectFrom.pinId,
            value: targetWire.value,
          });
        } else {
          newWires.push({
            id: `wire_j3_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            fromCompId: connectFrom.compId,
            fromPinId: connectFrom.pinId,
            toCompId: junction.id,
            toPinId: 'in',
            value: targetWire.value,
          });
        }
      }

      const nextCircuit = {
        components: [...circuit.components, junction],
        wires: newWires,
      };

      const res = simulateCircuit(nextCircuit);
      pushState(res.circuit);
      if (res.buzzerActive) {
        soundFx.startBuzzer();
      } else {
        soundFx.stopBuzzer();
      }
      recordWaveformSample(res.circuit);
      soundFx.playSwitchClick(true);
      showToast('Wire branch junction created');
    },
    [circuit, isRunning, pushState, recordWaveformSample]
  );

  // Delete Wire (with automatic junction cleanup)
  const handleDeleteWire = (wireId: string) => {
    const nextWires = circuit.wires.filter((w) => w.id !== wireId);
    // Automatically clean up any orphan/redundant junctions
    const cleaned = cleanupOrphanJunctions(circuit.components, nextWires);

    const res = simulateCircuit({ components: cleaned.components, wires: cleaned.wires });
    pushState(res.circuit);
    if (res.buzzerActive) {
      soundFx.startBuzzer();
    } else {
      soundFx.stopBuzzer();
    }
    if (selectedWireId === wireId) {
      setSelectedWireId(null);
    }
    soundFx.playButtonTap();
    recordWaveformSample(res.circuit);
    showToast('Wire removed');
  };

  // Delete Component (with automatic junction cleanup)
  const handleDeleteComponent = useCallback(
    (id: string) => {
      const target = circuit.components.find((c) => c.id === id);
      if (target?.isTrainerFixed) {
        showToast('Trainer Kit fixed ports cannot be deleted');
        return;
      }

      const remainingComps = circuit.components.filter((c) => c.id !== id);
      const remainingWires = circuit.wires.filter(
        (w) => w.fromCompId !== id && w.toCompId !== id
      );
      // Automatically remove any orphan junctions
      const cleaned = cleanupOrphanJunctions(remainingComps, remainingWires);

      const res = simulateCircuit({ components: cleaned.components, wires: cleaned.wires });
      pushState(res.circuit);
      if (res.buzzerActive) {
        soundFx.startBuzzer();
      } else {
        soundFx.stopBuzzer();
      }
      if (selectedCompId === id) {
        setSelectedCompId(null);
      }
      soundFx.playButtonTap();
      recordWaveformSample(res.circuit);
      showToast('Component deleted');
    },
    [circuit, selectedCompId, pushState, recordWaveformSample]
  );

  // Add Custom IC to Canvas
  const handleAddCustomIC = (ic: CustomICDefinition) => {
    const spawnX = Math.round((-pan.x + 350) / zoom / 10) * 10;
    const spawnY = Math.round((-pan.y + 220) / zoom / 10) * 10;
    const newComp = createComponent(
      'custom_ic',
      Math.max(spawnX, 40),
      Math.max(spawnY, 40),
      ic.partNumber || ic.code,
      { customIC: ic }
    );
    const nextCircuit = {
      ...circuit,
      components: [...circuit.components, newComp],
    };
    const res = simulateCircuit(nextCircuit);
    pushState(res.circuit);
    if (res.buzzerActive) {
      soundFx.startBuzzer();
    } else {
      soundFx.stopBuzzer();
    }
    setSelectedCompId(newComp.id);
    setSelectedWireId(null);
    soundFx.playButtonTap();
    showToast(`Added ${ic.partNumber || ic.name} to canvas`);
  };

  // Delete Custom IC from Library
  const handleDeleteCustomIC = (id: string) => {
    deleteUserCustomIC(id);
    setCustomICs(getUserCustomICs(currentUser?.id || 'guest'));
    showToast('Custom IC removed from library');
  };

  // Save Custom IC callback from modal
  const handleSaveCustomIC = (savedIC: CustomICDefinition, placeOnCanvas?: boolean) => {
    setCustomICs(getUserCustomICs(currentUser?.id || 'guest'));
    showToast(`Custom IC "${savedIC.partNumber || savedIC.name}" saved!`);
    if (placeOnCanvas) {
      handleAddCustomIC(savedIC);
    }
  };

  // Toggle Switch
  const handleToggleSwitch = (id: string) => {
    const targetComp = circuit.components.find((c) => c.id === id);
    if (!targetComp) return;

    const nextState = !targetComp.state?.toggleState;
    soundFx.playSwitchClick(nextState);

    const nextComps = circuit.components.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          state: { ...c.state, toggleState: nextState },
          outputs: c.outputs.map((p) => ({
            ...p,
            value: (nextState ? '1' : '0') as '0' | '1',
          })),
        };
      }
      return c;
    });

    const res = simulateCircuit({ ...circuit, components: nextComps });
    pushState(res.circuit);
    if (res.buzzerActive) {
      soundFx.startBuzzer();
    } else {
      soundFx.stopBuzzer();
    }
    recordWaveformSample(res.circuit);
  };

  // Push Button
  const handleButtonPress = (id: string, pressed: boolean) => {
    soundFx.playButtonTap();

    const nextComps = circuit.components.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          state: { ...c.state, buttonPressed: pressed },
          outputs: c.outputs.map((p) => ({
            ...p,
            value: (pressed ? '1' : '0') as '0' | '1',
          })),
        };
      }
      return c;
    });

    const res = simulateCircuit({ ...circuit, components: nextComps });
    setCircuitDirect(res.circuit);
    if (res.buzzerActive) {
      soundFx.startBuzzer();
    } else {
      soundFx.stopBuzzer();
    }
    recordWaveformSample(res.circuit);
  };

  // Update Component Properties - only set isCustomLabel if user provided custom text
  const handleUpdateLabel = (id: string, label: string) => {
    const isCustom = label.trim().length > 0;
    const nextCircuit = {
      ...circuit,
      components: circuit.components.map((c) =>
        c.id === id ? { ...c, label, isCustomLabel: isCustom } : c
      ),
    };
    pushState(nextCircuit);
  };

  const handleUpdateProps = (id: string, customProps: Record<string, any>) => {
    if (customProps.frequency) {
      setClockHz(customProps.frequency);
    }
    const nextCircuit = {
      ...circuit,
      components: circuit.components.map((c) =>
        c.id === id ? { ...c, customProps } : c
      ),
    };
    pushState(nextCircuit);
  };

  // Select Entire Circuit (Ctrl+A or Select All button)
  const handleSelectAll = useCallback(() => {
    if (circuit.components.length === 0 && circuit.wires.length === 0) {
      showToast('Workbench canvas is empty');
      return;
    }
    setIsAllSelected(true);
    setSelectedCompId(null);
    setSelectedWireId(null);
    soundFx.playButtonTap();
    showToast(`Complete circuit selected (${circuit.components.length} components, ${circuit.wires.length} wires)`);
  }, [circuit]);

  // Copy & Paste Circuit Parts (or whole circuit if complete circuit selected or nothing selected)
  const handleCopy = useCallback(() => {
    let toCopyComps: CircuitComponent[] = [];
    let toCopyWires: Wire[] = [];

    if (isAllSelected || (!selectedCompId && !selectedWireId)) {
      toCopyComps = circuit.components;
      toCopyWires = circuit.wires;
    } else if (selectedCompId) {
      const selected = circuit.components.find((c) => c.id === selectedCompId);
      if (selected) {
        toCopyComps = [selected];
        toCopyWires = circuit.wires.filter(
          (w) => w.fromCompId === selectedCompId && w.toCompId === selectedCompId
        );
      }
    } else if (selectedWireId) {
      toCopyComps = [];
      toCopyWires = circuit.wires.filter((w) => w.id === selectedWireId);
    }

    if (toCopyComps.length === 0 && toCopyWires.length === 0) {
      showToast('Nothing on canvas to copy');
      return;
    }

    const payload = {
      components: toCopyComps,
      wires: toCopyWires,
      timestamp: Date.now(),
    };

    localStorage.setItem(CLIPBOARD_STORAGE_KEY, JSON.stringify(payload));
    soundFx.playButtonTap();
    if (toCopyComps.length === circuit.components.length && circuit.components.length > 0) {
      showToast(`Copied complete circuit (${toCopyComps.length} components, ${toCopyWires.length} wires)`);
    } else {
      showToast(`Copied ${toCopyComps.length} component${toCopyComps.length === 1 ? '' : 's'}`);
    }
  }, [circuit, isAllSelected, selectedCompId, selectedWireId]);

  const handlePaste = useCallback((targetPosition?: { x: number; y: number }) => {
    try {
      const raw = localStorage.getItem(CLIPBOARD_STORAGE_KEY);
      if (!raw) {
        showToast('Clipboard is empty (Ctrl+C to copy)');
        return;
      }

      const payload = JSON.parse(raw);
      if (!Array.isArray(payload.components) || (payload.components.length === 0 && (!payload.wires || payload.wires.length === 0))) {
        showToast('Clipboard is empty');
        return;
      }

      const idMap: Record<string, string> = {};
      let offsetX = 40;
      let offsetY = 40;

      if (targetPosition && payload.components.length > 0) {
        const minX = Math.min(...payload.components.map((c: any) => c.x));
        const maxX = Math.max(...payload.components.map((c: any) => c.x));
        const minY = Math.min(...payload.components.map((c: any) => c.y));
        const maxY = Math.max(...payload.components.map((c: any) => c.y));
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        offsetX = Math.round((targetPosition.x - centerX) / 10) * 10;
        offsetY = Math.round((targetPosition.y - centerY) / 10) * 10;
      }

      const newComps: CircuitComponent[] = (payload.components || []).map((c: CircuitComponent) => {
        const newId = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        idMap[c.id] = newId;

        return {
          ...c,
          id: newId,
          x: c.x + offsetX,
          y: c.y + offsetY,
          inputs: c.inputs.map((p) => ({ ...p })),
          outputs: c.outputs.map((p) => ({ ...p })),
          state: { ...c.state },
          customProps: { ...c.customProps },
        };
      });

      const newWires: Wire[] = (payload.wires || [])
        .filter((w: Wire) => idMap[w.fromCompId] && idMap[w.toCompId])
        .map((w: Wire) => ({
          ...w,
          id: `wire_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          fromCompId: idMap[w.fromCompId],
          toCompId: idMap[w.toCompId],
        }));

      const nextCircuit = {
        components: [...circuit.components, ...newComps],
        wires: [...circuit.wires, ...newWires],
      };

      const res = simulateCircuit(nextCircuit);
      pushState(res.circuit);
      if (newComps.length > 1) {
        setIsAllSelected(true);
        setSelectedCompId(null);
        setSelectedWireId(null);
      } else if (newComps.length === 1) {
        setSelectedCompId(newComps[0].id);
        setIsAllSelected(false);
      }
      soundFx.playButtonTap();
      showToast(`Pasted ${newComps.length} component${newComps.length === 1 ? '' : 's'}${newWires.length > 0 ? ` and ${newWires.length} wire${newWires.length === 1 ? '' : 's'}` : ''}`);
    } catch {
      showToast('Failed to paste from clipboard');
    }
  }, [circuit, pushState]);

  // Load Pre-Built Lab Experiment
  const handleLoadExperiment = (exp: LabExperiment) => {
    setIsRunning(false);
    resetHistory(exp.circuit);
    setSelectedCompId(null);
    setSelectedWireId(null);
    setWaveformHistory([]);
    setPan({ x: 40, y: 40 });
    setZoom(1);
    soundFx.playButtonTap();
    showToast(`Loaded: ${exp.title}`);
  };

  // Load experiment from landing page
  const handleLoadExperimentAndEnter = (exp: LabExperiment) => {
    handleLoadExperiment(exp);
    setCurrentView('simulator');
  };

  // Load Saved Circuit
  const handleLoadSavedCircuit = (loadedCircuit: Circuit, name: string) => {
    setIsRunning(false);
    const res = simulateCircuit(loadedCircuit);
    resetHistory(res.circuit);
    setSelectedCompId(null);
    setSelectedWireId(null);
    setWaveformHistory([]);
    soundFx.playButtonTap();
    showToast(`Loaded schematic: ${name}`);
  };

  // Create New Circuit from Scratch
  const handleNewCircuit = useCallback(() => {
    if (circuit.components.some((c) => !c.isTrainerFixed) || circuit.wires.length > 0) {
      const confirmNew = window.confirm(
        'Create a new circuit starting from scratch? Any unsaved changes on the active workbench will be cleared.'
      );
      if (!confirmNew) return;
    }
    setIsRunning(false);
    const newTrainerCircuit = ensureTrainerKit({ components: [], wires: [] });
    resetHistory(newTrainerCircuit);
    setSelectedCompId(null);
    setSelectedWireId(null);
    setIsAllSelected(false);
    setWaveformHistory([]);
    soundFx.stopBuzzer();
    setPan({ x: 20, y: 15 });
    setZoom(1);
    soundFx.playButtonTap();
    showToast('New circuit created with Digital Trainer Kit ready!');
  }, [circuit, resetHistory]);

  // Clear Canvas
  const handleClearCanvas = () => {
    if (window.confirm('Clear all user components and wires from workbench? Digital Trainer Kit ports will remain ready.')) {
      setIsRunning(false);
      const emptyWithTrainer = ensureTrainerKit({ components: [], wires: [] });
      pushState(emptyWithTrainer);
      setSelectedCompId(null);
      setSelectedWireId(null);
      setWaveformHistory([]);
      soundFx.stopBuzzer();
      showToast('Workbench reset with Digital Trainer Kit ready');
    }
  };

  // Account Switch handler (strictly clears active workbench schematic so circuits remain private)
  const handleUserChanged = (u: User) => {
    setCurrentUser(u);
    setIsRunning(false);
    const emptyWithTrainer = ensureTrainerKit({ components: [], wires: [] });
    resetHistory(emptyWithTrainer);
    setSelectedCompId(null);
    setSelectedWireId(null);
    setIsAllSelected(false);
    setWaveformHistory([]);
    soundFx.stopBuzzer();
    showToast(`Logged in as @${u.username} — private vault ready`);
  };

  // Log Out handler (strictly clears workbench schematic)
  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setIsRunning(false);
    const emptyWithTrainer = ensureTrainerKit({ components: [], wires: [] });
    resetHistory(emptyWithTrainer);
    setSelectedCompId(null);
    setSelectedWireId(null);
    setIsAllSelected(false);
    setWaveformHistory([]);
    soundFx.stopBuzzer();
    setCurrentView('landing');
    showToast('Logged out — workbench cleared');
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // New Circuit: Ctrl+N
      if (isCtrlOrCmd && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        handleNewCircuit();
        return;
      }

      // Select All: Ctrl+A
      if (isCtrlOrCmd && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        handleSelectAll();
        return;
      }

      // Undo: Ctrl+Z (without shift)
      if (isCtrlOrCmd && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          undo();
          soundFx.playButtonTap();
          showToast('Undo');
        }
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (
        (isCtrlOrCmd && (e.key === 'y' || e.key === 'Y')) ||
        (isCtrlOrCmd && e.shiftKey && (e.key === 'z' || e.key === 'Z'))
      ) {
        e.preventDefault();
        if (canRedo) {
          redo();
          soundFx.playButtonTap();
          showToast('Redo');
        }
        return;
      }

      // Copy: Ctrl+C
      if (isCtrlOrCmd && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        handleCopy();
        return;
      }

      // Paste: Ctrl+V
      if (isCtrlOrCmd && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        handlePaste();
        return;
      }

      // Duplicate: Ctrl+D
      if (isCtrlOrCmd && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        handleCopy();
        setTimeout(() => handlePaste(), 50);
        return;
      }

      // Space: Run/Pause
      if (e.code === 'Space') {
        e.preventDefault();
        setIsRunning((r) => !r);
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        runSimulationStep();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (isAllSelected) {
          e.preventDefault();
          handleClearCanvas();
          setIsAllSelected(false);
          return;
        }
        if (selectedCompId) {
          e.preventDefault();
          handleDeleteComponent(selectedCompId);
        } else if (selectedWireId) {
          e.preventDefault();
          handleDeleteWire(selectedWireId);
        }
      } else if (e.key === 'Escape') {
        setIsAllSelected(false);
        setSelectedCompId(null);
        setSelectedWireId(null);
        setIsTruthTableOpen(false);
        setIsLabPresetsOpen(false);
        setIsShortcutsOpen(false);
        setIsAuthOpen(false);
        setIsSavedCircuitsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isAllSelected,
    selectedCompId,
    selectedWireId,
    canUndo,
    canRedo,
    undo,
    redo,
    handleSelectAll,
    handleCopy,
    handlePaste,
    handleClearCanvas,
    runSimulationStep,
    handleDeleteComponent,
    handleDeleteWire,
  ]);

  const selectedComponent = circuit.components.find((c) => c.id === selectedCompId) || null;

  const currentMountedIC =
    pickerBaseIndex !== null
      ? circuit.components.find((c) => {
          const baseX = TRAINER_BOARD_LAYOUT.icBasesX[pickerBaseIndex];
          const baseY = TRAINER_BOARD_LAYOUT.icBasesY;
          return (
            (c.type.startsWith('ic_') || c.type === 'custom_ic') &&
            Math.abs(c.x - baseX) < 80 &&
            Math.abs(c.y - baseY) < 50
          );
        })
      : undefined;

  // Render Techy Landing Page if in 'landing' view or not authenticated
  if (currentView === 'landing' || !currentUser) {
    return (
      <LandingPage
        currentUser={currentUser}
        onUserLoggedIn={(u) => {
          setCurrentUser(u);
          showToast(`Logged in as ${u.displayName}`);
        }}
        onUserLoggedOut={handleLogout}
        onEnterSimulator={() => {
          if (!currentUser) {
            showToast('Please log in with your credentials first.');
            return;
          }
          setCurrentView('simulator');
          soundFx.playButtonTap();
        }}
        onLoadExperimentAndEnter={handleLoadExperimentAndEnter}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      />
    );
  }

  // Render Simulator Workbench
  return (
    <div className="app-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-focus)',
            color: 'var(--text-primary)',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            zIndex: 9999,
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ color: 'var(--signal-high)' }}>●</span> {toastMessage}
        </div>
      )}

      {/* Top Header Controls (Minimalistic Green Theme with Direct Circuit Analysis) */}
      <Header
        isRunning={isRunning}
        onToggleRun={() => setIsRunning((r) => !r)}
        onStep={runSimulationStep}
        zoom={zoom}
        onZoomChange={setZoom}
        onResetZoom={() => setZoom(1)}
        isWaveformOpen={isWaveformOpen}
        onToggleWaveform={() => setIsWaveformOpen((v) => !v)}
        onOpenTruthTable={() => setIsTruthTableOpen(true)}
        onOpenLabPresets={() => setIsLabPresetsOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenSavedCircuits={() => setIsSavedCircuitsOpen(true)}
        onNewCircuit={handleNewCircuit}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        clockHz={clockHz}
        onClockHzChange={setClockHz}
        onOpenCreateIC={() => setIsCustomICModalOpen(true)}
      />

      {/* Main Workspace */}
      <div className="main-workspace">
        {/* Left Component Toolbox Drawer (Auto-minimizes on component placement) */}
        <Sidebar
          isOpen={isComponentLibraryOpen}
          onClose={() => setIsComponentLibraryOpen(false)}
          onAddComponent={handleAddComponent}
          customICs={customICs}
          onOpenCreateIC={() => setIsCustomICModalOpen(true)}
          onAddCustomIC={handleAddCustomIC}
          onDeleteCustomIC={handleDeleteCustomIC}
        />

        {/* Center Interactive Circuit Canvas */}
        <Canvas
          circuit={circuit}
          selectedCompId={selectedCompId}
          selectedWireId={selectedWireId}
          isAllSelected={isAllSelected}
          onSelectComponent={(id) => {
            setSelectedCompId(id);
            setIsAllSelected(false);
            if (id) setSelectedWireId(null);
          }}
          onSelectWire={(id) => {
            setSelectedWireId(id);
            setIsAllSelected(false);
            if (id) setSelectedCompId(null);
          }}
          onUpdateComponentPosition={handleUpdateComponentPosition}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onAddWire={handleAddWire}
          onDeleteWire={handleDeleteWire}
          onBranchWire={handleBranchWire}
          onToggleSwitch={handleToggleSwitch}
          onButtonPress={handleButtonPress}
          onOpenICPicker={(index) => setPickerBaseIndex(index)}
          isLibraryOpen={isComponentLibraryOpen}
          onToggleLibrary={() => setIsComponentLibraryOpen((prev) => !prev)}
          onSelectAll={handleSelectAll}
          onCopy={handleCopy}
          onPasteAtPosition={(pos) => handlePaste(pos)}
          onDeleteSelected={() => {
            if (isAllSelected) {
              handleClearCanvas();
            } else if (selectedCompId) {
              handleDeleteComponent(selectedCompId);
            } else if (selectedWireId) {
              handleDeleteWire(selectedWireId);
            }
          }}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          zoom={zoom}
          pan={pan}
          onPanChange={setPan}
          onZoomChange={setZoom}
        />

        {/* Floating Component Properties Inspector */}
        <PropertiesPanel
          component={selectedComponent}
          onUpdateLabel={handleUpdateLabel}
          onUpdateProps={handleUpdateProps}
          onDeleteComponent={handleDeleteComponent}
          onClose={() => setSelectedCompId(null)}
        />
      </div>

      {/* Bottom Timing Diagram Waveform Analyzer */}
      <WaveformViewer
        circuit={circuit}
        history={waveformHistory}
        isOpen={isWaveformOpen}
        onToggle={() => setIsWaveformOpen(false)}
        onClear={() => setWaveformHistory([])}
      />

      {/* Modals */}
      <CustomICModal
        isOpen={isCustomICModalOpen}
        onClose={() => setIsCustomICModalOpen(false)}
        activeCircuit={circuit}
        userId={currentUser?.id || 'guest'}
        onSaveIC={handleSaveCustomIC}
      />

      <TruthTableModal
        circuit={circuit}
        isOpen={isTruthTableOpen}
        onClose={() => setIsTruthTableOpen(false)}
      />

      <LabExperimentsModal
        isOpen={isLabPresetsOpen}
        onClose={() => setIsLabPresetsOpen(false)}
        onLoadExperiment={handleLoadExperiment}
      />

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        currentUser={currentUser}
        currentCircuit={circuit}
        onClose={() => setIsAuthOpen(false)}
        onUserChanged={handleUserChanged}
        onLoggedOut={handleLogout}
        onLoadCircuit={handleLoadSavedCircuit}
      />

      <SavedCircuitsModal
        isOpen={isSavedCircuitsOpen}
        currentUser={currentUser}
        currentCircuit={circuit}
        onClose={() => setIsSavedCircuitsOpen(false)}
        onLoadCircuit={handleLoadSavedCircuit}
        onNewCircuit={handleNewCircuit}
      />

      {/* Interactive IC Base Selector & Socket Swapper */}
      <ICPickerModal
        isOpen={pickerBaseIndex !== null}
        baseIndex={pickerBaseIndex ?? 0}
        currentICLabel={currentMountedIC?.label}
        onClose={() => setPickerBaseIndex(null)}
        onSelectIC={(baseIdx, type, customICDef) => {
          handleSelectICFromPicker(baseIdx, type, customICDef);
        }}
        onRemoveIC={(baseIdx) => {
          handleRemoveICFromBase(baseIdx);
        }}
        customICs={customICs}
      />
    </div>
  );
}

export default App;
