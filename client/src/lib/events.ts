
export const firePrefsUpdated = () => window.dispatchEvent(new Event("ab:prefs-updated"));
export const onPrefsUpdated = (fn: () => void) => {
  window.addEventListener("ab:prefs-updated", fn);
  return () => window.removeEventListener("ab:prefs-updated", fn);
};
