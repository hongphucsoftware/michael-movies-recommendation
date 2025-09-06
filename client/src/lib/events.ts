// Global event system for preference updates
type PrefsUpdatedListener = (freshRecs?: any[]) => void;

let listeners: PrefsUpdatedListener[] = [];

export function onPrefsUpdated(callback: PrefsUpdatedListener): () => void {
  listeners.push(callback);

  // Return cleanup function
  return () => {
    listeners = listeners.filter(l => l !== callback);
  };
}

export function dispatchPrefsUpdated(freshRecs?: any[]): void {
  listeners.forEach(listener => listener(freshRecs));
}

// Alias for backwards compatibility
export const firePrefsUpdated = dispatchPrefsUpdated;