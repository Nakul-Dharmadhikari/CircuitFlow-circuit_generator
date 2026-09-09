import type { CustomICDefinition } from '../types/circuit';

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
  } catch (err) {
    console.error('Failed to save custom IC:', err);
    return ic;
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
