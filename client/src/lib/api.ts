
import { getSID } from "./session";

export async function apiGet<T = any>(url: string): Promise<T> {
  const sid = getSID();
  const res = await fetch(url.includes("?") ? `${url}&sid=${sid}` : `${url}?sid=${sid}`, {
    headers: { "x-session-id": sid },
  });
  return res.json();
}

export async function apiPost<T = any>(url: string, body: any): Promise<T> {
  const sid = getSID();
  const res = await fetch(url.includes("?") ? `${url}&sid=${sid}` : `${url}?sid=${sid}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-session-id": sid },
    body: JSON.stringify(body),
  });
  return res.json();
}
