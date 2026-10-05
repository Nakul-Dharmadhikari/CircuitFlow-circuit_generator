import React from 'react';
import type { Circuit, CircuitComponent } from '../types/circuit';
import { TRAINER_BOARD_LAYOUT, getTrainerBoards } from '../engine/trainerKit';
import {
  TRAINER_CONSTANTS,
  type TrainerBoardModel,
  type TrainerICSlot,
} from '../engine/trainer/trainerBoardModel';

interface TrainerBoardProps {
  circuit?: Circuit;
  components?: CircuitComponent[];
  board?: TrainerBoardModel;
  selectedBoardIndex?: number | null;
  onSelectBoard?: (boardIndexOrId: any) => void;
  onOpenICPicker?: (baseIndex: number) => void;
  onRemoveBoard?: (boardIndex: number) => void;
  onStartDragBoard?: (boardIndex: number, e: React.MouseEvent) => void;
  onCopyBoard?: (boardIndex: number) => void;
  onAddModule?: () => void;
  onRemoveModule?: (moduleId?: string) => void;
  onSelectModule?: (moduleId: string) => void;
  selectedBoardId?: string | null;
  selectedModuleId?: string | null;
}

export const TrainerBoard: React.FC<TrainerBoardProps> = ({
  circuit,
  components = circuit?.components || [],
  board: propBoard,
  selectedBoardIndex = null,
  onSelectBoard,
  onOpenICPicker,
  onRemoveBoard,
  onStartDragBoard,
  onCopyBoard,
  onAddModule,
  onRemoveModule,
  onSelectModule,
  selectedBoardId,
  selectedModuleId,
}) => {
  // Determine all boards to render:
  // Prefer circuit.trainerBoards if populated; otherwise discover via getTrainerBoards or propBoard
  let boardsToRender: Array<{
    boardModel: TrainerBoardModel;
    boardIndex: number;
  }> = [];

  if (propBoard) {
    boardsToRender = [{ boardModel: propBoard, boardIndex: 0 }];
  } else if (circuit?.trainerBoards && circuit.trainerBoards.length > 0) {
    boardsToRender = circuit.trainerBoards.map((b, idx) => ({
      boardModel: b,
      boardIndex: idx,
    }));
  } else {
    const discovered = getTrainerBoards(components);
    const count = Math.max(1, discovered.length);
    boardsToRender = Array.from({ length: count }, (_, idx) => {
      const disc = discovered[idx] || { boardIndex: idx, offsetX: 0, offsetY: idx * 560 };
      const defaultBoard: TrainerBoardModel = {
        id: idx === 0 ? 'board_1' : `board_${idx + 1}`,
        name: `Digital Trainer Board #${idx + 1}`,
        x: TRAINER_CONSTANTS.DEFAULT_BOARD_X + disc.offsetX,
        y: TRAINER_CONSTANTS.DEFAULT_BOARD_Y + disc.offsetY,
        width: 1180,
        height: TRAINER_CONSTANTS.BOARD_HEIGHT,
        modules: [
          {
            id: `${idx === 0 ? 'board_1' : `board_${idx + 1}`}_mod_1`,
            index: 0,
            name: 'Module 1',
            x: TRAINER_CONSTANTS.DEFAULT_BOARD_X + disc.offsetX + TRAINER_CONSTANTS.BOARD_PADDING_LEFT,
            y: TRAINER_CONSTANTS.DEFAULT_BOARD_Y + disc.offsetY,
            width: TRAINER_CONSTANTS.MODULE_1_WIDTH,
            height: TRAINER_CONSTANTS.BOARD_HEIGHT,
            icCount: 4,
            inputCount: 16,
            startInputIndex: 0,
            icSlotIds: [
              `${idx === 0 ? 'board_1' : `board_${idx + 1}`}_ic_1`,
              `${idx === 0 ? 'board_1' : `board_${idx + 1}`}_ic_2`,
              `${idx === 0 ? 'board_1' : `board_${idx + 1}`}_ic_3`,
              `${idx === 0 ? 'board_1' : `board_${idx + 1}`}_ic_4`,
            ],
            inputComponentIds: [],
          },
        ],
        icSlots: [
          {
            id: `${idx === 0 ? 'board_1' : `board_${idx + 1}`}_ic_1`,
            label: 'IC1',
            x: 54 + disc.offsetX,
            y: 150 + disc.offsetY,
            width: 250,
            height: 88,
            baseIndex: idx * 4 + 0,
            moduleId: `${idx === 0 ? 'board_1' : `board_${idx + 1}`}_mod_1`,
            boardId: idx === 0 ? 'board_1' : `board_${idx + 1}`,
          },
          {
            id: `${idx === 0 ? 'board_1' : `board_${idx + 1}`}_ic_2`,
            label: 'IC2',
            x: 328 + disc.offsetX,
            y: 150 + disc.offsetY,
            width: 250,
            height: 88,
            baseIndex: idx * 4 + 1,
            moduleId: `${idx === 0 ? 'board_1' : `board_${idx + 1}`}_mod_1`,
            boardId: idx === 0 ? 'board_1' : `board_${idx + 1}`,
          },
          {
            id: `${idx === 0 ? 'board_1' : `board_${idx + 1}`}_ic_3`,
            label: 'IC3',
            x: 602 + disc.offsetX,
            y: 150 + disc.offsetY,
            width: 250,
            height: 88,
            baseIndex: idx * 4 + 2,
            moduleId: `${idx === 0 ? 'board_1' : `board_${idx + 1}`}_mod_1`,
            boardId: idx === 0 ? 'board_1' : `board_${idx + 1}`,
          },
          {
            id: `${idx === 0 ? 'board_1' : `board_${idx + 1}`}_ic_4`,
            label: 'IC4',
            x: 876 + disc.offsetX,
            y: 150 + disc.offsetY,
            width: 250,
            height: 88,
            baseIndex: idx * 4 + 3,
            moduleId: `${idx === 0 ? 'board_1' : `board_${idx + 1}`}_mod_1`,
            boardId: idx === 0 ? 'board_1' : `board_${idx + 1}`,
          },
        ],
        isPowerOn: true,
        clockHz: 1,
        activeModuleCount: 1,
      };
      return { boardModel: defaultBoard, boardIndex: idx };
    });
  }

  // Helper to find which IC is currently mounted on a given slot
  const getMountedICForSlot = (slot: TrainerICSlot) => {
    return components.find(
      (c) =>
        (c.type.startsWith('ic_') || c.type === 'custom_ic') &&
        (c.customProps?.trainerMount?.socketId === slot.id ||
          (Math.abs(c.x - slot.x) < 50 && Math.abs(c.y - slot.y) < 40))
    );
  };

  return (
    <>
      {boardsToRender.map(({ boardModel, boardIndex }) => {
        const { x: boardX, y: boardY, width: boardWidth, height: boardHeight, modules, icSlots } = boardModel;
        const isSelected =
          selectedBoardId === boardModel.id ||
          selectedBoardIndex === boardIndex;

        // Position for + ADD MODULE button (right beside the last IC socket of this board)
        const lastSlot = icSlots[icSlots.length - 1];
        const addModuleBtnX = lastSlot ? lastSlot.x + lastSlot.width + 16 : boardX + 900;
        const addModuleBtnY = lastSlot ? lastSlot.y : boardY + TRAINER_CONSTANTS.IC_Y_OFFSET;

        return (
          <div
            key={boardModel.id}
            className={`hardware-trainer-board ${isSelected ? 'board-selected selected' : ''}`}
            style={{
              left: `${boardX}px`,
              top: `${boardY}px`,
              width: `${boardWidth}px`,
              height: `${boardHeight}px`,
            }}
            onClick={(e) => {
              if ((e.target as HTMLElement).classList.contains('hardware-trainer-board')) {
                onSelectBoard?.(boardModel.id);
                onSelectBoard?.(boardIndex);
              }
            }}
          >
            {/* =====================================================================
                TOP DRAGGABLE HEADER BAR (DRAG HANDLE & QUICK ACTIONS)
                ===================================================================== */}
            <div
              className="trainer-board-drag-header"
              title="Click & Drag to move this Trainer Board"
              onMouseDown={(e) => {
                if ((e.target as HTMLElement).tagName !== 'BUTTON') {
                  onSelectBoard?.(boardModel.id);
                  onSelectBoard?.(boardIndex);
                  onStartDragBoard?.(boardIndex, e);
                }
              }}
            >
              <div className="trainer-board-drag-title">
                <span className="trainer-drag-dots">⠿</span>
                <span>{boardModel.name || `DIGITAL TRAINER BOARD #${boardIndex + 1}`}</span>
                <span className="trainer-drag-hint">(Drag to Move)</span>
              </div>

              <div className="trainer-board-header-actions">
                {onCopyBoard && (
                  <button
                    type="button"
                    className="trainer-header-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopyBoard(boardIndex);
                    }}
                    title={`Copy Trainer Board #${boardIndex + 1} and all mounted chips/wiring`}
                  >
                    📋 Copy
                  </button>
                )}
                {boardsToRender.length > 1 && onRemoveBoard && (
                  <button
                    type="button"
                    className="trainer-remove-board-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveBoard(boardIndex);
                    }}
                    title={`Remove Trainer Board #${boardIndex + 1} from workbench`}
                  >
                    ✕ Remove
                  </button>
                )}
              </div>
            </div>

            {/* =====================================================================
                TOP SECTION CHASSIS (OUTPUT SECTION HEADER & TOP SILKSCREEN DIVIDER)
                ===================================================================== */}
            <div className="trainer-top-strip">
              <div className="trainer-header-left">
                <div className="trainer-board-badge" title="DELDSIM Digital Logic Laboratory Trainer System">
                  <span className="badge-dot">●</span>
                  <span className="badge-name">{boardModel.name || 'TRAINER KIT'}</span>
                  <span className="badge-modules-count">
                    {modules.length} {modules.length === 1 ? 'MODULE' : 'MODULES'} • {icSlots.length} IC SLOTS
                  </span>
                </div>
                <div className="trainer-section-title top-title">
                  OUTPUT SECTION {boardsToRender.length > 1 ? `(BOARD #${boardIndex + 1})` : ''}
                </div>
              </div>

              <div className="trainer-header-right">
                <div className="trainer-ext-summary">
                  <span>DIP-20 SOCKETS: <strong>{icSlots.length}</strong></span>
                  <span>INPUTS: <strong>{modules.reduce((acc, m) => acc + m.inputCount, 0)}</strong></span>
                </div>
              </div>

              <div className="trainer-divider top-div" />
            </div>

            {/* =====================================================================
                MIDDLE SECTION: DYNAMIC EXPANDABLE BREADBOARD MODULES & IC BASES
                ===================================================================== */}
            <div className="trainer-modules-container">
              {modules.map((mod, modIdx) => {
                const modSlots = icSlots.filter((s) => s.moduleId === mod.id);
                const isModSelected = selectedModuleId === mod.id;

                return (
                  <div
                    key={mod.id}
                    className={`trainer-module-zone ${isModSelected ? 'module-selected' : ''}`}
                    style={{
                      left: `${mod.x - boardX}px`,
                      top: `${mod.y - boardY + 70}px`,
                      width: `${mod.width}px`,
                      height: `${mod.height - 180}px`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectModule?.(mod.id);
                    }}
                  >
                    {/* Module Header Bar / Subtle Silkscreen Divider */}
                    <div className="module-banner">
                      <div className="module-title-group">
                        <span className="module-tag">{mod.name.toUpperCase()}</span>
                        <span className="module-specs">
                          ({modSlots.length} IC Sockets • {mod.inputCount} Inputs)
                        </span>
                      </div>

                      {modIdx > 0 && onRemoveModule && (
                        <button
                          type="button"
                          className="module-remove-btn"
                          title={`Remove ${mod.name} and its generated sockets/inputs`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Remove ${mod.name}? Any ICs mounted on its sockets will be unmounted.`)) {
                              onRemoveModule(mod.id);
                            }
                          }}
                        >
                          ✕ Remove
                        </button>
                      )}
                    </div>

                    {/* Module Visual Boundary / Subtle Inset Breadboard Matrix */}
                    <div className="module-breadboard-bed">
                      <div className="breadboard-bus-stripe top-bus" />
                      <div className="breadboard-tie-points-matrix" />
                      <div className="breadboard-bus-stripe bottom-bus" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* =====================================================================
                INTERACTIVE IC SOCKETS LAYER (DIP-20 Horizontal Sockets)
                ===================================================================== */}
            <div className="trainer-ic-bases-layer">
              {icSlots.map((slot) => {
                const mountedIC = getMountedICForSlot(slot);

                return (
                  <div
                    key={slot.id}
                    className={`horizontal-ic-base-socket ${mountedIC ? 'occupied' : 'empty'}`}
                    style={{
                      left: `${slot.x - boardX}px`,
                      top: `${slot.y - boardY}px`,
                      width: `${slot.width}px`,
                      height: `${slot.height}px`,
                    }}
                    title={
                      mountedIC
                        ? `${slot.label}: ${mountedIC.label} mounted. Click to replace or change IC.`
                        : `${slot.label}: Empty socket. Click to select an IC to mount here.`
                    }
                    onClick={() => onOpenICPicker?.(slot.baseIndex)}
                  >
                    {/* Top Pin Sockets (20 down to 11 from left to right) */}
                    <div className="base-pins-row top-row">
                      {[20, 19, 18, 17, 16, 15, 14, 13, 12, 11].map((pin) => (
                        <div key={pin} className="base-pin-slot" title={`Socket Pin ${pin}`}>
                          <span className="slot-index">{pin}</span>
                          <div className="slot-socket-hole" />
                        </div>
                      ))}
                    </div>

                    {/* Socket Body Center Area */}
                    <div className="base-socket-body">
                      {/* Left Orientation Notch */}
                      <div className="base-socket-notch" />

                      {/* Center Interactive Mount/Swap Area */}
                      <div className="base-center-interactive">
                        {mountedIC ? (
                          <div className="base-occupied-tag">
                            <span className="base-socket-name">{slot.label}</span>
                            <span className="base-chip-name">{mountedIC.label}</span>
                            <span className="base-swap-action">Click to Swap IC 🔄</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="base-mount-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenICPicker?.(slot.baseIndex);
                            }}
                          >
                            <span className="mount-btn-plus">➕</span>
                            <span className="mount-btn-text">{slot.label}</span>
                            <span className="mount-btn-sub">Click to Mount IC</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Bottom Pin Sockets (1 to 10 from left to right) */}
                    <div className="base-pins-row bottom-row">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((pin) => (
                        <div key={pin} className="base-pin-slot" title={`Socket Pin ${pin}`}>
                          <div className="slot-socket-hole" />
                          <span className="slot-index">{pin}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* ===================================================================
                  + ADD MODULE / + EXTEND BOARD ACTION SLOT
                  Prominently positioned right beside the last IC socket!
                  =================================================================== */}
              {onAddModule && (
                <div
                  className="trainer-add-module-card"
                  style={{
                    left: `${addModuleBtnX - boardX}px`,
                    top: `${addModuleBtnY - boardY}px`,
                    height: `${TRAINER_CONSTANTS.IC_SOCKET_HEIGHT}px`,
                  }}
                  title="Extend Trainer Board with an additional module (+2 IC Sockets, +8 Inputs)"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddModule();
                  }}
                >
                  <div className="add-module-content">
                    <div className="add-module-icon">➕</div>
                    <div className="add-module-text">
                      <span className="add-mod-title">+ ADD MODULE</span>
                      <span className="add-mod-desc">+2 ICs • +8 Inputs</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* =====================================================================
                BOTTOM SECTION CHASSIS (INPUT SECTION & CLOCK SECTION)
                ===================================================================== */}
            <div className="trainer-bottom-strip">
              <div className="trainer-divider bottom-div" />
              <div className="trainer-bottom-labels">
                {/* Dynamic input labels for each module */}
                <div className="input-sections-row">
                  {modules.map((m) => (
                    <div
                      key={m.id}
                      className="trainer-section-title input-title"
                      style={{
                        minWidth: `${m.width}px`,
                      }}
                    >
                      <span>INPUT SECTION ({m.name.toUpperCase()}: IN{m.startInputIndex + m.inputCount - 1}..IN{m.startInputIndex})</span>
                    </div>
                  ))}
                </div>

                <div className="trainer-section-title clock-title">
                  <span>CLOCK & POWER CONTROLS</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};

export default TrainerBoard;
