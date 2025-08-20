'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type Account = { id: string; name: string; mask: string | null; };
type Transaction = {
  id: string;
  accountId: string;
  postedAt: string;
  pending: boolean;
  amount: string;   // Prisma Decimal as string
  currency: string;
  merchant: string | null;
  category: string | null;
  note: string | null;
};

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  try { return JSON.stringify(e); } catch { return String(e); }
}

export default function TransactionsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<string>('');
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [postedAt, setPostedAt] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [merchant, setMerchant] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [note, setNote] = useState<string>('');

  const loadAccounts = useCallback(async () => {
    try {
      const data = await apiFetch<Account[]>('/accounts', {}, true);
      setAccounts(data);
      if (!accountId && data.length) setAccountId(data[0].id);
    } catch { /* handled elsewhere */ }
  }, [accountId]);

  const loadTxs = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const q = accountId ? `?accountId=${encodeURIComponent(accountId)}` : '';
      const data = await apiFetch<Transaction[]>(`/transactions${q}`, {}, true);
      setTxs(data);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => { void loadAccounts(); }, [loadAccounts]);
  useEffect(() => { if (accountId) void loadTxs(); }, [accountId, loadTxs]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!accountId) { setErr('Pick an account first'); return; }
    setLoading(true);
    setErr(null);
    try {
      await apiFetch('/transactions', {
        method: 'POST',
        body: JSON.stringify({
          accountId,
          postedAt: postedAt || new Date().toISOString().slice(0,10),
          amount: Number(amount),
          merchant: merchant || undefined,
          category: category || undefined,
          note: note || undefined,
        }),
      }, true);
      setPostedAt(''); setAmount(''); setMerchant(''); setCategory(''); setNote('');
      await loadTxs();
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Transactions</h1>
        <p className="text-sm text-gray-600">List, filter by account, and create transactions</p>
      </header>

      <div className="grid gap-3 p-4 border rounded-xl">
        <div className="grid gap-1">
          <label className="text-sm font-medium">Account</label>
          <select className="border rounded-md px-3 py-2" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.length === 0 && <option value="">No accounts found</option>}
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}{a.mask ? ` ••••${a.mask}` : ''}</option>
            ))}
          </select>
        </div>
        <button type="button" onClick={() => void loadTxs()} className="border rounded-md px-3 py-2 w-fit">Refresh</button>
      </div>

      <form onSubmit={onCreate} className="grid gap-3 p-4 border rounded-xl">
        <div className="grid gap-1">
          <label className="text-sm font-medium">Date</label>
          <input className="border rounded-md px-3 py-2" type="date" value={postedAt} onChange={(e) => setPostedAt(e.target.value)} />
        </div>

        <div className="grid gap-1">
          <label className="text-sm font-medium">Amount (negative = spend)</label>
          <input className="border rounded-md px-3 py-2" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>

        <div className="grid gap-1">
          <label className="text-sm font-medium">Merchant</label>
          <input className="border rounded-md px-3 py-2" value={merchant} onChange={(e) => setMerchant(e.target.value)} />
        </div>

        <div className="grid gap-1">
          <label className="text-sm font-medium">Category</label>
          <input className="border rounded-md px-3 py-2" value={category} onChange={(e) => setCategory(e.target.value)} />
        </div>

        <div className="grid gap-1">
          <label className="text-sm font-medium">Note</label>
          <input className="border rounded-md px-3 py-2" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <button type="submit" disabled={loading} className="bg-black text-white rounded-md px-4 py-2 disabled:opacity-50">
          {loading ? 'Creating…' : 'Add Transaction'}
        </button>

        {err && <p className="text-sm text-red-600">Error: {err}</p>}
      </form>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Recent Transactions</h2>
        {loading && <p className="text-sm text-gray-600">Loading…</p>}
        <ul className="space-y-2">
          {txs.length === 0 && <li className="text-sm text-gray-600">No transactions yet.</li>}
          {txs.map((t) => (
            <li key={t.id} className="border rounded-lg p-3 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="font-medium">{t.merchant || '—'}</div>
                <div className="text-sm text-gray-600">
                  {t.category || 'Uncategorized'} · {new Date(t.postedAt).toLocaleDateString()}
                </div>
                {t.note && <div className="text-xs text-gray-500">{t.note}</div>}
              </div>
              <div className={`font-semibold ${t.amount.startsWith('-') ? 'text-red-600' : 'text-green-600'}`}>
                {Number(t.amount).toLocaleString(undefined, { style: 'currency', currency: t.currency || 'USD' })}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
