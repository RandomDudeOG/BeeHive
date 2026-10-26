import { auth } from '@/lib/firebase';

async function authHeaders(): Promise<HeadersInit> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Not signed in');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export async function aiCall<T>(payload: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `AI request failed (${res.status})`);
  }
  return res.json();
}

export async function aiStream(payload: Record<string, unknown>, onText: (full: string) => void) {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `AI request failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    onText(full);
  }
}
