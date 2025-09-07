
import { getSID } from "./session";

const API_BASE = "/api";

export async function apiGet<T = any>(endpoint: string): Promise<T> {
  const sid = getSID();
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url.includes("?") ? `${url}&sid=${sid}` : `${url}?sid=${sid}`, {
    headers: { "x-session-id": sid },
    credentials: 'include'
  });
  
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }
  
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('Invalid JSON response:', text);
    throw new Error('Server returned invalid JSON');
  }
}

export async function apiPost<T = any>(endpoint: string, body: any): Promise<T> {
  const sid = getSID();
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url.includes("?") ? `${url}&sid=${sid}` : `${url}?sid=${sid}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-session-id": sid },
    body: JSON.stringify(body),
    credentials: 'include'
  });
  
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }
  
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('Invalid JSON response:', text);
    throw new Error('Server returned invalid JSON');
  }
}
