'use client';

import { useEffect, useMemo, useState } from 'react';

type User = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
};

type MeResponse = { user: User | null };

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const TOKEN_KEY = 'pc_token';

export default function HomePage() {
  // ----- auth state -----
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [authEmail, setAuthEmail] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<User | null>(null);

  // ----- users list (demo) -----
  const [users, setUsers] = useState<User[]>([]);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersErr, setUsersErr] = useState<string | null>(null);

  // helper to attach Authorization when we have a token
  const authHeaders = useMemo(() => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }, [token]);

  // Load token on first mount
  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (t) setToken(t);
  }, []);

  // Whenever token changes, try fetch /me
  useEffect(() => {
    if (!token) {
      setMe(null);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API}/me`, { headers: authHeaders, cache: 'no-store' });
        if (!res.ok) throw new Error(`GET /me failed: ${res.status}`);
        const data: MeResponse = await res.json();
        setMe(data.user);
      } catch (e: any) {
        setMe(null);
        console.error(e);
      }
    })();
  }, [token, authHeaders]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch(`${API}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, name: authName || undefined, password: authPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ? JSON.stringify(data.error) : `Signup failed: ${res.status}`);
      const t = data.token as string;
      localStorage.setItem(TOKEN_KEY, t);
      setToken(t);
      setAuthEmail('');
      setAuthName('');
      setAuthPassword('');
    } catch (e: any) {
      setAuthError(e.message || 'Signup failed');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ? JSON.stringify(data.error) : `Login failed: ${res.status}`);
      const t = data.token as string;
      localStorage.setItem(TOKEN_KEY, t);
      setToken(t);
      setAuthEmail('');
      setAuthPassword('');
    } catch (e: any) {
      setAuthError(e.message || 'Login failed');
    } finally {
      setAuthLoading(false);
    }
  }

  function signOut() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setMe(null);
  }

  async function loadUsers() {
    setUsersErr(null);
    setUsersLoading(true);
    try {
      const res = await fetch(`${API}/users`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`GET /users failed: ${res.status}`);
      const data = await res.json();
      setUsers(data);
    } catch (e: any) {
      setUsersErr(e.message || 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setUsersErr(null);
    setUsersLoading(true);
    try {
      const res = await fetch(`${API}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, name: userName || undefined, password: userPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ? JSON.stringify(data.error) : `POST /users failed: ${res.status}`);
      setUserEmail('');
      setUserName('');
      setUserPassword('');
      await loadUsers();
    } catch (e: any) {
      setUsersErr(e.message || 'Failed to create user');
    } finally {
      setUsersLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">Prosperity Compass – Users & Auth</h1>
          <p className="text-sm text-gray-600">Auth: signup/login + /me (JWT) • Users: demo list & create</p>
        </header>

        {/* AUTH CARD */}
        <section className="p-4 border rounded-xl space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <button
              className={`px-3 py-1 rounded-md border ${authMode === 'signup' ? 'bg-black text-white' : ''}`}
              onClick={() => setAuthMode('signup')}
            >
              Sign up
            </button>
            <button
              className={`px-3 py-1 rounded-md border ${authMode === 'login' ? 'bg-black text-white' : ''}`}
              onClick={() => setAuthMode('login')}
            >
              Log in
            </button>
            <div className="ml-auto text-gray-600">
              {me ? (
                <span>Signed in as <strong>{me.email}</strong></span>
              ) : (
                <span>Not signed in</span>
              )}
            </div>
          </div>

          <form onSubmit={authMode === 'signup' ? handleSignup : handleLogin} className="grid gap-3">
            <div className="grid gap-1">
              <label className="text-sm font-medium">Email</label>
              <input
                className="border rounded-md px-3 py-2"
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            {authMode === 'signup' && (
              <div className="grid gap-1">
                <label className="text-sm font-medium">Name (optional)</label>
                <input
                  className="border rounded-md px-3 py-2"
                  type="text"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder="Malik"
                />
              </div>
            )}

            <div className="grid gap-1">
              <label className="text-sm font-medium">Password</label>
              <input
                className="border rounded-md px-3 py-2"
                type="password"
                minLength={6}
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="password123"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={authLoading}
                className="bg-black text-white rounded-md px-4 py-2 disabled:opacity-50"
              >
                {authMode === 'signup' ? (authLoading ? 'Signing up…' : 'Sign up') : (authLoading ? 'Logging in…' : 'Log in')}
              </button>

              {me && (
                <button
                  type="button"
                  onClick={signOut}
                  className="border rounded-md px-3 py-2"
                >
                  Sign out
                </button>
              )}
            </div>

            {authError && <p className="text-sm text-red-600">Error: {authError}</p>}
          </form>

          {me && (
            <div className="text-sm text-gray-700">
              <div className="font-semibold">/me</div>
              <pre className="text-xs bg-gray-50 p-2 rounded-md overflow-auto">
                {JSON.stringify(me, null, 2)}
              </pre>
            </div>
          )}
        </section>

        {/* USERS CARD */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Users</h2>

          <form onSubmit={createUser} className="grid gap-3 p-4 border rounded-xl">
            <div className="grid gap-1">
              <label className="text-sm font-medium">Email</label>
              <input
                className="border rounded-md px-3 py-2"
                type="email"
                required
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div className="grid gap-1">
              <label className="text-sm font-medium">Name (optional)</label>
              <input
                className="border rounded-md px-3 py-2"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Display name"
              />
            </div>

            <div className="grid gap-1">
              <label className="text-sm font-medium">Password (temp, will be hashed)</label>
              <input
                className="border rounded-md px-3 py-2"
                type="password"
                minLength={6}
                required
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                placeholder="password123"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={usersLoading}
                className="bg-black text-white rounded-md px-4 py-2 disabled:opacity-50"
              >
                {usersLoading ? 'Creating…' : 'Create User'}
              </button>
              <button
                type="button"
                onClick={loadUsers}
                className="border rounded-md px-3 py-2"
              >
                Refresh
              </button>
            </div>

            {usersErr && <p className="text-sm text-red-600">Error: {usersErr}</p>}
          </form>

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
