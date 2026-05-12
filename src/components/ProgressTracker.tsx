'use client';

import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { WeightEntry } from '@/lib/types';

interface Props {
    entries: WeightEntry[];
    startWeight?: number;
    onAdd: (entry: Omit<WeightEntry, 'id'>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

function formatDate(dateStr: string) {
    const date = new Date(`${dateStr}T00:00:00`);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function ProgressTracker({ entries, startWeight, onAdd, onDelete }: Props) {
    const [weight, setWeight] = useState('');
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const sorted = useMemo(() => [...entries].sort((a, b) => a.date.localeCompare(b.date)), [entries]);
    const latest = sorted[sorted.length - 1];
    const firstWeight = sorted[0]?.weightKg ?? startWeight ?? 0;
    const totalChange = latest ? latest.weightKg - firstWeight : 0;
    const chartData = sorted.slice(-30).map((entry) => ({
        date: formatDate(entry.date),
        weight: entry.weightKg,
    }));

    const handleSave = async () => {
        const weightKg = parseFloat(weight);
        if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 300) {
            return;
        }

        setIsSaving(true);
        try {
            const now = new Date();
            const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
            await onAdd({
                date: localNow.toISOString().slice(0, 10),
                weightKg,
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
                <p className="mt-2 text-sm font-bold text-muted">Log your weight to watch the trend over time.</p>
            </header>

            <section className="surface animate-rise-in rounded-lg p-4" style={{ animationDelay: '60ms' }}>
                <h2 className="mb-3 text-base font-black text-ink">Log today</h2>
                <div className="flex gap-3">
                    <input
                        type="number"
                        value={weight}
                        onChange={(event) => setWeight(event.target.value)}
                        className="input-field flex-1"
                        placeholder="Weight in kg"
                        min={20}
                        max={300}
                        step={0.1}
                    />
                    <button
                        type="button"
                        onClick={() => { void handleSave(); }}
                        disabled={isSaving || !weight}
                        className="primary-button tap-scale shrink-0 px-5"
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
                <input
                    type="text"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className="input-field mt-3"
                    placeholder="Notes (optional)"
                />
            </section>

            {entries.length > 0 ? (
                <>
                    <section className="surface animate-rise-in rounded-lg p-4" style={{ animationDelay: '110ms' }}>
                        <div className="grid grid-cols-3 divide-x divide-line text-center">
                            <StatCell label="Current kg" value={latest?.weightKg ?? '--'} className="text-ink" />
                            <StatCell
                                label="Total change"
                                value={`${totalChange > 0 ? '+' : ''}${totalChange.toFixed(1)}`}
                                className={totalChange < 0 ? 'text-brand-strong' : totalChange > 0 ? 'text-danger' : 'text-ink'}
                            />
                            <StatCell label="Logs" value={entries.length} className="text-ink" />
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
                        {[...entries].sort((a, b) => b.date.localeCompare(a.date)).map((entry, index) => (
                            <article
                                key={entry.id}
                                className="surface animate-rise-in rounded-lg p-4"
                                style={{ animationDelay: `${Math.min(index * 35, 280)}ms` }}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-base font-black text-ink">{entry.weightKg} kg</p>
                                        <p className="text-xs font-bold text-muted">{formatDate(entry.date)}</p>
                                        {entry.notes && <p className="mt-1 text-sm font-semibold text-ink-soft">{entry.notes}</p>}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { void handleDelete(entry.id); }}
                                        disabled={deletingId === entry.id}
                                        className="tap-scale grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-white text-muted"
                                        aria-label="Delete weight entry"
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
            ) : (
                <section className="surface animate-rise-in rounded-lg p-5" style={{ animationDelay: '110ms' }}>
                    <p className="text-lg font-black text-ink">No weight logs yet.</p>
                    <p className="mt-1 text-sm font-semibold text-muted">Log your weight above to start tracking your progress.</p>
                </section>
            )}
        </div>
    );
}

function StatCell({
    label,
    value,
    className,
}: {
    label: string;
    value: number | string;
    className: string;
}) {
    return (
        <div className="px-2">
            <p className={`text-2xl font-black ${className}`}>{value}</p>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</p>
        </div>
    );
}
