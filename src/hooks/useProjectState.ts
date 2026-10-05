import { useState, useCallback } from 'react';

export function useProjectState(initialName = 'Untitled Circuit') {
  const [projectName, setProjectName] = useState<string>(initialName);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);

  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  const markClean = useCallback(() => {
    setIsDirty(false);
    setLastSaved(Date.now());
  }, []);

  return {
    projectName,
    setProjectName,
    isDirty,
    lastSaved,
    markDirty,
    markClean,
  };
}
