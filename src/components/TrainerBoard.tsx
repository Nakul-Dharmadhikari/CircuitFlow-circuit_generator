import React from 'react';
import { TRAINER_BOARD_LAYOUT } from '../engine/trainerKit';
import type { CircuitComponent } from '../types/circuit';

interface TrainerBoardProps {
  components?: CircuitComponent[];
  onOpenICPicker?: (baseIndex: number) => void;
}

export const TrainerBoard: React.FC<TrainerBoardProps> = ({ components = [], onOpenICPicker }) => {
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

  // Helper to find which IC is currently mounted on a given horizontal base
  const getMountedIC = (baseIndex: number) => {
    const bx = icBasesX[baseIndex];
    const by = icBasesY;
    return components.find(
      (c) =>
        (c.type.startsWith('ic_') || c.type === 'custom_ic') &&
        Math.abs(c.x - bx) < 50 &&
        Math.abs(c.y - by) < 40
    );
  };

  return (
    <div
      className="hardware-trainer-board"
      style={{
        left: `${boardX}px`,
        top: `${boardY}px`,
        width: `${boardWidth}px`,
        height: `${boardHeight}px`,
      }}
    >
      {/* =====================================================================
          TOP SECTION CHASSIS (OUTPUT SECTION HEADER & TOP DIVIDER)
          ===================================================================== */}
      <div className="trainer-top-strip">
        <div className="trainer-section-title top-title">OUTPUT SECTION</div>
        <div className="trainer-divider top-div" />
      </div>

      {/* =====================================================================
          MIDDLE SECTION: 3 HORIZONTAL 20-PIN IC BASES (Interactive Sockets)
          ===================================================================== */}
      <div className="trainer-ic-bases-layer">
        {icBasesX.map((baseX, index) => {
          const mountedIC = getMountedIC(index);

          return (
            <div
              key={index}
              className={`horizontal-ic-base-socket ${mountedIC ? 'occupied' : 'empty'}`}
              style={{
                left: `${baseX - boardX}px`,
                top: `${icBasesY - boardY}px`,
                width: `${icBaseWidth}px`,
                height: `${icBaseHeight}px`,
              }}
              title={
                mountedIC
                  ? `IC BASE ${index + 1}: ${mountedIC.label} mounted. Click to replace or change IC.`
                  : `IC BASE ${index + 1}: Empty socket. Click to select an IC to mount here.`
              }
              onClick={() => onOpenICPicker?.(index)}
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
                        onOpenICPicker?.(index);
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
};
export default TrainerBoard;
