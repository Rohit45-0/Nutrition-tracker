'use client';

import { useMemo, useState } from 'react';
import { Exercise, WorkoutCategory, WorkoutEntry } from '@/lib/types';

interface Props {
    logs: WorkoutEntry[];
    onAdd: (workout: Omit<WorkoutEntry, 'id'>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

const categories: Array<{ value: WorkoutCategory; label: string; short: string }> = [
    { value: 'strength', label: 'Strength', short: 'ST' },
    { value: 'cardio', label: 'Cardio', short: 'CR' },
    { value: 'walking', label: 'Walking', short: 'WK' },
    { value: 'mobility', label: 'Mobility', short: 'MB' },
    { value: 'custom', label: 'Custom', short: 'CU' },
];

function formatDate(dateStr: string) {
    const date = new Date(`${dateStr}T00:00:00`);
    return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function getCategoryMeta(category: WorkoutCategory) {
    return categories.find((item) => item.value === category) ?? categories[categories.length - 1];
}

function createExercise(): Exercise {
    return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: '',
        sets: 3,
        reps: 10,
        weightKg: 0,
        durationMinutes: 0,
    };
}

export default function WorkoutLog({ logs, onAdd, onDelete }: Props) {
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState('');
    const [category, setCategory] = useState<WorkoutCategory>('strength');
    const [durationMinutes, setDurationMinutes] = useState(45);
    const [notes, setNotes] = useState('');
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const totals = useMemo(() => ({
        sessions: logs.length,
        totalMinutes: logs.reduce((sum, log) => sum + log.durationMinutes, 0),
        exerciseCount: logs.reduce((sum, log) => sum + log.exercises.length, 0),
    }), [logs]);

    const resetForm = () => {
        setName('');
        setCategory('strength');
        setDurationMinutes(45);
        setNotes('');
        setExercises([]);
        setShowForm(false);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            return;
        }

        setIsSaving(true);
        try {
            const now = new Date();
            const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
            await onAdd({
                date: localNow.toISOString().slice(0, 10),
                name: name.trim(),
                category,
                durationMinutes,
                notes: notes.trim(),
                exercises: exercises
                    .map((exercise) => ({ ...exercise, name: exercise.name.trim() }))
                    .filter((exercise) => exercise.name.length > 0),
            });
            resetForm();
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

    const updateExercise = (id: string, field: keyof Exercise, value: string | number) => {
        setExercises((previous) =>
            previous.map((exercise) => (exercise.id === id ? { ...exercise, [field]: value } : exercise))
        );
    };

    const removeExercise = (id: string) => {
        setExercises((previous) => previous.filter((exercise) => exercise.id !== id));
    };

    if (showForm) {
        return (
            <div className="screen space-y-5">
                <header className="animate-rise-in flex items-center gap-3">
                    <button
                        type="button"
                        onClick={resetForm}
                        className="tap-scale grid h-10 w-10 place-items-center rounded-lg border border-line bg-white text-ink-soft"
                        aria-label="Back"
                    >
                        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </button>
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-strong">Log workout</p>
                        <h1 className="ink-title text-3xl font-black leading-none text-ink">New session</h1>
                    </div>
                </header>

                <div className="space-y-4">
                    <div>
                        <label className="mb-2 block text-sm font-black text-ink" htmlFor="workout-name">
                            Workout name
                        </label>
                        <input
                            id="workout-name"
                            type="text"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            className="input-field"
                            placeholder="Push day, morning run, evening walk"
                        />
                    </div>

                    <div>
                        <p className="mb-2 text-sm font-black text-ink">Category</p>
                        <div className="grid grid-cols-3 gap-2">
                            {categories.map((item) => (
                                <button
                                    key={item.value}
                                    type="button"
                                    onClick={() => setCategory(item.value)}
                                    className={`tap-scale rounded-lg border p-3 text-left ${category === item.value
                                        ? 'border-brand bg-brand-soft text-brand-strong'
                                        : 'border-line bg-white text-ink-soft'
                                        }`}
                                >
                                    <span className="block text-sm font-black">{item.label}</span>
                                    <span className="mt-1 block text-xs font-bold text-muted">{item.short}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-black text-ink" htmlFor="duration">
                            Duration (minutes)
                        </label>
                        <input
                            id="duration"
                            type="number"
                            value={durationMinutes}
                            onChange={(event) => setDurationMinutes(Math.max(1, parseInt(event.target.value, 10) || 1))}
                            className="input-field"
                            min={1}
                        />
                    </div>

                    {(category === 'strength' || category === 'custom') && (
                        <div>
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <p className="text-sm font-black text-ink">Exercises</p>
                                <button
                                    type="button"
                                    onClick={() => setExercises((previous) => [...previous, createExercise()])}
                                    className="tap-scale rounded-lg bg-brand-soft px-3 py-2 text-xs font-black text-brand-strong"
                                >
                                    Add exercise
                                </button>
                            </div>
                            <div className="space-y-3">
                                {exercises.map((exercise) => (
                                    <div key={exercise.id} className="surface rounded-lg p-3">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={exercise.name}
                                                onChange={(event) => updateExercise(exercise.id, 'name', event.target.value)}
                                                className="input-field flex-1 py-2 text-sm"
                                                placeholder="Exercise name"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeExercise(exercise.id)}
                                                className="tap-scale grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line bg-white text-muted"
                                                aria-label="Remove exercise"
                                            >
                                                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                                    <path d="M18 6 6 18M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                        <div className="mt-2 grid grid-cols-3 gap-2">
                                            <SmallNumberField
                                                label="Sets"
                                                value={exercise.sets}
                                                onChange={(value) => updateExercise(exercise.id, 'sets', value)}
                                            />
                                            <SmallNumberField
                                                label="Reps"
                                                value={exercise.reps}
                                                onChange={(value) => updateExercise(exercise.id, 'reps', value)}
                                            />
                                            <SmallNumberField
                                                label="kg"
                                                value={exercise.weightKg}
                                                step={0.5}
                                                onChange={(value) => updateExercise(exercise.id, 'weightKg', value)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="mb-2 block text-sm font-black text-ink" htmlFor="workout-notes">
                            Notes (optional)
                        </label>
                        <textarea
                            id="workout-notes"
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            className="input-field min-h-[80px] resize-none"
                            placeholder="How did it feel today?"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() => { void handleSave(); }}
                        disabled={isSaving || !name.trim()}
                        className="primary-button tap-scale w-full"
                    >
                        {isSaving ? 'Saving workout...' : 'Save workout'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="screen space-y-5">
            <header className="animate-rise-in flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-strong">Workouts</p>
                    <h1 className="ink-title mt-1 text-4xl font-black leading-none text-ink">Training log</h1>
                    <p className="mt-2 text-sm font-bold text-muted">Track sessions, time, and exercises.</p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="primary-button tap-scale shrink-0 px-4 text-sm"
                >
                    Log session
                </button>
            </header>

            {logs.length === 0 ? (
                <section className="surface animate-rise-in rounded-lg p-5" style={{ animationDelay: '70ms' }}>
                    <p className="text-lg font-black text-ink">No workouts yet.</p>
                    <p className="mt-1 text-sm font-semibold text-muted">Log your first session to start tracking your training.</p>
                    <button
                        type="button"
                        onClick={() => setShowForm(true)}
                        className="primary-button tap-scale mt-4 w-full"
                    >
                        Log first workout
                    </button>
                </section>
            ) : (
                <>
                    <section className="surface animate-rise-in rounded-lg p-4" style={{ animationDelay: '70ms' }}>
                        <h2 className="mb-3 text-base font-black text-ink">This month</h2>
                        <div className="grid grid-cols-3 divide-x divide-line border-y border-line py-3 text-center">
                            <StatMetric label="Sessions" value={totals.sessions} />
                            <StatMetric label="Total time" value={`${Math.round(totals.totalMinutes / 60)}h`} />
                            <StatMetric label="Exercises" value={totals.exerciseCount} />
                        </div>
                    </section>

                    <section className="space-y-3">
                        {logs.map((log, index) => {
                            const categoryMeta = getCategoryMeta(log.category);
                            return (
                                <article
                                    key={log.id}
                                    className="surface animate-rise-in rounded-lg p-4"
                                    style={{ animationDelay: `${Math.min(index * 40, 300)}ms` }}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3">
                                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-sm font-black text-brand-strong">
                                                {categoryMeta.short}
                                            </span>
                                            <div>
                                                <h3 className="text-base font-black text-ink">{log.name}</h3>
                                                <p className="text-xs font-bold text-muted">
                                                    {formatDate(log.date)} | {categoryMeta.label} | {log.durationMinutes} min
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => { void handleDelete(log.id); }}
                                            disabled={deletingId === log.id}
                                            className="tap-scale grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-white text-muted"
                                            aria-label="Delete workout"
                                        >
                                            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                            </svg>
                                        </button>
                                    </div>

                                    {log.exercises.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {log.exercises.map((exercise) => (
                                                <span key={exercise.id} className="rounded-md border border-line bg-white px-2.5 py-1 text-xs font-bold text-ink-soft">
                                                    {exercise.name} {exercise.sets}x{exercise.reps}{exercise.weightKg > 0 ? ` @ ${exercise.weightKg}kg` : ''}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {log.notes && (
                                        <p className="mt-3 text-sm font-semibold text-muted">{log.notes}</p>
                                    )}
                                </article>
                            );
                        })}
                    </section>
                </>
            )}
        </div>
    );
}

function SmallNumberField({
    label,
    value,
    onChange,
    step = 1,
}: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    step?: number;
}) {
    return (
        <div>
            <label className="mb-1 block text-[10px] font-black uppercase tracking-wide text-muted">{label}</label>
            <input
                type="number"
                value={value}
                onChange={(event) => onChange(parseFloat(event.target.value) || 0)}
                className="input-field py-2 text-sm"
                min={0}
                step={step}
            />
        </div>
    );
}

function StatMetric({ label, value }: { label: string; value: number | string }) {
    return (
        <div>
            <p className="text-2xl font-black text-brand-strong">{value}</p>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</p>
        </div>
    );
}
