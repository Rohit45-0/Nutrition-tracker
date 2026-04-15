'use client';

import { useState } from 'react';
import { UserProfile, Goal, ActivityLevel } from '@/lib/types';
import { calculateDailyTargets } from '@/lib/nutrition';

interface Props {
    onComplete: (profile: UserProfile) => Promise<void> | void;
    existingProfile?: UserProfile | null;
    accountName?: string;
}

const goals: { value: Goal; label: string; desc: string; marker: string }[] = [
    { value: 'muscle_building', label: 'Muscle building', marker: 'Gain', desc: 'Add lean mass with a controlled calorie surplus.' },
    { value: 'weight_loss', label: 'Weight loss', marker: 'Cut', desc: 'Drop fat while keeping protein high.' },
    { value: 'maintain', label: 'Maintain', marker: 'Hold', desc: 'Stay steady with balanced daily targets.' },
];

const activityLevels: { value: ActivityLevel; label: string; desc: string }[] = [
    { value: 'sedentary', label: 'Sedentary', desc: 'Desk job, little planned exercise.' },
    { value: 'light', label: 'Lightly active', desc: 'Training or sport 1-3 days each week.' },
    { value: 'moderate', label: 'Moderately active', desc: 'Training 3-5 days each week.' },
    { value: 'active', label: 'Very active', desc: 'Training most days with movement at work.' },
    { value: 'very_active', label: 'Athlete', desc: 'Hard daily training or physical work.' },
];

