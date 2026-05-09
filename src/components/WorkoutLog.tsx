'use client';

import { useState } from 'react';

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weightKg: number;
  durationMinutes: number;
}

export interface WorkoutEntry {
  id: string;
  date: string;
  name: string;
  category: 'strength' | 'cardio' | 'walking' | 'mobility' | 'custom';
  durationMinutes: number;
  notes: string;
  exercises: Exercise[];
}

interface Props {
  logs: WorkoutEntry[];
  onAdd: (workout: Omit<WorkoutEntry, 'id'>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const categories: { value: WorkoutEntry['category']; label: string; icon: string }[] = [
  { value: 'strength', label: 'Strength', icon: '💪' },
  { value: 'cardio', label: 'Cardio', icon: '🏃' },
  { value: 'walking', label: 'Walking', icon: '🚶' },
  { value: 'mobility', label: 'Mobility', icon: '🧘' },
  { value: 'custom', label: 'Custom', icon: '⚡' },
];

function getCategoryIcon(cat: string) {
  return categories.find((c) => c.value === cat)?.icon || '⚡';
}

function getCategoryLabel(cat: string) {
  return categories.find((c) => c.value === cat)?.label || 'Custom';
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function WorkoutLog({ logs, onAdd, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<WorkoutEntry['category']>('strength');
  const [duration, setDuration] = useState(45);
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const addExercise = () => {
    setExercises((prev) => [
      ...prev,
      { id: Date.now().toString(), name: '', sets: 3, reps: 10, weightKg: 0, durationMinutes: 0 },
    ]);
  };

  const updateExercise = (id: string, field: keyof Exercise, value: string | number) => {
    setExercises((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, [field]: value } : ex))
    );
  };

  const removeExercise = (id: string) => {
    setExercises((prev) => prev.filter((ex) => ex.id !== id));
  };

  const resetForm = () => {
    setName('');
    setCategory('strength');
    setDuration(45);
    setNotes('');
    setExercises([]);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const today = new Date();
      const local = new Date(today.getTime() - today.getTimezoneOffset() * 60_000);
      await onAdd({
        date: local.toISOString().split('T')[0],
        name: name.trim(),
        category,
        durationMinutes: duration,
        notes: notes.trim(),
        exercises,
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
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="e.g. Push day, Morning run"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-black text-ink">Category</p>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`tap-scale rounded-lg border p-3 text-center ${
                    category === cat.value ? 'border-brand bg-brand-soft' : 'border-line bg-white'
                  }`}
                >
                  <span className="block text-xl">{cat.icon}</span>
                  <span className={`mt-1 block text-xs font-black ${category === cat.value ? 'text-brand-strong' : 'text-ink-soft'}`}>
                    {cat.label}
                  </span>
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
              value={duration}
              onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
              className="input-field"
              min={1}
            />
          </div>

          {(category === 'strength' || category === 'custom') && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-black text-ink">Exercises</p>
                <button
                  type="button"
                  onClick={addExercise}
                  className="tap-scale rounded-lg bg-brand-soft px-3 py-2 text-xs font-black text-brand-strong"
                >
                  + Add exercise
                </button>
              </div>
              <div className="space-y-3">
                {exercises.map((ex) => (
                  <div key={ex.id} className="surface rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={ex.name}
                        onChange={(e) => updateExercise(ex.id, 'name', e.target.value)}
                        className="input-field flex-1 py-2 text-sm"
                        placeholder="Exercise name"
                      />
                      <button
                        type="button"
                        onClick={() => removeExercise(ex.id)}
                        className="tap-scale grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line bg-white text-muted"
                        aria-label="Remove exercise"
                      >
                        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <div>
                        <label className="mb-1 block text-[10px] font-black uppercase tracking-wide text-muted">Sets</label>
                        <input
                          type="number"
                          value={ex.sets}
                          onChange={(e) => updateExercise(ex.id, 'sets', parseInt(e.target.value) || 0)}
                          className="input-field py-2 text-sm"
                          min={0}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-black uppercase tracking-wide text-muted">Reps</label>
                        <input
                          type="number"
                          value={ex.reps}
                          onChange={(e) => updateExercise(ex.id, 'reps', parseInt(e.target.value) || 0)}
                          className="input-field py-2 text-sm"
                          min={0}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-black uppercase tracking-wide text-muted">kg</label>
                        <input
                          type="number"
                          value={ex.weightKg}
                          onChange={(e) => updateExercise(ex.id, 'weightKg', parseFloat(e.target.value) || 0)}
                          className="input-field py-2 text-sm"
                          min={0}
                          step={0.5}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-black text-ink" htmlFor="notes">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field min-h-[80px] resize-none"
              placeholder="How did it feel?"
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="primary-button tap-scale w-full"
          >
            {isSaving ? 'Saving...' : 'Save workout'}
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
          <p className="mt-2 text-sm font-bold text-muted">Track your sessions and exercises.</p>
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
        <div className="surface animate-rise-in rounded-lg p-5" style={{ animationDelay: '70ms' }}>
          <p className="text-lg font-black text-ink">No workouts yet.</p>
          <p className="mt-1 text-sm font-semibold text-muted">Log your first session to start tracking your training.</p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="primary-button tap-scale mt-4 w-full"
          >
            Log first workout
          </button>
        </div>
      ) : (
        <>
          <section className="surface animate-rise-in rounded-lg p-4" style={{ animationDelay: '70ms' }}>
            <h2 className="mb-3 text-base font-black text-ink">This month</h2>
            <div className="grid grid-cols-3 divide-x divide-line border-y border-line py-3 text-center">
              <div>
                <p className="text-2xl font-black text-brand-strong">{logs.length}</p>
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Sessions</p>
              </div>
              <div>
                <p className="text-2xl font-black text-brand-strong">
                  {Math.round(logs.reduce((s, l) => s + l.durationMinutes, 0) / 60)}h
                </p>
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Total time</p>
              </div>
              <div>
                <p className="text-2xl font-black text-brand-strong">
                  {logs.reduce((s, l) => s + l.exercises.length, 0)}
                </p>
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Exercises</p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            {logs.map((log, idx) => (
              <article
                key={log.id}
                className="surface animate-rise-in rounded-lg p-4"
                style={{ animationDelay: `${Math.min(idx * 40, 300)}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-xl">
                      {getCategoryIcon(log.category)}
                    </span>
                    <div>
                      <h3 className="text-base font-black text-ink">{log.name}</h3>
                      <p className="text-xs font-bold text-muted">
                        {formatDate(log.date)} · {getCategoryLabel(log.category)} · {log.durationMinutes} min
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(log.id)}
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
                    {log.exercises.map((ex) => (
                      <span key={ex.id} className="rounded-md border border-line bg-white px-2.5 py-1 text-xs font-bold text-ink-soft">
                        {ex.name} {ex.sets}×{ex.reps}{ex.weightKg > 0 ? ` @ ${ex.weightKg}kg` : ''}
                      </span>
                    ))}
                  </div>
                )}

                {log.notes && (
                  <p className="mt-3 text-sm font-semibold text-muted">{log.notes}</p>
                )}
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
