
import { getSID } from './session';

export async function apiGet<T = any>(url: string): Promise<T> {
  const sid = getSID();
  const sep = url.includes('?') ? '&' : '?';
  const res = await fetch(`${url}${sep}sid=${sid}&t=${Date.now()}`, {
    headers: { 
      'x-session-id': sid, 
      'Cache-Control': 'no-store' 
    },
    cache: 'no-store',
  });
  return res.json();
}

export async function apiPost<T = any>(url: string, body: any): Promise<T> {
  const sid = getSID();
  const sep = url.includes('?') ? '&' : '?';
  const res = await fetch(`${url}${sep}sid=${sid}&t=${Date.now()}`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      'x-session-id': sid, 
      'Cache-Control': 'no-store' 
    },
    cache: 'no-store',
    body: JSON.stringify(body),
  });
  return res.json();
}
