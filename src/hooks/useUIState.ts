import { useState, useEffect, useCallback } from 'react';

export type WorkbenchView = 'hardware' | 'circuit' | 'analysis' | 'landing';
export type InteractionTool = 'wire' | 'move' | 'delete';

export interface ModalStates {
  waveform: boolean;
  truthTable: boolean;
  presets: boolean;
  shortcuts: boolean;
  auth: boolean;
  savedCircuits: boolean;
  customIC: boolean;
  componentLibrary: boolean;
  pickerBaseIndex: number | null;
}

export function useUIState() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('circuitflow_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('circuitflow_theme', theme);
  }, [theme]);

  const [currentView, setCurrentView] = useState<WorkbenchView>('landing');
  const [activeTool, setActiveTool] = useState<InteractionTool>('wire');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [modals, setModals] = useState<ModalStates>({
    waveform: false,
    truthTable: false,
    presets: false,
    shortcuts: false,
    auth: false,
    savedCircuits: false,
    customIC: false,
    componentLibrary: false,
    pickerBaseIndex: null,
  });

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

  const openModal = useCallback((name: keyof Omit<ModalStates, 'pickerBaseIndex'>) => {
    setModals((prev) => ({ ...prev, [name]: true }));
  }, []);

  const closeModal = useCallback((name: keyof Omit<ModalStates, 'pickerBaseIndex'>) => {
    setModals((prev) => ({ ...prev, [name]: false }));
  }, []);

  const toggleModal = useCallback((name: keyof Omit<ModalStates, 'pickerBaseIndex'>) => {
    setModals((prev) => ({ ...prev, [name]: !prev[name] }));
  }, []);

  const setPickerBaseIndex = useCallback((index: number | null) => {
    setModals((prev) => ({ ...prev, pickerBaseIndex: index }));
  }, []);

  const closeAllModals = useCallback(() => {
    setModals({
      waveform: false,
      truthTable: false,
      presets: false,
      shortcuts: false,
      auth: false,
      savedCircuits: false,
      customIC: false,
      componentLibrary: false,
      pickerBaseIndex: null,
    });
  }, []);

  return {
    theme,
    setTheme,
    currentView,
    setCurrentView,
    activeTool,
    setActiveTool,
    toastMessage,
    showToast,
    modals,
    openModal,
    closeModal,
    toggleModal,
    setPickerBaseIndex,
    closeAllModals,
  };
}
