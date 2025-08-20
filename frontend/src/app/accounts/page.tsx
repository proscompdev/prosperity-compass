'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type Account = {
  id: string;
  name: string;
  institution: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
  createdAt: string;
};

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  try { return JSON.stringify(e); } catch { return String(e); }
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('Seed Bank');
  const [type, setType] = useState('depository');
  const [subtype, setSubtype] = useState('checking');
  const [mask, setMask] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function loadAccounts() {
    setErr(null);
    try {
      const data = await apiFetch<Account[]>('/accounts', {}, true);
      setAccounts(data);
    } catch (e) {
      setErr(errMsg(e));
    }
  }

  useEffect(() => { loadAccounts(); }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      await apiFetch('/accounts', {
        method: 'POST',
        body: JSON.stringify({ name, institution, type, subtype, mask }),
      }, true);
      setName(''); setInstitution('Seed Bank'); setType('depository'); setSubtype('checking'); setMask('');
      await loadAccounts();
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Accounts</h1>
        <p className="text-sm text-gray-600">Create and view your accounts (requires being signed in)</p>
      </header>

      <form onSubmit={onCreate} className="grid gap-3 p-4 border rounded-xl">
        <div className="grid gap-1">
          <label className="text-sm font-medium">Name</label>
          <input className="border rounded-md px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div className="grid gap-1">
          <label className="text-sm font-medium">Institution</label>
          <input className="border rounded-md px-3 py-2" value={institution} onChange={(e) => setInstitution(e.target.value)} />
        </div>

        <div className="grid gap-1">
          <label className="text-sm font-medium">Type</label>
          <input className="border rounded-md px-3 py-2" value={type} onChange={(e) => setType(e.target.value)} required />
        </div>

        <div className="grid gap-1">
          <label className="text-sm font-medium">Subtype</label>
          <input className="border rounded-md px-3 py-2" value={subtype} onChange={(e) => setSubtype(e.target.value)} />
        </div>

        <div className="grid gap-1">
          <label className="text-sm font-medium">Mask (last 4)</label>
          <input className="border rounded-md px-3 py-2" value={mask} onChange={(e) => setMask(e.target.value)} />
        </div>

        <button type="submit" disabled={loading} className="bg-black text-white rounded-md px-4 py-2 disabled:opacity-50">
          {loading ? 'Creating…' : 'Create Account'}
        </button>

        {err && <p className="text-sm text-red-600">Error: {err}</p>}
      </form>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Your Accounts</h2>
        <ul className="space-y-2">
          {accounts.length === 0 && <li className="text-sm text-gray-600">No accounts yet.</li>}
          {accounts.map((a) => (
            <li key={a.id} className="border rounded-lg p-3">
              <div className="font-medium">{a.name} {a.mask ? <span className="text-gray-500">••••{a.mask}</span> : null}</div>
              <div className="text-sm text-gray-600">{a.institution || '—'} · {a.type}{a.subtype ? ` / ${a.subtype}` : ''}</div>
              <div className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleString()}</div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
