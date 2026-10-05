import React from 'react';
import { TopBar } from './layout/TopBar';
import { MainWorkspace } from './layout/MainWorkspace';
import { StatusBar } from './layout/StatusBar';
import type { Circuit, User } from '../types/circuit';
import type { InteractionTool, WorkbenchView } from '../hooks/useUIState';

interface AppShellProps {
  projectName: string;
  isDirty?: boolean;
  onProjectNameChange?: (name: string) => void;
  currentView: WorkbenchView;
  onViewChange: (view: WorkbenchView) => void;
  isRunning: boolean;
  onToggleRun: () => void;
  onStep: () => void;
  onReset: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canCopy?: boolean;
  canPaste?: boolean;
  hasSelection?: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  currentUser: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenSavedCircuits: () => void;
  onOpenTruthTable: () => void;
  onOpenWaveform: () => void;
  onOpenLabPresets: () => void;
  onOpenShortcuts: () => void;
  onOpenCustomIC: () => void;
  onNewCircuit: () => void;
  onClearCanvas: () => void;
  onSelectAll?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onDeleteSelected?: () => void;
  onResetViewport?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onSaveCircuit?: () => void;
  onExportJson?: () => void;
  onImportJson?: () => void;
  onToggleLibrary?: () => void;
  onToggleInspector?: () => void;
  clockHz: number;
  onClockHzChange: (hz: number) => void;
  componentCount: number;
  wireCount: number;
  zoom: number;
  activeTool?: InteractionTool | string;
  isTrainerPowerOn?: boolean;
  activeICCount?: number;
  activeModuleCount?: number;
  circuit?: Circuit;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  projectName,
  isDirty,
  onProjectNameChange,
  currentView,
  onViewChange,
  isRunning,
  onToggleRun,
  onStep,
  onReset,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  canCopy = true,
  canPaste = true,
  hasSelection = false,
  soundEnabled,
  onToggleSound,
  theme,
  onToggleTheme,
  currentUser,
  onOpenAuth,
  onLogout,
  onOpenSavedCircuits,
  onOpenTruthTable,
  onOpenWaveform,
  onOpenLabPresets,
  onOpenShortcuts,
  onOpenCustomIC,
  onNewCircuit,
  onClearCanvas,
  onSelectAll,
  onCopy,
  onPaste,
  onDeleteSelected,
  onResetViewport,
  onZoomIn,
  onZoomOut,
  onSaveCircuit,
  onExportJson,
  onImportJson,
  onToggleLibrary,
  onToggleInspector,
  clockHz,
  onClockHzChange,
  componentCount,
  wireCount,
  zoom,
  activeTool = 'select',
  isTrainerPowerOn = true,
  activeICCount,
  activeModuleCount = 1,
  circuit,
  children,
}) => {
  return (
    <div className="app-shell">
      {/* Top Fixed Navigation & Menu Bar */}
      <TopBar
        projectName={projectName}
        isDirty={isDirty}
        onProjectNameChange={onProjectNameChange}
        currentView={currentView}
        onViewChange={onViewChange}
        isRunning={isRunning}
        onToggleRun={onToggleRun}
        onStep={onStep}
        onReset={onReset}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
        canCopy={canCopy}
        canPaste={canPaste}
        hasSelection={hasSelection}
        soundEnabled={soundEnabled}
        onToggleSound={onToggleSound}
        theme={theme}
        onToggleTheme={onToggleTheme}
        currentUser={currentUser}
        onOpenAuth={onOpenAuth}
        onLogout={onLogout}
        onOpenSavedCircuits={onOpenSavedCircuits}
        onOpenTruthTable={onOpenTruthTable}
        onOpenWaveform={onOpenWaveform}
        onOpenLabPresets={onOpenLabPresets}
        onOpenShortcuts={onOpenShortcuts}
        onOpenCustomIC={onOpenCustomIC}
        onNewCircuit={onNewCircuit}
        onClearCanvas={onClearCanvas}
        onSelectAll={onSelectAll}
        onCopy={onCopy}
        onPaste={onPaste}
        onDeleteSelected={onDeleteSelected}
        onResetViewport={onResetViewport}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        zoom={zoom}
        onSaveCircuit={onSaveCircuit}
        onExportJson={onExportJson}
        onImportJson={onImportJson}
        onToggleLibrary={onToggleLibrary}
        onToggleInspector={onToggleInspector}
        clockHz={clockHz}
        onClockHzChange={onClockHzChange}
      />

      {/* Main Workspace (occupies 100% of remaining area, flex: 1, overflow: hidden) */}
      <MainWorkspace
        currentView={currentView}
        onViewChange={onViewChange}
        onOpenTruthTable={onOpenTruthTable}
        circuit={circuit}
        isRunning={isRunning}
      >
        {children}
      </MainWorkspace>

      {/* Bottom Fixed Status Bar */}
      <StatusBar
        isRunning={isRunning}
        clockHz={clockHz}
        componentCount={componentCount}
        wireCount={wireCount}
        zoom={zoom}
        activeTool={activeTool}
        isTrainerPowerOn={isTrainerPowerOn}
        activeICCount={activeICCount}
        activeModuleCount={activeModuleCount}
        mode={currentView}
      />
    </div>
  );
};

export default AppShell;
