'use client';

import { useEffect, useState } from 'react';

type User = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
};

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  try { return JSON.stringify(e); } catch { return String(e); }
}
function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}
function hasError(x: unknown): x is { error: unknown } {
  return isRecord(x) && 'error' in x;
}

export default function HomePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function loadUsers() {
    setErr(null);
    try {
      const res = await fetch(`${API}/users`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`GET /users failed: ${res.status}`);
      const data = (await res.json()) as User[];
      setUsers(data);
    } catch (e) {
      setErr(errMsg(e));
    }
  }

  useEffect(() => { void loadUsers(); }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`${API}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password }),
      });

      const j: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = hasError(j) ? JSON.stringify(j.error) : `POST /users failed: ${res.status}`;
        throw new Error(msg);
      }

      setEmail(''); setName(''); setPassword('');
      await loadUsers();
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">Prosperity Compass – Users</h1>
          <p className="text-sm text-gray-600">Demo UI calling your Express + Prisma API</p>
        </header>

        <form onSubmit={onCreate} className="grid gap-3 p-4 border rounded-xl">
          <div className="grid gap-1">
            <label className="text-sm font-medium">Email</label>
            <input className="border rounded-md px-3 py-2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium">Name (optional)</label>
            <input className="border rounded-md px-3 py-2" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Malik" />
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium">Password (temp, will be hashed later)</label>
            <input className="border rounded-md px-3 py-2" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password123" />
          </div>

          <button type="submit" disabled={loading} className="bg-black text-white rounded-md px-4 py-2 disabled:opacity-50">
            {loading ? 'Creating...' : 'Create User'}
          </button>

          {err && <p className="text-sm text-red-600">Error: {err}</p>}
        </form>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Users</h2>
          <ul className="space-y-2">
            {users.length === 0 && <li className="text-sm text-gray-600">No users yet.</li>}
            {users.map((u) => (
              <li key={u.id} className="border rounded-lg p-3">
                <div className="font-medium">{u.email}</div>
                <div className="text-sm text-gray-600">
                  {u.name || '—'} · {new Date(u.createdAt).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
