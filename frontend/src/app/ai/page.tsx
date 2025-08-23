'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';

type Msg = { role: 'user' | 'ai'; text: string };

export default function AIPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg: Msg = { role: 'user', text: input.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);
    setErr(null);
    try {
      const data = await apiFetch<{ reply: string }>('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: userMsg.text }),
      }, false); // no auth required
      setMessages((m) => [...m, { role: 'ai', text: data.reply }]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Prosperity Coach (AI)</h1>
        <p className="text-sm text-gray-600">Ask for quick money tips or explanations.</p>
      </header>

      <div className="border rounded-xl p-4 space-y-3 bg-white">
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {messages.length === 0 && <p className="text-sm text-gray-500">Try: “What’s a 50/30/20 budget?”</p>}
          {messages.map((m, i) => (
            <div key={i} className={`p-3 rounded-lg ${m.role === 'user' ? 'bg-gray-100' : 'bg-blue-50'}`}>
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">{m.role}</div>
              <div>{m.text}</div>
            </div>
          ))}
          {loading && <div className="text-sm text-gray-500">Thinking…</div>}
        </div>

        <form onSubmit={send} className="flex gap-2">
          <input
            className="flex-1 border rounded-md px-3 py-2"
            placeholder="Type your question…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-black text-white rounded-md disabled:opacity-50"
          >
            Send
          </button>
        </form>

        {err && <p className="text-sm text-red-600">Error: {err}</p>}
      </div>
    </main>
  );
}
