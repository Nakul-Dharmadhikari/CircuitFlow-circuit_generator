import { useState, useCallback } from 'react';
import type { Circuit, LogicValue } from '../types/circuit';
import { soundFx } from '../audio/soundEffects';

export interface WaveformRecord {
  timestamp: number;
  values: Record<string, LogicValue>;
}

export function useSimulationState() {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [clockHz, setClockHz] = useState<number>(1);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [waveformHistory, setWaveformHistory] = useState<WaveformRecord[]>([]);

  const handleToggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      soundFx.setEnabled(next);
      return next;
    });
  }, []);

  const recordWaveformSample = useCallback((c: Circuit) => {
    const sampleValues: Record<string, LogicValue> = {};
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

  const clearWaveformHistory = useCallback(() => {
    setWaveformHistory([]);
  }, []);

  return {
    isRunning,
    setIsRunning,
    clockHz,
    setClockHz,
    soundEnabled,
    setSoundEnabled,
    toggleSound: handleToggleSound,
    waveformHistory,
    recordWaveformSample,
    clearWaveformHistory,
  };
}
