'use client';

import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export interface WeightEntry {
  id: string;
  date: string;
  weightKg: number;
  notes: string;
}

interface Props {
  entries: WeightEntry[];
  startWeight?: number;
  goalWeight?: number;
  onAdd: (entry: { date: string; weightKg: number; notes: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function ProgressTracker({ entries, startWeight, goalWeight, onAdd, onDelete }: Props) {
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const first = sorted[0];

  const totalChange = latest && first ? latest.weightKg - first.weightKg : 0;
  const chartData = sorted.slice(-30).map((e) => ({
    date: formatDate(e.date),
    weight: e.weightKg,
  }));

  const handleSave = async () => {
    const kg = parseFloat(weight);
    if (!kg || kg < 20 || kg > 300) return;
    setIsSaving(true);
    try {
      const today = new Date();
      const local = new Date(today.getTime() - today.getTimezoneOffset() * 60_000);
      await onAdd({
        date: local.toISOString().split('T')[0],
        weightKg: kg,
        notes: notes.trim(),
      });
      setWeight('');
      setNotes('');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="screen space-y-5">
      <header className="animate-rise-in">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-strong">Progress</p>
        <h1 className="ink-title mt-1 text-4xl font-black leading-none text-ink">Weight tracker</h1>
        <p className="mt-2 text-sm font-bold text-muted">Log your weight to see your trend.</p>
      </header>

      {/* Log weight card */}
      <section className="surface animate-rise-in rounded-lg p-4" style={{ animationDelay: '60ms' }}>
        <h2 className="mb-3 text-base font-black text-ink">Log today</h2>
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="input-field"
              placeholder="Weight in kg"
              min={20}
              max={300}
              step={0.1}
            />
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !weight}
            className="primary-button tap-scale shrink-0 px-5"
          >
            {isSaving ? '...' : 'Save'}
          </button>
        </div>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input-field mt-3"
          placeholder="Notes (optional)"
        />
      </section>

      {/* Stats */}
      {entries.length > 0 && (
        <>
          <section className="surface animate-rise-in rounded-lg p-4" style={{ animationDelay: '110ms' }}>
            <div className="grid grid-cols-3 divide-x divide-line text-center">
              <div className="pr-3">
                <p className="text-2xl font-black text-ink">{latest?.weightKg ?? '—'}</p>
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Current kg</p>
              </div>
              <div className="px-3">
                <p className={`text-2xl font-black ${totalChange < 0 ? 'text-brand-strong' : totalChange > 0 ? 'text-danger' : 'text-ink'}`}>
                  {totalChange > 0 ? '+' : ''}{totalChange.toFixed(1)}
                </p>
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Total change</p>
              </div>
              <div className="pl-3">
                <p className="text-2xl font-black text-ink">{entries.length}</p>
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Logs</p>
              </div>
            </div>
          </section>

          {chartData.length >= 2 && (
            <section className="surface animate-rise-in rounded-lg p-4" style={{ animationDelay: '160ms' }}>
              <h2 className="mb-4 text-base font-black text-ink">Weight trend</h2>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0b6b58" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#0b6b58" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(170,185,174,0.4)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#68746c', fontWeight: 700 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#68746c', fontWeight: 700 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ background: '#fbfdf8', border: '1px solid #d4ded6', borderRadius: 8, fontSize: 12, fontWeight: 700 }}
                      formatter={(value: number) => [`${value} kg`, 'Weight']}
                    />
                    <Area type="monotone" dataKey="weight" stroke="#0b6b58" strokeWidth={2.5} fill="url(#weightGrad)" dot={{ r: 3, fill: '#0b6b58', strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-base font-black text-ink">History</h2>
            {[...entries].sort((a, b) => b.date.localeCompare(a.date)).map((entry, idx) => (
              <article
                key={entry.id}
                className="surface animate-rise-in rounded-lg p-4"
                style={{ animationDelay: `${Math.min(idx * 35, 280)}ms` }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-black text-ink">{entry.weightKg} kg</p>
                    <p className="text-xs font-bold text-muted">{formatDate(entry.date)}</p>
                    {entry.notes && <p className="mt-1 text-sm font-semibold text-ink-soft">{entry.notes}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(entry.id)}
                    disabled={deletingId === entry.id}
                    className="tap-scale grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-white text-muted"
                    aria-label="Delete entry"
                  >
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    </svg>
                  </button>
                </div>
              </article>
            ))}
          </section>
        </>
      )}

      {entries.length === 0 && (
        <div className="surface animate-rise-in rounded-lg p-5" style={{ animationDelay: '110ms' }}>
          <p className="text-lg font-black text-ink">No weight logs yet.</p>
          <p className="mt-1 text-sm font-semibold text-muted">Log your weight above to start tracking your progress.</p>
        </div>
      )}
    </div>
  );
}
