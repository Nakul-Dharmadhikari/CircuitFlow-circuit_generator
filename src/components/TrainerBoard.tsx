import React from 'react';
import { TRAINER_BOARD_LAYOUT, getTrainerBoards } from '../engine/trainerKit';
import type { CircuitComponent } from '../types/circuit';

interface TrainerBoardProps {
  components?: CircuitComponent[];
  selectedBoardIndex?: number | null;
  onSelectBoard?: (boardIndex: number | null) => void;
  onOpenICPicker?: (baseIndex: number) => void;
  onRemoveBoard?: (boardIndex: number) => void;
  onStartDragBoard?: (boardIndex: number, e: React.MouseEvent) => void;
  onCopyBoard?: (boardIndex: number) => void;
}

export const TrainerBoard: React.FC<TrainerBoardProps> = ({
  components = [],
  selectedBoardIndex = null,
  onSelectBoard,
  onOpenICPicker,
  onRemoveBoard,
  onStartDragBoard,
  onCopyBoard,
}) => {
  const {
    boardX,
    boardY,
    boardWidth,
    boardHeight,
    icBasesX,
    icBasesY,
    icBaseWidth,
    icBaseHeight,
  } = TRAINER_BOARD_LAYOUT;

  const boards = getTrainerBoards(components);

  // Helper to find which IC is currently mounted on a given horizontal base
  const getMountedIC = (baseX: number, baseY: number) => {
    return components.find(
      (c) =>
        (c.type.startsWith('ic_') || c.type === 'custom_ic') &&
        Math.abs(c.x - baseX) < 50 &&
        Math.abs(c.y - baseY) < 40
    );
  };

  return (
    <>
      {boards.map(({ boardIndex, offsetX, offsetY }) => {
        const currentBoardX = boardX + offsetX;
        const currentBoardY = boardY + offsetY;
        const isSelected = selectedBoardIndex === boardIndex;

        return (
          <div
            key={boardIndex}
            className={`hardware-trainer-board ${isSelected ? 'selected' : ''}`}
            style={{
              left: `${currentBoardX}px`,
              top: `${currentBoardY}px`,
              width: `${boardWidth}px`,
              height: `${boardHeight}px`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectBoard?.(boardIndex);
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
                  onSelectBoard?.(boardIndex);
                  onStartDragBoard?.(boardIndex, e);
                }
              }}
            >
              <div className="trainer-board-drag-title">
                <span className="trainer-drag-dots">⠿</span>
                <span>DIGITAL TRAINER BOARD #{boardIndex + 1}</span>
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
                {onRemoveBoard && (
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
                TOP SECTION CHASSIS (OUTPUT SECTION SILKSCREEN)
                ===================================================================== */}
            <div className="trainer-top-strip">
              <div className="trainer-section-title top-title">
                OUTPUT SECTION {boards.length > 1 ? `(BOARD #${boardIndex + 1})` : ''}
              </div>
              <div className="trainer-divider top-div" />
            </div>

            {/* =====================================================================
                MIDDLE SECTION: 3 HORIZONTAL 20-PIN IC BASES (Interactive Sockets)
                ===================================================================== */}
            <div className="trainer-ic-bases-layer">
              {icBasesX.map((baseXOrigin, index) => {
                const absoluteBaseX = baseXOrigin + offsetX;
                const absoluteBaseY = icBasesY + offsetY;
                const mountedIC = getMountedIC(absoluteBaseX, absoluteBaseY);

                return (
                  <div
                    key={index}
                    className={`horizontal-ic-base-socket ${mountedIC ? 'occupied' : 'empty'}`}
                    style={{
                      left: `${baseXOrigin - boardX}px`,
                      top: `${icBasesY - boardY}px`,
                      width: `${icBaseWidth}px`,
                      height: `${icBaseHeight}px`,
                    }}
                    title={
                      mountedIC
                        ? `IC BASE ${index + 1}: ${mountedIC.label} mounted. Click to replace or change IC.`
                        : `IC BASE ${index + 1}: Empty socket. Click to select an IC to mount here.`
                    }
                    onClick={() => onOpenICPicker?.(index + boardIndex * 3)}
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

                      {/* Center Interactive Button */}
                      <div className="base-center-interactive">
                        {mountedIC ? (
                          <div className="base-occupied-tag">
                            <span className="base-socket-name">IC BASE {index + 1}</span>
                            <span className="base-chip-name">{mountedIC.label}</span>
                            <span className="base-swap-action">Click to Swap IC 🔄</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="base-mount-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenICPicker?.(index + boardIndex * 3);
                            }}
                          >
                            <span className="mount-btn-plus">➕</span>
                            <span className="mount-btn-text">IC BASE {index + 1}</span>
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
            </div>

            {/* =====================================================================
                BOTTOM SECTION CHASSIS (INPUT & CLOCK SECTION HEADERS & BOTTOM DIVIDER)
                ===================================================================== */}
            <div className="trainer-bottom-strip">
              <div className="trainer-divider bottom-div" />
              <div className="trainer-section-title input-title">INPUT SECTION</div>
              <div className="trainer-section-title clock-title">CLOCK SECTION</div>
            </div>
          </div>
        );
      })}
    </>
  );
};
export default TrainerBoard;