export default function ProfileSetup({ onComplete, existingProfile, accountName }: Props) {
    const [step, setStep] = useState(0);
    const [name, setName] = useState(existingProfile?.name || accountName || '');
    const [weight, setWeight] = useState(existingProfile?.weight || 70);
    const [height, setHeight] = useState(existingProfile?.height || 170);
    const [age, setAge] = useState(existingProfile?.age || 25);
    const [gender, setGender] = useState<'male' | 'female'>(existingProfile?.gender || 'male');
    const [goal, setGoal] = useState<Goal>(existingProfile?.goal || 'muscle_building');
    const [activityLevel, setActivityLevel] = useState<ActivityLevel>(existingProfile?.activityLevel || 'moderate');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async () => {
        setIsSaving(true);
        const profile: UserProfile = {
            name: name.trim() || 'User',
            weight,
            height,
            age,
            gender,
            goal,
            activityLevel,
            createdAt: existingProfile?.createdAt || new Date().toISOString(),
        };
        try {
            await onComplete(profile);
        } finally {
            setIsSaving(false);
        }
    };

    const nextStep = () => {
        if (step < 3) setStep(step + 1);
        else void handleSubmit();
    };

    const prevStep = () => {
        if (step > 0) setStep(step - 1);
    };

    const targets = calculateDailyTargets({
        name: name.trim() || 'User',
        weight,
        height,
        age,
        gender,
        goal,
        activityLevel,
        createdAt: '',
    });

    return (
        <main className="app-shell min-h-dvh">
            <div className="screen flex min-h-dvh flex-col pb-6">
                <header className="animate-rise-in">
                    <div className="meal-photo mb-5 min-h-32 rounded-lg p-4 text-white shadow-[0_18px_40px_rgba(21,24,22,0.18)]">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-white/80">NutriTrack</p>
                        <h1 className="mt-2 max-w-[16rem] text-3xl font-black leading-tight">Start with your real plate.</h1>
                    </div>
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-strong">Setup</p>
                            <h2 className="ink-title mt-1 text-4xl font-black leading-none text-ink">
                                {step === 0 && 'Your basics'}
                                {step === 1 && 'Your goal'}
                                {step === 2 && 'Your activity'}
                                {step === 3 && 'Your plan'}
                            </h2>
                        </div>
                        <p className="rounded-lg bg-white px-3 py-2 text-sm font-black text-brand-strong shadow-sm">
                            {step + 1}/4
                        </p>
                    </div>
                    <div className="mt-5 grid grid-cols-4 gap-2">
                        {[0, 1, 2, 3].map((index) => (
                            <div
                                key={index}
                                className={`h-1.5 rounded ${index <= step ? 'bg-brand' : 'bg-line'}`}
                            />
                        ))}
                    </div>
                </header>

                <div className="mt-6 flex-1">
                    {step === 0 && (
                        <section className="animate-rise-in space-y-4">
                            <p className="text-sm font-semibold text-muted">These numbers create the first calorie and protein estimate.</p>

                            <div>
                                <label className="mb-2 block text-sm font-black text-ink" htmlFor="name">
                                    Name
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    placeholder="Enter your name"
                                    className="input-field"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <NumberField label="Age" value={age} onChange={setAge} suffix="years" />
                                <div>
                                    <p className="mb-2 block text-sm font-black text-ink">Gender</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <ChoiceButton active={gender === 'male'} onClick={() => setGender('male')}>
                                            Male
                                        </ChoiceButton>
                                        <ChoiceButton active={gender === 'female'} onClick={() => setGender('female')}>
                                            Female
                                        </ChoiceButton>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <NumberField label="Weight" value={weight} onChange={setWeight} suffix="kg" />
                                <NumberField label="Height" value={height} onChange={setHeight} suffix="cm" />
                            </div>
                        </section>
                    )}

                    {step === 1 && (
                        <section className="animate-rise-in space-y-3">
                            <p className="text-sm font-semibold text-muted">Pick the outcome you want the app to optimize for.</p>
                            {goals.map((item) => (
                                <button
                                    type="button"
                                    key={item.value}
                                    onClick={() => setGoal(item.value)}
                                    className={`tap-scale flex w-full items-center gap-3 rounded-lg border p-4 text-left ${goal === item.value
                                        ? 'border-brand bg-brand-soft'
                                        : 'border-line bg-white'
                                        }`}
                                >
                                    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg text-xs font-black ${goal === item.value
                                        ? 'bg-brand text-white'
                                        : 'bg-page text-brand-strong'
                                        }`}>
                                        {item.marker}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-base font-black text-ink">{item.label}</span>
                                        <span className="mt-1 block text-sm font-semibold text-muted">{item.desc}</span>
                                    </span>
                                </button>
                            ))}
                        </section>
                    )}

                    {step === 2 && (
                        <section className="animate-rise-in space-y-3">
                            <p className="text-sm font-semibold text-muted">This controls the multiplier used for daily energy needs.</p>
                            {activityLevels.map((item) => (
                                <button
                                    type="button"
                                    key={item.value}
                                    onClick={() => setActivityLevel(item.value)}
                                    className={`tap-scale w-full rounded-lg border p-4 text-left ${activityLevel === item.value
                                        ? 'border-brand bg-brand-soft'
                                        : 'border-line bg-white'
                                        }`}
                                >
                                    <span className="block text-base font-black text-ink">{item.label}</span>
                                    <span className="mt-1 block text-sm font-semibold text-muted">{item.desc}</span>
                                </button>
                            ))}
                        </section>
                    )}

                    {step === 3 && (
                        <section className="animate-rise-in space-y-4">
                            <div className="surface rounded-lg p-4 text-center">
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-strong">Daily calories</p>
                                <p className="ink-title mt-1 text-5xl font-black text-ink">{targets.calories}</p>
                                <p className="mt-1 text-sm font-semibold text-muted">Your first target can be edited later.</p>
                                <div className="mt-5 grid grid-cols-3 divide-x divide-line border-y border-line py-4">
                                    <PlanMacro label="Protein" value={`${targets.protein}g`} className="text-chili" />
                                    <PlanMacro label="Carbs" value={`${targets.carbs}g`} className="text-sky" />
                                    <PlanMacro label="Fat" value={`${targets.fat}g`} className="text-warning" />
                                </div>
                            </div>

                            <div className="surface-quiet rounded-lg p-4">
                                <SummaryRow label="Name" value={name.trim() || 'User'} />
                                <SummaryRow label="Body" value={`${weight}kg - ${height}cm - ${age}y`} />
                                <SummaryRow label="Goal" value={goals.find((item) => item.value === goal)?.label || ''} />
                                <SummaryRow label="Activity" value={activityLevels.find((item) => item.value === activityLevel)?.label || ''} />
                            </div>
                        </section>
                    )}
                </div>

                <footer className="mt-6 grid grid-cols-2 gap-3">
                    {step > 0 ? (
                        <button
                            type="button"
                            onClick={prevStep}
                            className="secondary-button tap-scale"
                        >
                            Back
                        </button>
                    ) : (
                        <div />
                    )}
                    <button
                        type="button"
                        onClick={nextStep}
                        className="primary-button tap-scale"
                        disabled={isSaving}
                    >
                        {isSaving ? 'Saving...' : step === 3 ? 'Start tracking' : 'Continue'}
                    </button>
                </footer>
            </div>
        </main>
    );
}

function NumberField({
    label,
    value,
    onChange,
    suffix,
}: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    suffix: string;
}) {
    return (
        <div>
            <label className="mb-2 block text-sm font-black text-ink" htmlFor={label}>
                {label}
            </label>
            <div className="relative">
                <input
                    id={label}
                    type="number"
                    inputMode="numeric"
                    value={value}
                    onChange={(event) => onChange(Number(event.target.value))}
                    className="input-field pr-14"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black uppercase tracking-[0.1em] text-muted">
                    {suffix}
                </span>
            </div>
        </div>
    );
}

function ChoiceButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`tap-scale min-h-12 rounded-lg border text-sm font-black ${active
                ? 'border-brand bg-brand text-white'
                : 'border-line bg-white text-ink-soft'
                }`}
        >
            {children}
        </button>
    );
}

function PlanMacro({ label, value, className }: { label: string; value: string; className: string }) {
    return (
        <div>
            <p className={`text-lg font-black ${className}`}>{value}</p>
            <p className="text-[11px] font-bold text-muted">{label}</p>
        </div>
    );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-4 border-b border-line py-3 last:border-b-0">
            <span className="text-sm font-bold text-muted">{label}</span>
            <span className="min-w-0 truncate text-right text-sm font-black text-ink">{value}</span>
        </div>
    );
}
