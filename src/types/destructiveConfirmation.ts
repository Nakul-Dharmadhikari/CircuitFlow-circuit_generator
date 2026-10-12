import type { Circuit, CircuitComponent } from './circuit';

export type DestructiveActionType =
  | 'remove_component'
  | 'remove_multi_components'
  | 'eject_mounted_ic'
  | 'remove_wire'
  | 'remove_module'
  | 'remove_board';

export interface DestructiveConsequences {
  affectedWiresCount: number;
  affectedComponentsCount: number;
  affectedMountedICsCount: number;
  summaryText: string;
}

export interface DestructiveConfirmationState {
  type: DestructiveActionType;
  title: string;
  targetLabel: string;
  consequences: DestructiveConsequences;
  // Specific payload fields
  componentId?: string;
  componentIds?: string[];
  wireId?: string;
  baseIndex?: number;
  socketLabel?: string;
  boardId?: string;
  boardIndex?: number;
  moduleId?: string;
  screenPos?: { x: number; y: number };
}

/**
 * Dynamically computes real consequences for any destructive action from the current circuit model.
 * Zero hardcoded counts.
 */
export function calculateDestructiveConsequences(
  circuit: Circuit,
  type: DestructiveActionType,
  payload: {
    componentId?: string;
    componentIds?: string[];
    wireId?: string;
    baseIndex?: number;
    moduleId?: string;
    boardIndex?: number;
    boardId?: string;
  }
): DestructiveConsequences {
  switch (type) {
    case 'remove_component': {
      if (!payload.componentId) {
        return { affectedWiresCount: 0, affectedComponentsCount: 1, affectedMountedICsCount: 0, summaryText: 'No wires connected.' };
      }
      const compId = payload.componentId;
      const connectedWires = circuit.wires.filter(
        (w) => w.fromCompId === compId || w.toCompId === compId
      );
      const isMounted = circuit.components.find((c) => c.id === compId)?.customProps?.trainerMount;

      const summaryText = connectedWires.length > 0
        ? `⚠️ ${connectedWires.length} connected wire${connectedWires.length > 1 ? 's' : ''} will be disconnected.`
        : 'No wires are connected to this component.';

      return {
        affectedWiresCount: connectedWires.length,
        affectedComponentsCount: 1,
        affectedMountedICsCount: isMounted ? 1 : 0,
        summaryText,
      };
    }

    case 'remove_multi_components': {
      const ids = new Set(payload.componentIds || []);
      const connectedWires = circuit.wires.filter(
        (w) => ids.has(w.fromCompId) || ids.has(w.toCompId)
      );
      const mountedCount = circuit.components.filter(
        (c) => ids.has(c.id) && c.customProps?.trainerMount
      ).length;

      const summaryText = ids.size > 0
        ? `⚠️ ${ids.size} component${ids.size > 1 ? 's' : ''} and ${connectedWires.length} connected wire${connectedWires.length === 1 ? '' : 's'} will be removed.`
        : 'No components selected.';

      return {
        affectedWiresCount: connectedWires.length,
        affectedComponentsCount: ids.size,
        affectedMountedICsCount: mountedCount,
        summaryText,
      };
    }

    case 'eject_mounted_ic': {
      let targetComp: CircuitComponent | undefined;
      if (payload.componentId) {
        targetComp = circuit.components.find((c) => c.id === payload.componentId);
      } else if (payload.baseIndex !== undefined) {
        targetComp = circuit.components.find(
          (c) => c.customProps?.trainerMount?.baseIndex === payload.baseIndex
        );
      }

      if (!targetComp) {
        return { affectedWiresCount: 0, affectedComponentsCount: 1, affectedMountedICsCount: 1, summaryText: 'No IC mounted in this socket.' };
      }

      const connectedWires = circuit.wires.filter(
        (w) => w.fromCompId === targetComp!.id || w.toCompId === targetComp!.id
      );

      const summaryText = connectedWires.length > 0
        ? `⚠️ ${connectedWires.length} connected wire${connectedWires.length > 1 ? 's' : ''} will be disconnected.`
        : 'No wires are connected to this socket.';

      return {
        affectedWiresCount: connectedWires.length,
        affectedComponentsCount: 1,
        affectedMountedICsCount: 1,
        summaryText,
      };
    }

    case 'remove_wire': {
      return {
        affectedWiresCount: 1,
        affectedComponentsCount: 0,
        affectedMountedICsCount: 0,
        summaryText: 'Wire will be removed.',
      };
    }

    case 'remove_module': {
      const targetBoard = (circuit.trainerBoards || []).find((b) =>
        b.modules.some((m) => m.id === payload.moduleId)
      ) || circuit.trainerBoards?.[0];

      if (!targetBoard || !payload.moduleId) {
        return { affectedWiresCount: 0, affectedComponentsCount: 0, affectedMountedICsCount: 0, summaryText: 'Module not found.' };
      }

      const mod = targetBoard.modules.find((m) => m.id === payload.moduleId);
      const modSlots = targetBoard.icSlots.filter((s) => s.moduleId === payload.moduleId);
      const slotBaseIndices = new Set(modSlots.map((s) => s.baseIndex));

      // Mounted ICs on this module
      const mountedICs = circuit.components.filter(
        (c) => c.customProps?.trainerMount && slotBaseIndices.has(c.customProps.trainerMount.baseIndex)
      );

      // Input ports on this module
      const inputIds = new Set(mod?.inputComponentIds || []);
      const allCompIds = new Set([...mountedICs.map((c) => c.id), ...inputIds]);

      const connectedWires = circuit.wires.filter(
        (w) => allCompIds.has(w.fromCompId) || allCompIds.has(w.toCompId)
      );

      const summaryText = `⚠️ ${mountedICs.length} mounted IC${mountedICs.length === 1 ? '' : 's'} and ${connectedWires.length} connected wire${connectedWires.length === 1 ? '' : 's'} will be affected.`;

      return {
        affectedWiresCount: connectedWires.length,
        affectedComponentsCount: allCompIds.size,
        affectedMountedICsCount: mountedICs.length,
        summaryText,
      };
    }

    case 'remove_board': {
      const boardIndex = payload.boardIndex ?? 0;
      const isBoardComp = (c: CircuitComponent) => {
        if (c.customProps?.boardIndex === boardIndex) return true;
        if (boardIndex === 0 && c.id.startsWith('trainer_') && !c.id.match(/^trainer_b\d+_/)) {
          return true;
        }
        if (c.id.startsWith(`trainer_b${boardIndex}_`)) return true;
        return false;
      };

      const boardComps = circuit.components.filter(isBoardComp);
      const boardCompIds = new Set(boardComps.map((c) => c.id));
      const connectedWires = circuit.wires.filter(
        (w) => boardCompIds.has(w.fromCompId) || boardCompIds.has(w.toCompId)
      );
      const mountedICs = boardComps.filter((c) => c.customProps?.trainerMount);

      const summaryText = `⚠️ Digital Trainer Board #${boardIndex + 1} with ${mountedICs.length} mounted IC${mountedICs.length === 1 ? '' : 's'} and ${connectedWires.length} connected wire${connectedWires.length === 1 ? '' : 's'} will be removed.`;

      return {
        affectedWiresCount: connectedWires.length,
        affectedComponentsCount: boardComps.length,
        affectedMountedICsCount: mountedICs.length,
        summaryText,
      };
    }
  }
}
