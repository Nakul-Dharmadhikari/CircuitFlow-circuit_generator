import { useState, useEffect, useCallback, useRef } from 'react';
import type { Circuit, CircuitComponent, ComponentType, CustomICDefinition, User, Wire } from './types/circuit';
import { cleanupOrphanJunctions, createComponent, simulateCircuit, tickClocks } from './engine/simulator';
import type { LabExperiment } from './presets/labExperiments';
import { soundFx } from './audio/soundEffects';
import { getCurrentUser, logoutUser } from './services/storage';
import { useCircuitHistory } from './hooks/useCircuitHistory';
import {
  ensureTrainerKit,
  createTrainerKitComponents,
  getTrainerBoards,
  TRAINER_BOARD_LAYOUT,
  addModuleToTrainerBoard,
  removeLastModuleFromTrainerBoard,
  copyTrainerBoard,
  deleteTrainerBoard,
  findAvailableICSocket,
  syncMountedICPositions,
  mountICOnSocket,
  ejectICFromSocket,
  getMountedICOnSocket,
  TRAINER_CONSTANTS,
} from './engine/trainerKit';
import { getUserCustomICs, deleteUserCustomIC } from './services/customIcStorage';
import { downloadCircuitToFile } from './services/storage';
import { validateAndSanitizeCircuit } from './engine/circuitValidator';

import { LandingPage } from './components/LandingPage';
import { Sidebar } from './components/Sidebar';
import { Canvas } from './components/Canvas';
import { PropertiesPanel } from './components/PropertiesPanel';
import { WaveformViewer } from './components/WaveformViewer';
import { TruthTableModal } from './components/TruthTableModal';
import { AnalysisModal, type AnalysisTab } from './components/AnalysisModal';
import { LabExperimentsModal } from './components/LabExperimentsModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { AuthModal } from './components/AuthModal';
import { SavedCircuitsModal } from './components/SavedCircuitsModal';
import { CustomICModal } from './components/CustomICModal';
import { ICPickerModal } from './components/ICPickerModal';
import { GuidedLabAssistant } from './components/GuidedLabAssistant';
import { OnboardingTour } from './components/OnboardingTour';
import { AppShell } from './app/AppShell';
import type { WorkbenchView } from './hooks/useUIState';
import { simulationEngine } from './core/simulation-engine';
import { getNextRotation } from './utils/geometry';
import {
  calculateDestructiveConsequences,
  type DestructiveConfirmationState,
} from './types/destructiveConfirmation';

const CLIPBOARD_STORAGE_KEY = 'circuitflow_clipboard';

