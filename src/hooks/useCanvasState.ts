import { useState, useCallback } from 'react';

export function useCanvasState(initialPan = { x: 20, y: 15 }, initialZoom = 1) {
  const [zoom, setZoom] = useState<number>(initialZoom);
  const [pan, setPan] = useState<{ x: number; y: number }>(initialPan);

  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const [isAllSelected, setIsAllSelected] = useState<boolean>(false);

  const clearSelection = useCallback(() => {
    setSelectedCompId(null);
    setSelectedWireId(null);
    setIsAllSelected(false);
  }, []);

  const selectComponent = useCallback((id: string | null) => {
    setSelectedCompId(id);
    setSelectedWireId(null);
    setIsAllSelected(false);
  }, []);

  const selectWire = useCallback((id: string | null) => {
    setSelectedWireId(id);
    setSelectedCompId(null);
    setIsAllSelected(false);
  }, []);

  const selectAll = useCallback(() => {
    setIsAllSelected(true);
    setSelectedCompId(null);
    setSelectedWireId(null);
  }, []);

  const resetViewport = useCallback(() => {
    setZoom(1);
    setPan({ x: 20, y: 15 });
  }, []);

  return {
    zoom,
    setZoom,
    pan,
    setPan,
    selectedCompId,
    selectedWireId,
    isAllSelected,
    setSelectedCompId,
    setSelectedWireId,
    setIsAllSelected,
    clearSelection,
    selectComponent,
    selectWire,
    selectAll,
    resetViewport,
  };
}
