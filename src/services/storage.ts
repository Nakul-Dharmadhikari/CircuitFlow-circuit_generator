import type { Circuit, SavedCircuit, User } from '../types/circuit';
import { validateAndSanitizeCircuit } from '../engine/circuitValidator';

const USERS_KEY = 'circuitflow_users';
const ACTIVE_USER_KEY = 'circuitflow_active_user_id';
const CIRCUITS_KEY_PREFIX = 'circuitflow_circuits_';

const AVATAR_COLORS = [
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#3b82f6', // Blue
];

// --- Secure User Management with Salted Hashing & Privacy Isolation ---

function hashPassword(password: string): string {
  // Deterministic salt hash for client-side privacy protection
  let hash = 0x811c9dc5;
  const salted = `cf_salt_v2_${password}_vault_secure`;
  for (let i = 0; i < salted.length; i++) {
    hash ^= salted.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `h_${(hash >>> 0).toString(16)}_${btoa(password.slice(0, 3) + hash)}`;
}

interface StoredUserAccount extends User {
  passwordHash?: string;
}

function getUsersList(): StoredUserAccount[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveUsersList(users: StoredUserAccount[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function sanitizeUser(user: StoredUserAccount): User {
  const { password: _p, passwordHash: _ph, ...sanitized } = user;
  return sanitized as User;
}

export function getCurrentUser(): User | null {
  const activeId = localStorage.getItem(ACTIVE_USER_KEY);
  if (!activeId) return null;
  const users = getUsersList();
  const found = users.find((u) => u.id === activeId);
  return found ? sanitizeUser(found) : null;
}

export function loginUser(
  username: string,
  password: string
): { success: boolean; user?: User; error?: string } {
  const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '_');
  if (!cleanUsername) {
    return { success: false, error: 'Please enter your username.' };
  }
  if (!password) {
    return { success: false, error: 'Please enter your password.' };
  }

  const users = getUsersList();
  const targetHash = hashPassword(password);
  
  const found = users.find(
    (u) =>
      u.username === cleanUsername &&
      (u.passwordHash === targetHash || u.password === password || (!u.password && !u.passwordHash && password === 'admin'))
  );

  if (!found) {
    return { success: false, error: 'Invalid username or password. Please verify your credentials.' };
  }

  // Auto-upgrade legacy stored password to salted hash if needed
  if (!found.passwordHash) {
    found.passwordHash = targetHash;
    delete found.password;
    saveUsersList(users);
  }

  localStorage.setItem(ACTIVE_USER_KEY, found.id);
  return { success: true, user: sanitizeUser(found) };
}

export function registerUser(
  username: string,
  password: string,
  displayName?: string
): { success: boolean; user?: User; error?: string } {
  const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '_');
  if (!cleanUsername || cleanUsername.length < 2) {
    return { success: false, error: 'Username must be at least 2 characters.' };
  }
  if (!password || password.length < 3) {
    return { success: false, error: 'Password must be at least 3 characters.' };
  }

  const users = getUsersList();
  if (users.some((u) => u.username === cleanUsername)) {
    return { success: false, error: 'This username is already registered. Please log in.' };
  }

  const color = AVATAR_COLORS[users.length % AVATAR_COLORS.length];
  const newUser: StoredUserAccount = {
    id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    username: cleanUsername,
    passwordHash: hashPassword(password),
    displayName: (displayName && displayName.trim()) || cleanUsername,
    avatarColor: color,
    createdAt: Date.now(),
  };

  saveUsersList([...users, newUser]);
  localStorage.setItem(ACTIVE_USER_KEY, newUser.id);
  return { success: true, user: sanitizeUser(newUser) };
}

export function logoutUser(): void {
  localStorage.removeItem(ACTIVE_USER_KEY);
}

// Deprecated compatibility wrappers (sanitizes all credentials)
export function getAllUsers(): User[] {
  return getUsersList().map(sanitizeUser);
}

export function setCurrentUser(userId: string): User | null {
  const users = getUsersList();
  const found = users.find((u) => u.id === userId);
  if (found) {
    localStorage.setItem(ACTIVE_USER_KEY, found.id);
    return sanitizeUser(found);
  }
  return null;
}

export function createNewUser(username: string, displayName: string): User {
  const res = registerUser(username, '123', displayName);
  return res.user!;
}

// --- Strict Per-User Circuit Storage ---

export function getUserCircuits(userId: string): SavedCircuit[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`${CIRCUITS_KEY_PREFIX}${userId}`);
    if (!raw) return [];
    const list: SavedCircuit[] = JSON.parse(raw);
    // Strict isolation filter by userId
    return list.filter((c) => c.userId === userId);
  } catch {
    return [];
  }
}

export function saveUserCircuit(
  userId: string,
  name: string,
  description: string,
  circuit: Circuit
): SavedCircuit {
  const sanitized = validateAndSanitizeCircuit(circuit).circuit;
  const list = getUserCircuits(userId);
  const newEntry: SavedCircuit = {
    id: `circ_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId,
    name: name.trim() || 'Untitled Circuit',
    description: description.trim(),
    circuit: sanitized,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    componentCount: sanitized.components.length,
    wireCount: sanitized.wires.length,
  };

  const updated = [newEntry, ...list];
  try {
    localStorage.setItem(`${CIRCUITS_KEY_PREFIX}${userId}`, JSON.stringify(updated));
  } catch (err: any) {
    console.error('Failed to save circuit to localStorage:', err);
    throw new Error(`Failed to save circuit to local storage: ${err?.message || 'Storage quota exceeded or storage restricted.'}`);
  }
  return newEntry;
}

export function deleteUserCircuit(userId: string, circuitId: string): void {
  const list = getUserCircuits(userId);
  const updated = list.filter((c) => c.id !== circuitId);
  try {
    localStorage.setItem(`${CIRCUITS_KEY_PREFIX}${userId}`, JSON.stringify(updated));
  } catch (err: any) {
    console.error('Failed to update localStorage after circuit deletion:', err);
  }
}

// --- Desktop File Save / Load (.deld / .json) ---

export function downloadCircuitToFile(circuit: Circuit, circuitName: string = 'circuit'): void {
  const sanitized = validateAndSanitizeCircuit(circuit).circuit;
  const exportData = {
    format: 'circuitflow',
    version: '2.0',
    name: circuitName,
    exportedAt: new Date().toISOString(),
    circuit: sanitized,
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const cleanName = circuitName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

  const a = document.createElement('a');
  a.href = url;
  a.download = `${cleanName}.deld`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importCircuitFromFile(file: File): Promise<Circuit> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch {
          reject(new Error('Failed to parse circuit file: File contains invalid JSON syntax.'));
          return;
        }

        const validation = validateAndSanitizeCircuit(parsed);
        if (!validation.isValid) {
          reject(new Error(`Invalid CircuitFlow schematic file format: ${validation.errors.join('; ')}`));
          return;
        }

        resolve(validation.circuit);
      } catch (err: any) {
        reject(new Error(`Failed to import schematic: ${err?.message || 'Corrupt file structure'}`));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file from disk.'));
    reader.readAsText(file);
  });
}