export function App() {
  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return (localStorage.getItem('circuitflow_theme') as 'dark' | 'light') || 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('circuitflow_theme', theme);
    } catch {
      // Storage restricted; ignore error safely
    }
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

  // Current View: starts on 'landing', supports 'hardware' (DELDSIM), 'circuit' (Schematic), and 'analysis'
  const [currentView, setCurrentView] = useState<WorkbenchView>('landing');
  const [projectName, setProjectName] = useState<string>('Untitled Circuit');
  const [isDirty, setIsDirty] = useState<boolean>(false);

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

  // Workspace Mode: 'trainer' (Chassis + Ports) vs 'freeform' (Unlimited Open Canvas)
  const [workbenchMode, setWorkbenchMode] = useState<'trainer' | 'freeform'>(() => {
    return (localStorage.getItem('circuitflow_workbench_mode') as 'trainer' | 'freeform') || 'trainer';
  });

  useEffect(() => {
    localStorage.setItem('circuitflow_workbench_mode', workbenchMode);
  }, [workbenchMode]);

  // Live Canvas Mouse Cursor Tracking for Cursor-Aware Paste
  const mouseCanvasPosRef = useRef<{ x: number; y: number }>({ x: 350, y: 250 });

  // Canvas Viewport Transforms - zero-scroll fit for digital trainer board
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 20, y: 15 });

  // Selection: Component, Wire, Trainer Board, or Complete Circuit
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
  const [selectedCompIds, setSelectedCompIds] = useState<string[]>([]);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const [selectedBoardIndex, setSelectedBoardIndex] = useState<number | null>(null);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [isAllSelected, setIsAllSelected] = useState<boolean>(false);

  // Simulation Controls
  const [isRunning, setIsRunning] = useState(false);
  const [clockHz, setClockHz] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Modals & Panels
  const [isWaveformOpen, setIsWaveformOpen] = useState(false);
  const [isTruthTableOpen, setIsTruthTableOpen] = useState(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [analysisModalTab, setAnalysisModalTab] = useState<AnalysisTab>('overview');

  const handleOpenAnalysisModal = useCallback((tab: AnalysisTab = 'overview') => {
    setAnalysisModalTab(tab);
    setIsAnalysisModalOpen(true);
  }, []);
  const [isLabPresetsOpen, setIsLabPresetsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSavedCircuitsOpen, setIsSavedCircuitsOpen] = useState(false);
  const [isCustomICModalOpen, setIsCustomICModalOpen] = useState(false);
  const [editingCustomIC, setEditingCustomIC] = useState<CustomICDefinition | null>(null);
  const [isComponentLibraryOpen, setIsComponentLibraryOpen] = useState(false);
  const [pendingPlacementType, setPendingPlacementType] = useState<ComponentType | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(true);
  const [pickerBaseIndex, setPickerBaseIndex] = useState<number | null>(null);

  // Phase 9: Guided Lab & Onboarding Tour State
  const [activeLab, setActiveLab] = useState<LabExperiment | null>(null);
  const [isGuidedAssistantOpen, setIsGuidedAssistantOpen] = useState<boolean>(true);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);

  // Waveform History Buffer
  const [waveformHistory, setWaveformHistory] = useState<
    { timestamp: number; values: Record<string, '0' | '1' | 'Z' | 'X'> }[]
  >([]);

  // Centralized Destructive Action Confirmation State (Phase 3)
  const [destructiveConfirmation, setDestructiveConfirmation] = useState<DestructiveConfirmationState | null>(null);

  // Contextual Non-Blocking Eject IC Confirmation State (retained for test compatibility)
  const [ejectConfirmation, setEjectConfirmation] = useState<{
    baseIndex: number;
    compId: string;
    compLabel: string;
    socketLabel: string;
    connectedWiresCount: number;
    screenPos?: { x: number; y: number };
  } | null>(null);

  const circuitRef = useRef(circuit);
  useEffect(() => {
    circuitRef.current = circuit;
  }, [circuit]);

  // Track drag start snapshot for undoing component and board moves
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

  const handleBoardDragStart = (_boardIndex: number) => {
    dragStartCircuitRef.current = circuitRef.current;
  };

  const handleBoardDragEnd = (_boardIndex: number) => {
    if (dragStartCircuitRef.current) {
      const synced = syncMountedICPositions(circuitRef.current);
      setCircuitDirect(synced);
      commitAction(dragStartCircuitRef.current, synced);
      dragStartCircuitRef.current = null;
    }
  };

  // Update Multiple Component Positions (continuous board dragging at 60fps)
  const handleUpdateMultipleComponentPositions = (
    updates: Array<{ id: string; x: number; y: number }>
  ) => {
    const updateMap = new Map(updates.map((u) => [u.id, u]));
    setCircuitDirect((prev) => {
      const updatedComps = prev.components.map((c) => {
        const up = updateMap.get(c.id);
        return up ? { ...c, x: up.x, y: up.y } : c;
      });

      // Synchronize board model coordinates if board chassis components shifted
      let nextBoards = prev.trainerBoards;
      if (nextBoards && nextBoards.length > 0) {
        const refComp = updatedComps.find(
          (c) => c.id === 'trainer_out_15' || c.customProps?.outputIndex === 15
        );
        if (refComp) {
          const deltaX = refComp.x - TRAINER_BOARD_LAYOUT.outputsStartX;
          const deltaY = refComp.y - TRAINER_BOARD_LAYOUT.outputsY;
          nextBoards = nextBoards.map((b, idx) => {
            if (idx === 0) {
              const bOriginX = TRAINER_CONSTANTS.DEFAULT_BOARD_X + deltaX;
              const bOriginY = TRAINER_CONSTANTS.DEFAULT_BOARD_Y + deltaY;
              return {
                ...b,
                x: bOriginX,
                y: bOriginY,
                modules: b.modules.map((m) => ({
                  ...m,
                  x: bOriginX + (m.index === 0 ? TRAINER_CONSTANTS.BOARD_PADDING_LEFT : TRAINER_CONSTANTS.BOARD_PADDING_LEFT + TRAINER_CONSTANTS.MODULE_1_WIDTH + TRAINER_CONSTANTS.MODULE_GAP),
                  y: bOriginY,
                })),
                icSlots: b.icSlots.map((s) => ({
                  ...s,
                  x: (TRAINER_BOARD_LAYOUT.icBasesX[s.baseIndex] ?? (54 + s.baseIndex * 274)) + deltaX,
                  y: TRAINER_BOARD_LAYOUT.icBasesY + deltaY,
                })),
              };
            }
            return b;
          });
        }
      }

      // Socket-authoritative synchronization: pins mounted ICs to slot coordinates
      const nextCircuit = syncMountedICPositions({
        ...prev,
        components: updatedComps,
        trainerBoards: nextBoards,
      });

      return nextCircuit;
    });
  };

  // Fit Circuit to Screen
  const handleFitCircuit = useCallback(() => {
    const comps =
      workbenchMode === 'freeform'
        ? circuit.components.filter((c) => !c.isTrainerFixed && !c.id.startsWith('trainer_'))
        : circuit.components;
    if (comps.length === 0) {
      setPan({ x: 20, y: 15 });
      setZoom(1);
      return;
    }
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    comps.forEach((c) => {
      const w = c.width || 80;
      const h = c.height || 60;
      minX = Math.min(minX, c.x);
      minY = Math.min(minY, c.y);
      maxX = Math.max(maxX, c.x + w);
      maxY = Math.max(maxY, c.y + h);
    });
    const margin = 80;
    const availableW =
      window.innerWidth - (isPropertiesOpen ? 260 : 0) - (isComponentLibraryOpen ? 240 : 0);
    const availableH = window.innerHeight - 50;
    const circuitW = maxX - minX + margin * 2;
    const circuitH = maxY - minY + margin * 2;
    const fitZoom = Math.min(
      Math.max(Math.min(availableW / circuitW, availableH / circuitH), 0.35),
      1.75
    );
    const centerX = minX + (maxX - minX) / 2;
    const centerY = minY + (maxY - minY) / 2;
    setZoom(fitZoom);
    setPan({
      x: Math.round(availableW / 2 - centerX * fitZoom),
      y: Math.round(availableH / 2 - centerY * fitZoom),
    });
    soundFx.playButtonTap();
    showToast('Fit circuit to screen');
  }, [circuit.components, isComponentLibraryOpen, isPropertiesOpen, workbenchMode]);



  // Export Circuit JSON
  const handleExportJson = useCallback(() => {
    const data = JSON.stringify(circuit, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `circuitflow_design_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    soundFx.playButtonTap();
    showToast('Circuit exported as JSON');
  }, [circuit]);

  // Import Circuit JSON
  const handleImportJson = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json,.deld';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch {
          showToast('Failed to parse circuit JSON: Invalid JSON syntax');
          return;
        }

        const validation = validateAndSanitizeCircuit(parsed);
        if (!validation.isValid) {
          showToast(`Import rejected: ${validation.errors.join('; ')}`);
          return;
        }

        const res = simulateCircuit(validation.circuit);
        pushState(res.circuit);
        soundFx.playButtonTap();
        if (validation.repaired && validation.warnings.length > 0) {
          showToast(`Circuit imported with ${validation.warnings.length} sanitization repairs applied`);
        } else {
          showToast('Circuit imported successfully');
        }
      } catch (err: any) {
        showToast(`Import failed: ${err?.message || 'Corrupt file structure'}`);
      }
    };
    input.click();
  }, [pushState]);

  // Drag and drop placement handlers from sidebar library
  const handleDropComponent = useCallback(
    (type: ComponentType, pos: { x: number; y: number }) => {
      const newComp = createComponent(type, pos.x, pos.y);
      const nextCircuit = {
        ...circuit,
        components: [...circuit.components, newComp],
      };
      const res = simulateCircuit(nextCircuit);
      pushState(res.circuit);
      setSelectedCompId(newComp.id);
      setSelectedWireId(null);
      soundFx.playButtonTap();
      showToast(`Placed ${newComp.label} on canvas`);
    },
    [circuit, pushState]
  );

  const handleDropCustomIC = useCallback(
    (ic: CustomICDefinition, pos: { x: number; y: number }) => {
      const newComp = createComponent(
        'custom_ic',
        pos.x,
        pos.y,
        ic.partNumber || ic.code,
        { customIC: ic }
      );
      const nextCircuit = {
        ...circuit,
        components: [...circuit.components, newComp],
      };
      const res = simulateCircuit(nextCircuit);
      pushState(res.circuit);
      setSelectedCompId(newComp.id);
      setSelectedWireId(null);
      soundFx.playButtonTap();
      showToast(`Placed ${ic.partNumber || ic.name} on canvas`);
    },
    [circuit, pushState]
  );

  // Rotate selected component
  const handleRotateSelectedComponent = useCallback(() => {
    if (!selectedCompId) return;
    const comp = circuit.components.find((c) => c.id === selectedCompId);
    if (!comp || comp.isTrainerFixed) return;
    const currentRot = comp.rotation || 0;
    const nextRot = (currentRot + 90) % 360;
    const updatedComps = circuit.components.map((c) =>
      c.id === selectedCompId ? { ...c, rotation: nextRot } : c
    );
    const res = simulateCircuit({ ...circuit, components: updatedComps });
    pushState(res.circuit);
    soundFx.playButtonTap();
    showToast(`Rotated ${comp.label} to ${nextRot}°`);
  }, [circuit, selectedCompId, pushState]);

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

  // Board & Module Selection Handlers
  const handleSelectBoard = useCallback((boardId: string | null) => {
    setSelectedBoardId(boardId);
    setSelectedModuleId(null);
    if (boardId) {
      setSelectedCompId(null);
      setSelectedWireId(null);
    }
  }, []);

  const handleSelectModule = useCallback((moduleId: string | null) => {
    setSelectedModuleId(moduleId);
    if (moduleId) {
      setSelectedCompId(null);
      setSelectedWireId(null);
    }
  }, []);

  // Add Module to Trainer Board (Dynamic Expandable Breadboard Module)
  const handleAddModule = useCallback(() => {
    const res = addModuleToTrainerBoard(circuitRef.current);
    commitAction(circuitRef.current, res.circuit);
    soundFx.playButtonTap();
    showToast(`Added ${res.newModule.name} (+2 IC Sockets, +8 Inputs)`);
  }, [commitAction]);

  // Remove Module from Trainer Board
  const handleRemoveModule = useCallback((_moduleId?: string) => {
    const nextCircuit = removeLastModuleFromTrainerBoard(circuitRef.current);
    commitAction(circuitRef.current, nextCircuit);
    soundFx.playButtonTap();
    showToast('Removed module from Trainer Board');
  }, [commitAction]);

  // Delete Board
  const handleDeleteBoard = useCallback((boardId: string) => {
    const nextCircuit = deleteTrainerBoard(circuitRef.current, boardId);
    commitAction(circuitRef.current, nextCircuit);
    setSelectedBoardId(null);
    soundFx.playButtonTap();
    showToast('Deleted Trainer Board');
  }, [commitAction]);

  // Remove a specific Digital Trainer Board instance
  const handleRemoveTrainerBoard = useCallback(
    (boardIndex: number) => {
      const isTrainerCompForBoard = (c: CircuitComponent) => {
        if (c.customProps?.boardIndex === boardIndex) return true;
        if (
          boardIndex === 0 &&
          c.id.startsWith('trainer_') &&
          !c.id.match(/^trainer_b\d+_/)
        ) {
          return true;
        }
        if (c.id.startsWith(`trainer_b${boardIndex}_`)) return true;
        return false;
      };

      const compsToRemove = circuit.components.filter(isTrainerCompForBoard);
      const removeIds = new Set(compsToRemove.map((c) => c.id));
      const nextComps = circuit.components.filter((c) => !removeIds.has(c.id));
      const nextWires = circuit.wires.filter(
        (w) => !removeIds.has(w.fromCompId) && !removeIds.has(w.toCompId)
      );
      const cleaned = cleanupOrphanJunctions(nextComps, nextWires);
      const res = simulateCircuit({ components: cleaned.components, wires: cleaned.wires });
      pushState(res.circuit);
      soundFx.playButtonTap();
      showToast(`Removed Digital Trainer Board #${boardIndex + 1}`);
    },
    [circuit, pushState]
  );

  // Add Component to Canvas (snaps ICs into empty horizontal IC base sockets when available)
  const handleAddComponent = (type: ComponentType) => {
    let posX = Math.round((-pan.x + 300) / zoom / 10) * 10;
    let posY = Math.round((-pan.y + 200) / zoom / 10) * 10;

    const isIC = type.startsWith('ic_') || type === 'custom_ic';
    if (isIC) {
      const availSlot = findAvailableICSocket(circuit);
      if (availSlot) {
        posX = availSlot.x;
        posY = availSlot.y;
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
    setSelectedBoardId(null);
    setSelectedModuleId(null);
    soundFx.playButtonTap();
    showToast(`Added ${newComp.label} to circuit`);
  };

  // Mount or replace IC directly on Horizontal IC Base Socket (Socket-Authoritative)
  const handleSelectICFromPicker = (
    baseIndex: number,
    type: ComponentType,
    customICDef?: CustomICDefinition
  ) => {
    try {
      const res = mountICOnSocket(circuit, baseIndex, type, customICDef);
      pushState(res.circuit);
      if (simulateCircuit(res.circuit).buzzerActive) {
        soundFx.startBuzzer();
      } else {
        soundFx.stopBuzzer();
      }
      setSelectedCompId(res.mountedComponent.id);
      setSelectedWireId(null);
      setSelectedBoardId(null);
      setSelectedModuleId(null);
      setPickerBaseIndex(null);
      soundFx.playButtonTap();
      showToast(`Mounted ${res.mountedComponent.label} on IC Socket ${baseIndex + 1}`);
    } catch (err: any) {
      showToast(`Mount failed: ${err.message || err}`);
      setPickerBaseIndex(null);
    }
  };

  // Request contextual confirmation to eject IC from socket
  const handleRequestEjectIC = useCallback(
    (baseIndex: number, compId?: string) => {
      const board = circuit.trainerBoards?.[0];
      const slot =
        board?.icSlots?.find((s) => s.baseIndex === baseIndex) || board?.icSlots?.[baseIndex];
      const targetComp = compId
        ? circuit.components.find((c) => c.id === compId)
        : slot
        ? getMountedICOnSocket(circuit, slot)
        : undefined;

      if (!targetComp) return;

      const socketLabel = slot?.label || `IC${baseIndex + 1}`;
      const consequences = calculateDestructiveConsequences(circuit, 'eject_mounted_ic', {
        baseIndex,
        componentId: targetComp.id,
      });

      setDestructiveConfirmation({
        type: 'eject_mounted_ic',
        title: `Eject ${targetComp.label} from ${socketLabel}?`,
        targetLabel: targetComp.label,
        socketLabel,
        consequences,
        baseIndex,
        componentId: targetComp.id,
      });

      setEjectConfirmation({
        baseIndex,
        compId: targetComp.id,
        compLabel: targetComp.label,
        socketLabel,
        connectedWiresCount: consequences.affectedWiresCount,
      });
    },
    [circuit]
  );

  // Request contextual confirmation to delete single component
  const handleRequestDeleteComponent = useCallback(
    (id: string) => {
      const target = circuit.components.find((c) => c.id === id);
      if (!target) return;
      if (target.isTrainerFixed && !target.customProps?.trainerMount) {
        showToast('Trainer Kit fixed ports cannot be deleted');
        return;
      }
      if (target.customProps?.trainerMount) {
        handleRequestEjectIC(target.customProps.trainerMount.baseIndex, target.id);
        return;
      }
      const consequences = calculateDestructiveConsequences(circuit, 'remove_component', {
        componentId: id,
      });
      setDestructiveConfirmation({
        type: 'remove_component',
        title: `Remove ${target.label}?`,
        targetLabel: target.label,
        consequences,
        componentId: id,
      });
    },
    [circuit, handleRequestEjectIC]
  );

  // Request contextual confirmation to delete multiple selected components
  const handleRequestDeleteSelected = useCallback(() => {
    if (selectedCompIds.length > 1) {
      const consequences = calculateDestructiveConsequences(circuit, 'remove_multi_components', {
        componentIds: selectedCompIds,
      });
      setDestructiveConfirmation({
        type: 'remove_multi_components',
        title: `Remove ${selectedCompIds.length} Selected Components?`,
        targetLabel: `${selectedCompIds.length} components`,
        consequences,
        componentIds: selectedCompIds,
      });
    } else if (selectedCompId) {
      handleRequestDeleteComponent(selectedCompId);
    }
  }, [circuit, selectedCompIds, selectedCompId, handleRequestDeleteComponent]);

  // Request contextual confirmation to remove module
  const handleRequestRemoveModule = useCallback(
    (boardId: string, moduleId: string) => {
      const board =
        (circuit.trainerBoards || []).find((b) => b.id === boardId) || circuit.trainerBoards?.[0];
      const mod = board?.modules.find((m) => m.id === moduleId);
      if (!mod || mod.index === 0) {
        showToast('Primary Trainer Module 1 cannot be removed');
        return;
      }
      const consequences = calculateDestructiveConsequences(circuit, 'remove_module', {
        boardId,
        moduleId,
      });
      setDestructiveConfirmation({
        type: 'remove_module',
        title: `Remove ${mod.name} from Trainer Board?`,
        targetLabel: mod.name,
        consequences,
        boardId,
        moduleId,
      });
    },
    [circuit]
  );

  // Request contextual confirmation to remove board
  const handleRequestRemoveBoard = useCallback(
    (boardIndex: number, boardId: string) => {
      if ((circuit.trainerBoards?.length || 1) <= 1) {
        showToast('Primary Digital Trainer Kit cannot be removed');
        return;
      }
      const consequences = calculateDestructiveConsequences(circuit, 'remove_board', {
        boardIndex,
        boardId,
      });
      setDestructiveConfirmation({
        type: 'remove_board',
        title: `Remove Digital Trainer Board #${boardIndex + 1}?`,
        targetLabel: `Trainer Board #${boardIndex + 1}`,
        consequences,
        boardIndex,
        boardId,
      });
    },
    [circuit]
  );

  // Execute safe IC ejection after confirmation
  const handleExecuteEjectIC = useCallback(
    (baseIndex: number) => {
      const res = ejectICFromSocket(circuit, baseIndex);
      pushState(res.circuit);
      if (simulateCircuit(res.circuit).buzzerActive) {
        soundFx.startBuzzer();
      } else {
        soundFx.stopBuzzer();
      }
      if (
        selectedCompId &&
        circuit.components.find((c) => c.id === selectedCompId)?.customProps?.trainerMount
          ?.baseIndex === baseIndex
      ) {
        setSelectedCompId(null);
      }
      setEjectConfirmation(null);
      setDestructiveConfirmation(null);
      soundFx.playButtonTap();
      const wireMsg =
        res.disconnectedWiresCount > 0
          ? ` (${res.disconnectedWiresCount} wire${res.disconnectedWiresCount > 1 ? 's' : ''} disconnected)`
          : '';
      showToast(
        `Ejected ${res.ejectedComponent?.label || 'IC'} from Socket ${baseIndex + 1}${wireMsg}`
      );
    },
    [circuit, selectedCompId, pushState]
  );

  // Centralized execution of destructive actions (executed exactly once upon confirm)
  const handleExecuteDestructiveAction = useCallback(() => {
    if (!destructiveConfirmation) return;
    const { type, componentId, componentIds, baseIndex, moduleId, boardIndex } = destructiveConfirmation;

    switch (type) {
      case 'remove_component': {
        if (componentId) {
          const target = circuit.components.find((c) => c.id === componentId);
          if (target?.isTrainerFixed && !target.customProps?.trainerMount) break;
          const remainingComps = circuit.components.filter((c) => c.id !== componentId);
          const remainingWires = circuit.wires.filter(
            (w) => w.fromCompId !== componentId && w.toCompId !== componentId
          );
          const cleaned = cleanupOrphanJunctions(remainingComps, remainingWires);
          const res = simulateCircuit({ components: cleaned.components, wires: cleaned.wires });
          pushState(res.circuit);
          if (res.buzzerActive) soundFx.startBuzzer(); else soundFx.stopBuzzer();
          if (selectedCompId === componentId) setSelectedCompId(null);
          setSelectedCompIds((ids) => ids.filter((id) => id !== componentId));
          soundFx.playButtonTap();
          recordWaveformSample(res.circuit);
          showToast(`Removed component ${destructiveConfirmation.targetLabel}`);
        }
        break;
      }

      case 'remove_multi_components': {
        const idSet = new Set(componentIds || []);
        const remainingComps = circuit.components.filter((c) => !idSet.has(c.id));
        const remainingWires = circuit.wires.filter(
          (w) => !idSet.has(w.fromCompId) && !idSet.has(w.toCompId)
        );
        const cleaned = cleanupOrphanJunctions(remainingComps, remainingWires);
        const res = simulateCircuit({ components: cleaned.components, wires: cleaned.wires });
        pushState(res.circuit);
        if (res.buzzerActive) soundFx.startBuzzer(); else soundFx.stopBuzzer();
        setSelectedCompId(null);
        setSelectedCompIds([]);
        soundFx.playButtonTap();
        recordWaveformSample(res.circuit);
        showToast(`Removed ${idSet.size} components`);
        break;
      }

      case 'eject_mounted_ic': {
        if (baseIndex !== undefined) {
          handleExecuteEjectIC(baseIndex);
        }
        break;
      }

      case 'remove_module': {
        if (moduleId) {
          handleRemoveModule(moduleId);
        }
        break;
      }

      case 'remove_board': {
        if (boardIndex !== undefined) {
          handleRemoveTrainerBoard(boardIndex);
        }
        break;
      }
    }

    setDestructiveConfirmation(null);
    setEjectConfirmation(null);
  }, [
    destructiveConfirmation,
    circuit,
    selectedCompId,
    pushState,
    recordWaveformSample,
    handleExecuteEjectIC,
    handleRemoveModule,
    handleRemoveTrainerBoard,
  ]);

  // Click-outside safe dismiss for destructive confirmation
  useEffect(() => {
    if (!destructiveConfirmation) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && !target.closest('.compact-contextual-confirm-card')) {
        setDestructiveConfirmation(null);
        setEjectConfirmation(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [destructiveConfirmation]);

  // Remove IC from socket via picker modal (routes safely through confirmation)
  const handleRemoveICFromBase = (baseIndex: number) => {
    setPickerBaseIndex(null);
    handleRequestEjectIC(baseIndex);
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
    const success = deleteUserCustomIC(id);
    if (success) {
      setCustomICs(getUserCustomICs(currentUser?.id || 'guest'));
      showToast('Custom IC removed from library');
    } else {
      showToast('Failed to remove Custom IC from library');
    }
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

  // Rotate Component (0° -> 90° -> 180° -> 270° -> 0°)
  const handleRotateComponent = useCallback(
    (id: string) => {
      const comp = circuit.components.find((c) => c.id === id);
      if (!comp || comp.isTrainerFixed) return;
      const nextRotation = getNextRotation(comp.rotation);
      const nextComps = circuit.components.map((c) =>
        c.id === id ? { ...c, rotation: nextRotation } : c
      );
      const res = simulateCircuit({ ...circuit, components: nextComps });
      pushState(res.circuit);
      setIsDirty(true);
      soundFx.playSwitchClick(true);
      showToast(`Rotated to ${nextRotation}°`);
    },
    [circuit, pushState]
  );

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

  // Copy or Duplicate Trainer Board
  const handleCopyBoard = useCallback(
    (boardIndexOrId: number | string) => {
      if (typeof boardIndexOrId === 'string') {
        const res = copyTrainerBoard(circuitRef.current, boardIndexOrId);
        commitAction(circuitRef.current, res.circuit);
        soundFx.playButtonTap();
        showToast('Duplicated Trainer Board');
        return;
      }

      const boardIndex = boardIndexOrId;
      const isBoardComp = (c: CircuitComponent) => {
        if (c.customProps?.boardIndex === boardIndex) return true;
        if (
          boardIndex === 0 &&
          c.id.startsWith('trainer_') &&
          !c.id.match(/^trainer_b\d+_/)
        ) {
          return true;
        }
        if (c.id.startsWith(`trainer_b${boardIndex}_`)) return true;
        return false;
      };

      const boards = getTrainerBoards(circuit.components);
      const thisBoard = boards.find((b) => b.boardIndex === boardIndex);
      const bOffsetX = thisBoard?.offsetX ?? 0;
      const bOffsetY = thisBoard?.offsetY ?? boardIndex * 560;
      const bMinX = TRAINER_BOARD_LAYOUT.boardX + bOffsetX - 20;
      const bMaxX = bMinX + TRAINER_BOARD_LAYOUT.boardWidth + 40;
      const bMinY = TRAINER_BOARD_LAYOUT.boardY + bOffsetY - 20;
      const bMaxY = bMinY + TRAINER_BOARD_LAYOUT.boardHeight + 40;

      const toCopyComps = circuit.components.filter(
        (c) => isBoardComp(c) || (c.x >= bMinX && c.x <= bMaxX && c.y >= bMinY && c.y <= bMaxY)
      );
      const compIds = new Set(toCopyComps.map((c) => c.id));
      const toCopyWires = circuit.wires.filter(
        (w) => compIds.has(w.fromCompId) && compIds.has(w.toCompId)
      );

      const payload = {
        type: 'trainer_board',
        boardIndex,
        components: toCopyComps,
        wires: toCopyWires,
        timestamp: Date.now(),
      };

      localStorage.setItem(CLIPBOARD_STORAGE_KEY, JSON.stringify(payload));
      soundFx.playButtonTap();
      showToast(`Copied Digital Trainer Board #${boardIndex + 1} (${toCopyComps.length} components)`);
    },
    [circuit, commitAction]
  );

  // Copy & Paste Circuit Parts (or whole circuit / selected trainer board)
  const handleCopy = useCallback(() => {
    if (selectedBoardIndex !== null) {
      handleCopyBoard(selectedBoardIndex);
      return;
    }

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

    const hasTrainer = toCopyComps.some(
      (c) => c.isTrainerFixed || c.id.startsWith('trainer_')
    );

    const payload = {
      type: hasTrainer ? 'trainer_board' : 'general',
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
  }, [circuit, isAllSelected, selectedBoardIndex, selectedCompId, selectedWireId, handleCopyBoard]);

  const handlePaste = useCallback(
    (targetPosition?: { x: number; y: number }) => {
      try {
        const raw = localStorage.getItem(CLIPBOARD_STORAGE_KEY);
        if (!raw) {
          showToast('Clipboard is empty (Ctrl+C to copy)');
          return;
        }

        const payload = JSON.parse(raw);
        const hasComponents = Array.isArray(payload.components) && payload.components.length > 0;
        const hasWires = Array.isArray(payload.wires) && payload.wires.length > 0;

        if (!hasComponents && !hasWires) {
          showToast('Clipboard is empty');
          return;
        }

        const effectiveTargetPos = targetPosition || mouseCanvasPosRef.current;
        const hasTrainerFixed = payload.components.some(
          (c: any) => c.isTrainerFixed || (typeof c.id === 'string' && c.id.startsWith('trainer_'))
        );

        if (hasTrainerFixed || payload.type === 'trainer_board') {
          // Paste as a new Digital Trainer Board
          const existingBoards = getTrainerBoards(circuit.components);
          const nextBoardIndex =
            existingBoards.length > 0
              ? Math.max(...existingBoards.map((b) => b.boardIndex)) + 1
              : 0;

          const minX = Math.min(...payload.components.map((c: any) => c.x));
          const minY = Math.min(...payload.components.map((c: any) => c.y));
          const targetX = effectiveTargetPos?.x ? Math.round(effectiveTargetPos.x / 10) * 10 : 20;
          const targetY = effectiveTargetPos?.y
            ? Math.round(effectiveTargetPos.y / 10) * 10
            : nextBoardIndex * 560 + 15;
          const shiftX = targetX - minX;
          const shiftY = targetY - minY;

          const idMap: Record<string, string> = {};
          const newComps: CircuitComponent[] = payload.components.map((c: CircuitComponent) => {
            let newId: string;
            const isTrainer = c.isTrainerFixed || c.id.startsWith('trainer_');
            if (isTrainer) {
              const suffix = c.id.replace(/^trainer_(b\d+_)?/, '');
              newId = nextBoardIndex === 0 ? `trainer_${suffix}` : `trainer_b${nextBoardIndex}_${suffix}`;
            } else {
              newId = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            }
            idMap[c.id] = newId;

            return {
              ...c,
              id: newId,
              isTrainerFixed: isTrainer,
              x: Math.round((c.x + shiftX) / 10) * 10,
              y: Math.round((c.y + shiftY) / 10) * 10,
              inputs: c.inputs.map((p) => ({ ...p })),
              outputs: c.outputs.map((p) => ({ ...p })),
              state: { ...c.state },
              customProps: {
                ...c.customProps,
                ...(isTrainer ? { boardIndex: nextBoardIndex } : {}),
              },
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
          if (workbenchMode !== 'trainer') {
            setWorkbenchMode('trainer');
          }
          setSelectedBoardIndex(nextBoardIndex);
          setSelectedCompId(null);
          setSelectedWireId(null);
          setIsAllSelected(false);
          soundFx.playButtonTap();
          showToast(`Pasted Digital Trainer Board #${nextBoardIndex + 1}`);
          return;
        }

        // Standard standalone components paste (gates, ICs, inputs, probes, muxes, etc.)
        const minX = Math.min(...payload.components.map((c: any) => c.x));
        const maxX = Math.max(...payload.components.map((c: any) => c.x));
        const minY = Math.min(...payload.components.map((c: any) => c.y));
        const maxY = Math.max(...payload.components.map((c: any) => c.y));
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        const targetX = effectiveTargetPos?.x ?? minX + 40;
        const targetY = effectiveTargetPos?.y ?? minY + 40;
        const offsetX = Math.round((targetX - (payload.components.length === 1 ? minX : centerX)) / 10) * 10;
        const offsetY = Math.round((targetY - (payload.components.length === 1 ? minY : centerY)) / 10) * 10;

        const idMap: Record<string, string> = {};
        const newComps: CircuitComponent[] = payload.components.map((c: CircuitComponent) => {
          const newId = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          idMap[c.id] = newId;

          return {
            ...c,
            id: newId,
            isTrainerFixed: false,
            x: Math.max(10, c.x + offsetX),
            y: Math.max(10, c.y + offsetY),
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
        showToast(
          `Pasted ${newComps.length} component${newComps.length === 1 ? '' : 's'}${
            newWires.length > 0 ? ` and ${newWires.length} wire${newWires.length === 1 ? '' : 's'}` : ''
          }`
        );
      } catch {
        showToast('Failed to paste from clipboard');
      }
    },
    [circuit, pushState, workbenchMode]
  );

  // Add an Additional Digital Trainer Board to Workbench
  const handleAddTrainerBoard = useCallback(() => {
    const existingBoards = getTrainerBoards(circuit.components);
    const nextBoardIndex =
      existingBoards.length > 0
        ? Math.max(...existingBoards.map((b) => b.boardIndex)) + 1
        : 0;
    const offsetY = nextBoardIndex * 560;
    const newBoardComps = createTrainerKitComponents(0, offsetY, nextBoardIndex);

    const nextCircuit = {
      ...circuit,
      components: [...circuit.components, ...newBoardComps],
    };
    const res = simulateCircuit(nextCircuit);
    pushState(res.circuit);
    if (workbenchMode !== 'trainer') {
      setWorkbenchMode('trainer');
    }
    soundFx.playButtonTap();
    showToast(`Added Digital Trainer Board #${nextBoardIndex + 1}`);
  }, [circuit, pushState, workbenchMode]);

  // Load Pre-Built Lab Experiment
  const handleLoadExperiment = (exp: LabExperiment, startGuided = true) => {
    setIsRunning(false);
    resetHistory(exp.circuit);
    setSelectedCompId(null);
    setSelectedWireId(null);
    setWaveformHistory([]);
    setPan({ x: 40, y: 40 });
    setZoom(1);

    // Switch workbench mode to trainer if experiment uses trainer kit, else freeform
    const hasTrainer = exp.circuit.components.some(
      (c) => c.isTrainerFixed || (typeof c.id === 'string' && c.id.startsWith('trainer_'))
    );
    if (hasTrainer) {
      setWorkbenchMode('trainer');
    } else {
      setWorkbenchMode('freeform');
    }

    if (startGuided) {
      setActiveLab(exp);
      setIsGuidedAssistantOpen(true);
    } else {
      setActiveLab(null);
    }

    soundFx.playButtonTap();
    showToast(`Loaded ${startGuided ? 'guided lab' : 'schematic'}: ${exp.title}`);
  };

  // Reset Active Lab Circuit without touching unrelated saved circuits
  const handleResetActiveLab = () => {
    if (!activeLab) return;
    setIsRunning(false);
    resetHistory(activeLab.circuit);
    setSelectedCompId(null);
    setSelectedWireId(null);
    setWaveformHistory([]);
    setPan({ x: 40, y: 40 });
    setZoom(1);
    soundFx.playButtonTap();
    showToast(`Reset lab to initial state: ${activeLab.title}`);
  };

  // Load experiment from landing page
  const handleLoadExperimentAndEnter = (exp: LabExperiment) => {
    handleLoadExperiment(exp, true);
    const hasTrainer = exp.circuit.components.some(
      (c) => c.isTrainerFixed || (typeof c.id === 'string' && c.id.startsWith('trainer_'))
    );
    setCurrentView(hasTrainer ? 'hardware' : 'circuit');
  };

  // Load Saved Circuit
  const handleLoadSavedCircuit = (loadedCircuit: Circuit, name: string) => {
    setIsRunning(false);
    const res = simulateCircuit(loadedCircuit);
    resetHistory(res.circuit);
    setSelectedCompId(null);
    setSelectedWireId(null);
    setWaveformHistory([]);
    setProjectName(name);
    setIsDirty(false);
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
    setProjectName('Untitled Circuit');
    setIsDirty(false);
    soundFx.playButtonTap();
    showToast('New circuit created with Digital Trainer Kit ready!');
  }, [resetHistory]);

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
        document.activeElement?.tagName === 'SELECT' ||
        document.activeElement?.tagName === 'TEXTAREA'
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

      // Fit Circuit: F
      if (!isCtrlOrCmd && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        handleFitCircuit();
        return;
      }

      // Toggle Grid: G
      if (!isCtrlOrCmd && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault();
        setShowGrid((g) => !g);
        showToast(showGrid ? 'Grid hidden' : 'Grid visible');
        return;
      }

      // Rotate Component: R
      if (!isCtrlOrCmd && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        handleRotateSelectedComponent();
        return;
      }

      // Reset Zoom / Center: Ctrl+0
      if (isCtrlOrCmd && e.key === '0') {
        e.preventDefault();
        setZoom(1);
        setPan({ x: 20, y: 15 });
        showToast('View reset to 100%');
        return;
      }

      // Space: Run/Pause (handled when not panning)
      if (e.code === 'Space' && !e.shiftKey) {
        e.preventDefault();
        setIsRunning((r) => !r);
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        runSimulationStep();
      } else if (e.key === 'r' || e.key === 'R') {
        if (selectedCompId) {
          e.preventDefault();
          handleRotateComponent(selectedCompId);
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (destructiveConfirmation) return;
        if (isAllSelected) {
          e.preventDefault();
          handleClearCanvas();
          setIsAllSelected(false);
          return;
        }
        if (selectedCompIds.length > 1) {
          e.preventDefault();
          handleRequestDeleteSelected();
          return;
        }
        if (selectedCompId) {
          e.preventDefault();
          handleRequestDeleteComponent(selectedCompId);
          return;
        }
        if (selectedBoardIndex !== null) {
          e.preventDefault();
          const boardId = circuit.trainerBoards?.[selectedBoardIndex]?.id || `board_${selectedBoardIndex + 1}`;
          handleRequestRemoveBoard(selectedBoardIndex, boardId);
          return;
        }
        if (selectedWireId) {
          e.preventDefault();
          handleDeleteWire(selectedWireId);
          return;
        }
      } else if (e.key === 'Escape') {
        if (destructiveConfirmation) {
          e.preventDefault();
          setDestructiveConfirmation(null);
          setEjectConfirmation(null);
          return;
        }
        setPendingPlacementType(null);
        setIsAllSelected(false);
        setSelectedCompId(null);
        setSelectedWireId(null);
        setSelectedBoardIndex(null);
        setIsTruthTableOpen(false);
        setIsLabPresetsOpen(false);
        setIsShortcutsOpen(false);
        setIsAuthOpen(false);
        setIsSavedCircuitsOpen(false);
        setIsAnalysisModalOpen(false);
        setIsCustomICModalOpen(false);
        setPickerBaseIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    circuit,
    isAllSelected,
    selectedCompId,
    selectedCompIds,
    selectedWireId,
    selectedBoardIndex,
    destructiveConfirmation,
    canUndo,
    canRedo,
    undo,
    redo,
    showGrid,
    handleSelectAll,
    handleCopy,
    handlePaste,
    handleClearCanvas,
    handleFitCircuit,
    handleRotateSelectedComponent,
    runSimulationStep,
    handleRequestDeleteComponent,
    handleRequestDeleteSelected,
    handleRequestRemoveBoard,
    handleDeleteWire,
    handleNewCircuit,
  ]);

  const selectedComponent = circuit.components.find((c) => c.id === selectedCompId) || null;
  const selectedWire = circuit.wires.find((w) => w.id === selectedWireId) || null;

  const currentMountedIC =
    pickerBaseIndex !== null
      ? (circuit.trainerBoards?.[0]?.icSlots?.[pickerBaseIndex]
          ? getMountedICOnSocket(circuit, circuit.trainerBoards[0].icSlots[pickerBaseIndex])
          : circuit.components.find((c) => c.customProps?.trainerMount?.baseIndex === pickerBaseIndex))
      : undefined;

  // Render Modern Light Landing Page if in 'landing' view or not authenticated
  if (currentView === 'landing' || !currentUser) {
    return (
      <LandingPage
        currentUser={currentUser}
        onUserLoggedIn={(u) => {
          setCurrentUser(u);
          showToast(`Logged in as ${u.displayName}`);
        }}
        onUserLoggedOut={handleLogout}
        onEnterSimulator={(targetView?: WorkbenchView) => {
          if (!currentUser) {
            const guestUser: User = {
              id: 'guest_user',
              username: 'guest_engineer',
              displayName: 'Guest Engineer',
              avatarColor: '#06B6D4',
              createdAt: Date.now(),
            };
            setCurrentUser(guestUser);
            showToast('Welcome, Guest Engineer! Workbench ready.');
          }
          setCurrentView(targetView || 'hardware');
          soundFx.playButtonTap();
        }}
        onLoadExperimentAndEnter={handleLoadExperimentAndEnter}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />
    );
  }

  // Check trainer master power switch state
  const powerComp = circuit.components.find((c) => c.id === 'trainer_power');
  const isTrainerPowerOn = powerComp ? Boolean(powerComp.state?.toggleState) : true;

  // Render Simulator Workbench
  return (
    <AppShell
      projectName={projectName}
      isDirty={isDirty}
      onProjectNameChange={setProjectName}
      currentView={currentView}
      onViewChange={(view) => {
        setCurrentView(view);
        if (view === 'circuit') {
          setWorkbenchMode('freeform');
        } else if (view === 'hardware') {
          setWorkbenchMode('trainer');
        }
      }}
      isRunning={isRunning}
      onToggleRun={() => setIsRunning((r) => !r)}
      onStep={runSimulationStep}
      onReset={() => {
        setIsRunning(false);
        const resetCirc = simulationEngine.resetSimulation(circuit);
        setCircuitDirect(resetCirc);
        setWaveformHistory([]);
        soundFx.stopBuzzer();
        showToast('Simulation states reset');
      }}
      canUndo={canUndo}
      canRedo={canRedo}
      onUndo={() => {
        undo();
        soundFx.playButtonTap();
        showToast('Undo');
      }}
      onRedo={() => {
        redo();
        soundFx.playButtonTap();
        showToast('Redo');
      }}
      canCopy={Boolean(selectedCompId || selectedWireId || isAllSelected)}
      canPaste={Boolean(localStorage.getItem(CLIPBOARD_STORAGE_KEY))}
      hasSelection={Boolean(selectedCompId || selectedWireId || isAllSelected)}
      soundEnabled={soundEnabled}
      onToggleSound={handleToggleSound}
      theme={theme}
      onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      currentUser={currentUser}
      onOpenAuth={() => setIsAuthOpen(true)}
      onLogout={handleLogout}
      onOpenSavedCircuits={() => setIsSavedCircuitsOpen(true)}
      onOpenTruthTable={() => handleOpenAnalysisModal('truth_table')}
      onOpenAnalysisModal={handleOpenAnalysisModal}
      onOpenWaveform={() => setIsWaveformOpen((v) => !v)}
      onOpenLabPresets={() => setIsLabPresetsOpen(true)}
      onOpenShortcuts={() => setIsShortcutsOpen(true)}
      onOpenCustomIC={() => {
        setEditingCustomIC(null);
        setIsCustomICModalOpen(true);
      }}
      onNewCircuit={handleNewCircuit}
      onClearCanvas={handleClearCanvas}
      onSelectAll={handleSelectAll}
      onCopy={handleCopy}
      onPaste={() => handlePaste()}
      onDeleteSelected={() => {
        if (destructiveConfirmation) return;
        if (isAllSelected) {
          handleClearCanvas();
        } else if (selectedCompIds.length > 1) {
          handleRequestDeleteSelected();
        } else if (selectedCompId) {
          handleRequestDeleteComponent(selectedCompId);
        } else if (selectedWireId) {
          handleDeleteWire(selectedWireId);
        }
      }}
      onResetViewport={() => {
        setZoom(1);
        setPan({ x: 20, y: 15 });
      }}
      onZoomIn={() => setZoom((z) => Math.min(2.5, +(z + 0.1).toFixed(2)))}
      onZoomOut={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)))}
      onSaveCircuit={() => downloadCircuitToFile(circuit, projectName)}
      onExportJson={handleExportJson}
      onImportJson={handleImportJson}
      onToggleLibrary={() => setIsComponentLibraryOpen((prev) => !prev)}
      clockHz={clockHz}
      onClockHzChange={setClockHz}
      componentCount={circuit.components.length}
      wireCount={circuit.wires.length}
      zoom={zoom}
      activeTool="wire"
      isTrainerPowerOn={isTrainerPowerOn}
      activeICCount={circuit.components.filter((c) => c.type.startsWith('ic_') || c.type === 'custom_ic').length}
      activeModuleCount={circuit.trainerBoards?.[0]?.modules.length || 1}
      circuit={circuit}
      onOpenOnboarding={() => setIsOnboardingOpen(true)}
      activeLab={activeLab}
      onOpenGuidedAssistant={() => setIsGuidedAssistantOpen(true)}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '36px',
            right: '24px',
            background: 'var(--bg-panel-elevated)',
            border: '1px solid var(--border-focus)',
            color: 'var(--text-primary)',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            zIndex: 9999,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ color: 'var(--signal-high)' }}>●</span> {toastMessage}
        </div>
      )}

      {/* Left Component Toolbox Drawer */}
      <Sidebar
        isOpen={isComponentLibraryOpen}
        onClose={() => setIsComponentLibraryOpen(false)}
        onAddComponent={handleAddComponent}
        customICs={customICs}
        onOpenCreateIC={() => {
          setEditingCustomIC(null);
          setIsCustomICModalOpen(true);
        }}
        onAddCustomIC={handleAddCustomIC}
        onDeleteCustomIC={handleDeleteCustomIC}
        onEditCustomIC={(ic) => {
          setEditingCustomIC(ic);
          setIsCustomICModalOpen(true);
        }}
      />

      {/* Center Interactive Circuit Canvas */}
      <Canvas
        circuit={circuit}
        selectedCompId={selectedCompId}
        selectedCompIds={selectedCompIds}
        selectedWireId={selectedWireId}
        selectedBoardIndex={selectedBoardIndex}
        isAllSelected={isAllSelected}
        showGrid={showGrid}
        onSelectComponent={(id) => {
          setSelectedCompId(id);
          setSelectedCompIds(id ? [id] : []);
          setIsAllSelected(false);
          if (id) {
            setSelectedWireId(null);
            setSelectedBoardIndex(null);
            setSelectedBoardId(null);
            setSelectedModuleId(null);
            setIsPropertiesOpen(true);
          }
        }}
        onSelectMultipleComponents={(ids) => {
          setSelectedCompIds(ids);
          setSelectedCompId(ids[0] || null);
          setIsAllSelected(false);
          setSelectedWireId(null);
          setSelectedBoardIndex(null);
          setSelectedBoardId(null);
          setSelectedModuleId(null);
          setIsPropertiesOpen(true);
        }}
        onSelectWire={(id) => {
          setSelectedWireId(id);
          setIsAllSelected(false);
          if (id) {
            setSelectedCompId(null);
            setSelectedCompIds([]);
            setSelectedBoardIndex(null);
            setSelectedBoardId(null);
            setSelectedModuleId(null);
            setIsPropertiesOpen(true);
          }
        }}
        onSelectBoard={(boardIndexOrId) => {
          if (typeof boardIndexOrId === 'number' || boardIndexOrId === null) {
            setSelectedBoardIndex(boardIndexOrId);
          }
          if (typeof boardIndexOrId === 'string' || boardIndexOrId === null) {
            setSelectedBoardId(boardIndexOrId);
          }
          setIsAllSelected(false);
          if (boardIndexOrId !== null) {
            setSelectedCompId(null);
            setSelectedCompIds([]);
            setSelectedWireId(null);
            setSelectedModuleId(null);
            setIsPropertiesOpen(true);
          }
        }}
        onUpdateComponentPosition={handleUpdateComponentPosition}
        onUpdateMultipleComponentPositions={handleUpdateMultipleComponentPositions}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onBoardDragStart={handleBoardDragStart}
        onBoardDragEnd={handleBoardDragEnd}
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
        onCopyBoard={handleCopyBoard}
        onPasteAtPosition={(pos) => handlePaste(pos)}
        onDeleteSelected={() => {
          if (destructiveConfirmation) return;
          if (isAllSelected) {
            handleClearCanvas();
          } else if (selectedBoardIndex !== null) {
            const boardId = circuit.trainerBoards?.[selectedBoardIndex]?.id || `board_${selectedBoardIndex + 1}`;
            handleRequestRemoveBoard(selectedBoardIndex, boardId);
          } else if (selectedCompIds.length > 1) {
            handleRequestDeleteSelected();
          } else if (selectedCompId) {
            handleRequestDeleteComponent(selectedCompId);
          } else if (selectedWireId) {
            handleDeleteWire(selectedWireId);
            setSelectedWireId(null);
          }
        }}
        onRotateComponent={handleRotateComponent}
        onFitCircuit={handleFitCircuit}
        onToggleGrid={() => setShowGrid((g) => !g)}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onAddTrainerBoard={handleAddTrainerBoard}
        onRemoveTrainerBoard={handleRemoveTrainerBoard}
        onRequestEjectIC={handleRequestEjectIC}
        onRequestDeleteComponent={handleRequestDeleteComponent}
        onRequestDeleteSelected={handleRequestDeleteSelected}
        onRequestRemoveModule={handleRequestRemoveModule}
        onRequestRemoveBoard={handleRequestRemoveBoard}
        onTogglePower={() => {
          setIsRunning((r) => !r);
          showToast(isRunning ? 'Trainer DC 5V Power OFF' : 'Trainer DC 5V Power ON');
        }}
        onOpenCustomICStudio={(comp) => {
          setSelectedCompId(comp.id);
          setEditingCustomIC(comp.customProps?.customIC || null);
          setIsCustomICModalOpen(true);
        }}
        onToggleLockComponent={(compId) => {
          const comp = circuit.components.find((c) => c.id === compId);
          if (!comp) return;
          const isLocked = !comp.customProps?.locked;
          handleUpdateProps(compId, { ...comp.customProps, locked: isLocked });
          showToast(isLocked ? `Locked ${comp.label}` : `Unlocked ${comp.label}`);
        }}
        onMouseMoveWorld={(pos) => {
          mouseCanvasPosRef.current = pos;
        }}
        workbenchMode={workbenchMode}
        zoom={zoom}
        pan={pan}
        onPanChange={setPan}
        onZoomChange={setZoom}
        onDropComponent={handleDropComponent}
        onDropCustomIC={handleDropCustomIC}
        isSchematicMode={currentView === 'circuit'}
        onAddModule={handleAddModule}
        onRemoveModule={handleRemoveModule}
        onSelectModule={handleSelectModule}
        selectedBoardId={selectedBoardId}
        selectedModuleId={selectedModuleId}
        pendingPlacementType={pendingPlacementType}
        onClearPendingPlacement={() => setPendingPlacementType(null)}
        onOpenLabs={() => setIsLabPresetsOpen(true)}
        onSwitchToTrainer={() => {
          setWorkbenchMode('trainer');
          setCurrentView('hardware');
        }}
        onStartTour={() => setIsOnboardingOpen(true)}
      />

      {/* Guided Lab Assistant Overlay / Dock */}
      {activeLab && isGuidedAssistantOpen && (
        <GuidedLabAssistant
          activeLab={activeLab}
          currentCircuit={circuit}
          onResetLab={handleResetActiveLab}
          onExitLab={() => {
            setActiveLab(null);
            setIsGuidedAssistantOpen(false);
          }}
          onOpenAnalysisTab={(tab) => handleOpenAnalysisModal(tab)}
        />
      )}

      {/* Contextual Properties & Hardware Inspector */}
      <PropertiesPanel
        circuit={circuit}
        component={selectedComponent}
        selectedComponent={selectedComponent}
        selectedWire={selectedWire}
        selectedBoardIndex={selectedBoardIndex}
        selectedBoardId={selectedBoardId}
        selectedModuleId={selectedModuleId}
        isOpen={isPropertiesOpen}
        onClose={() => {
          setSelectedCompId(null);
          setSelectedCompIds([]);
          setSelectedWireId(null);
          setSelectedBoardIndex(null);
          setSelectedBoardId(null);
          setSelectedModuleId(null);
          setIsPropertiesOpen(false);
        }}
        onUpdateLabel={handleUpdateLabel}
        onUpdateProps={handleUpdateProps}
        onDeleteComponent={handleDeleteComponent}
        onRotateComponent={handleRotateComponent}
        onDeleteWire={handleDeleteWire}
        onAddModule={handleAddModule}
        onRemoveModule={handleRemoveModule}
        onCopyBoard={handleCopyBoard}
        onDeleteBoard={handleDeleteBoard}
        onRemoveBoard={handleRemoveTrainerBoard}
        onRequestEjectIC={handleRequestEjectIC}
        onRequestDeleteComponent={handleRequestDeleteComponent}
        onRequestDeleteBoard={handleRequestRemoveBoard}
        onRequestRemoveModule={handleRequestRemoveModule}
        isTrainerMode={currentView === 'hardware'}
        clockHz={clockHz}
        isRunning={isRunning}
        onToggleRun={() => setIsRunning((r) => !r)}
        onStep={runSimulationStep}
        onReset={() => {
          setIsRunning(false);
          const resetCirc = simulationEngine.resetSimulation(circuit);
          setCircuitDirect(resetCirc);
          setWaveformHistory([]);
          soundFx.stopBuzzer();
          showToast('Simulation states reset');
        }}
        onClearCanvas={handleClearCanvas}
        onSelectBoard={handleSelectBoard}
        onSelectModule={handleSelectModule}
      />

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
        onClose={() => {
          setIsCustomICModalOpen(false);
          setEditingCustomIC(null);
        }}
        activeCircuit={circuit}
        userId={currentUser?.id || 'guest'}
        editingIC={editingCustomIC}
        onSaveIC={handleSaveCustomIC}
        onMountIC={(savedIC) => {
          handleSaveCustomIC(savedIC, false);
          handleSelectICFromPicker(0, 'custom_ic', savedIC);
        }}
      />

      <TruthTableModal
        circuit={circuit}
        isOpen={isTruthTableOpen}
        onClose={() => setIsTruthTableOpen(false)}
      />

      <AnalysisModal
        circuit={circuit}
        customICs={customICs}
        isOpen={isAnalysisModalOpen}
        initialTab={analysisModalTab}
        onClose={() => setIsAnalysisModalOpen(false)}
      />

      <LabExperimentsModal
        isOpen={isLabPresetsOpen}
        onClose={() => setIsLabPresetsOpen(false)}
        onLoadExperiment={handleLoadExperiment}
      />

      <OnboardingTour
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onOpenLabPresets={() => {
          setIsOnboardingOpen(false);
          setIsLabPresetsOpen(true);
        }}
        onOpenComponentLibrary={() => setIsComponentLibraryOpen(true)}
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

      {/* Compact Non-Blocking Contextual Confirmation Card (Phase 3 Safe Destructive Actions) */}
      {(destructiveConfirmation || ejectConfirmation) && (() => {
        const conf = destructiveConfirmation || {
          type: 'eject_mounted_ic' as const,
          title: `Eject ${ejectConfirmation!.compLabel} from ${ejectConfirmation!.socketLabel}?`,
          targetLabel: ejectConfirmation!.compLabel,
          socketLabel: ejectConfirmation!.socketLabel,
          consequences: {
            affectedWiresCount: ejectConfirmation!.connectedWiresCount,
            affectedComponentsCount: 1,
            affectedMountedICsCount: 1,
            summaryText:
              ejectConfirmation!.connectedWiresCount > 0
                ? `⚠️ ${ejectConfirmation!.connectedWiresCount} connected wire${
                    ejectConfirmation!.connectedWiresCount > 1 ? 's' : ''
                  } will be disconnected.`
                : 'No wires are connected to this socket.',
          },
          baseIndex: ejectConfirmation!.baseIndex,
          componentId: ejectConfirmation!.compId,
        };

        const isEject = conf.type === 'eject_mounted_ic';
        const hasWiresAffected = conf.consequences.affectedWiresCount > 0;

        return (
          <div
            className="compact-contextual-confirm-card"
            role="dialog"
            aria-modal="true"
            style={{
              top: '80px',
              right: isPropertiesOpen ? '290px' : '30px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirm-card-header">
              <span className="confirm-card-icon">{isEject ? '⏏' : '⚠️'}</span>
              <span className="confirm-card-title">{conf.title}</span>
            </div>
            <div className="confirm-card-body">
              <span className={`confirm-card-message ${hasWiresAffected ? 'wires-warning' : 'wires-clean'}`}>
                {conf.consequences.summaryText}
              </span>
            </div>
            <div className="confirm-card-actions">
              <button
                type="button"
                className="confirm-btn cancel confirm-card-btn"
                onClick={() => {
                  setDestructiveConfirmation(null);
                  setEjectConfirmation(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`confirm-btn confirm-card-btn confirm ${
                  isEject ? 'confirm-eject' : 'confirm-delete'
                }`}
                onClick={handleExecuteDestructiveAction}
              >
                {isEject
                  ? 'Eject IC'
                  : conf.type === 'remove_board'
                  ? 'Remove Board'
                  : conf.type === 'remove_module'
                  ? 'Remove Module'
                  : 'Remove'}
              </button>
            </div>
          </div>
        );
      })()}
    </AppShell>
  );
}

export default App;
