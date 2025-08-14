export const LEARNING_RATE = 0.6;
export const TARGET_CHOICES = 12;
export const EPS_DEFAULT = 0.12;

export function zeros(n: number): number[] {
  return Array.from({ length: n }, () => 0);
}

export function dot(a: number[], b: number[]): number {
  if (!a || !b) {
    console.warn('dot called with undefined arrays:', { a, b });
    return 0;
  }
  let s = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    s += (a[i] || 0) * (b[i] || 0);
  }
  return s;
}

export function addInPlace(a: number[], b: number[], scale: number = 1): void {
  for (let i = 0; i < a.length; i++) {
    a[i] += scale * b[i];
  }
}

export function subtract(a: number[], b: number[]): number[] {
  if (!a || !b) {
    console.warn('subtract called with undefined arrays:', { a, b });
    return zeros(12); // Return zero vector as fallback
  }
  return a.map((v, i) => v - (b[i] || 0));
}

export function logistic(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
