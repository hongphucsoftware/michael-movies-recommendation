
const K_W = "paf.w";
const K_R = "paf.rounds";

export function loadW(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(K_W) || "{}"); }
  catch { return {}; }
}

export function saveW(w: Record<string, number>) {
  localStorage.setItem(K_W, JSON.stringify(w));
}

export function loadRounds(): number {
  return Number(localStorage.getItem(K_R) || 0);
}

export function saveRounds(r: number) {
  localStorage.setItem(K_R, String(r));
}

export function clearModel() { 
  localStorage.removeItem(K_W); 
  localStorage.removeItem(K_R); 
}
