import type { CustomICDefinition } from '../types/circuit';
import { validateCustomICJSON } from '../utils/customIcValidator';

const CUSTOM_ICS_KEY = 'circuitflow_custom_ics';

/**
 * Get all custom ICs for a user (or guest)
 */
export function getUserCustomICs(userId: string): CustomICDefinition[] {
  try {
    const raw = localStorage.getItem(CUSTOM_ICS_KEY);
    if (!raw) return [];
    const allICs: CustomICDefinition[] = JSON.parse(raw);
    if (!Array.isArray(allICs)) return [];
    return allICs.filter((ic) => ic.userId === userId || ic.userId === 'guest' || !ic.userId);
  } catch {
    return [];
  }
}

/**
 * Save a custom IC definition
 */
export function saveUserCustomIC(ic: CustomICDefinition): CustomICDefinition {
  try {
    const raw = localStorage.getItem(CUSTOM_ICS_KEY);
    const allICs: CustomICDefinition[] = raw ? JSON.parse(raw) : [];
    const index = allICs.findIndex((item) => item.id === ic.id);

    const updatedIC: CustomICDefinition = {
      ...ic,
      updatedAt: Date.now(),
    };

    if (index >= 0) {
      allICs[index] = updatedIC;
    } else {
      allICs.unshift(updatedIC);
    }

    localStorage.setItem(CUSTOM_ICS_KEY, JSON.stringify(allICs));
    return updatedIC;
  } catch (err: any) {
    console.error('Failed to save custom IC:', err);
    throw new Error(`Failed to save Custom IC to local storage: ${err?.message || 'Storage error'}`);
  }
}

/**
 * Delete a custom IC
 */
export function deleteUserCustomIC(id: string): boolean {
  try {
    const raw = localStorage.getItem(CUSTOM_ICS_KEY);
    if (!raw) return false;
    const allICs: CustomICDefinition[] = JSON.parse(raw);
    const filtered = allICs.filter((ic) => ic.id !== id);
    localStorage.setItem(CUSTOM_ICS_KEY, JSON.stringify(filtered));
    return true;
  } catch {
    return false;
  }
}

/**
 * Export a custom IC definition as a downloadable JSON file
 */
export function downloadCustomICJSON(ic: CustomICDefinition): void {
  const jsonStr = JSON.stringify(ic, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${ic.partNumber || ic.code || 'custom_ic'}_definition.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Load and validate a custom IC definition from a JSON string
 */
export function loadCustomICFromJSON(jsonStr: string): {
  success: boolean;
  ic?: CustomICDefinition;
  error?: string;
} {
  const result = validateCustomICJSON(jsonStr);
  if (!result.valid) {
    return { success: false, error: result.error || 'Invalid Custom IC JSON format' };
  }
  return { success: true, ic: result.ic };
}
