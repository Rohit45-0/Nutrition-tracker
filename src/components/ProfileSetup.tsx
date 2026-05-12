'use client';

import { useMemo, useState } from 'react';
import { ActivityLevel, DietaryPreference, Goal, IndianFoodPreference, UserProfile } from '@/lib/types';
import {
    buildDietPlanSummary,
    buildWorkoutPlanSummary,
    calculateDailyTargets,
    getDietaryPreferenceLabel,
    getIndianFoodPreferenceLabel,
} from '@/lib/nutrition';

interface Props {
    onComplete: (profile: UserProfile) => Promise<void> | void;
    existingProfile?: UserProfile | null;
    accountName?: string;
    userEmail?: string;
    onSignOut?: () => Promise<void> | void;
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

const dietaryPreferences: DietaryPreference[] = ['vegetarian', 'eggetarian', 'non_vegetarian', 'vegan'];
const indianFoodPreferences: IndianFoodPreference[] = ['north_indian', 'south_indian', 'mixed', 'any'];
const stepTitles = ['Your basics', 'Your goal', 'Your activity', 'Food style', 'Your routine', 'Your plan'];

function parseDislikedFoods(value: string) {
    return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 12);
}

export default function ProfileSetup({ onComplete, existingProfile, accountName, userEmail, onSignOut }: Props) {
    const [step, setStep] = useState(0);
    const [name, setName] = useState(existingProfile?.name || accountName || '');
    const [weight, setWeight] = useState(existingProfile?.weight || 70);
    const [height, setHeight] = useState(existingProfile?.height || 170);
    const [age, setAge] = useState(existingProfile?.age || 25);
    const [gender, setGender] = useState<'male' | 'female'>(existingProfile?.gender || 'male');
    const [goal, setGoal] = useState<Goal>(existingProfile?.goal || 'muscle_building');
    const [activityLevel, setActivityLevel] = useState<ActivityLevel>(existingProfile?.activityLevel || 'moderate');
    const [dietaryPreference, setDietaryPreference] = useState<DietaryPreference>(existingProfile?.dietaryPreference || 'vegetarian');
    const [indianFoodPreference, setIndianFoodPreference] = useState<IndianFoodPreference>(existingProfile?.indianFoodPreference || 'mixed');
    const [dislikedFoodsInput, setDislikedFoodsInput] = useState(existingProfile?.dislikedFoods.join(', ') || '');
    const [dailyStepGoal, setDailyStepGoal] = useState(existingProfile?.dailyStepGoal || 8000);
    const [dailyWaterGoal, setDailyWaterGoal] = useState(existingProfile?.dailyWaterGoal || 8);
    const [weeklyWorkoutGoal, setWeeklyWorkoutGoal] = useState(existingProfile?.weeklyWorkoutGoal || 4);
    const [remindersEnabled, setRemindersEnabled] = useState(existingProfile?.remindersEnabled || false);
    const [reminderTime, setReminderTime] = useState(existingProfile?.reminderTime || '08:00');
    const [isSaving, setIsSaving] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);

    const draftProfile = useMemo<UserProfile>(() => ({
        name: name.trim() || 'User',
        weight,
        height,
        age,
        gender,
        goal,
        activityLevel,
        dietaryPreference,
        indianFoodPreference,
        dislikedFoods: parseDislikedFoods(dislikedFoodsInput),
        dailyStepGoal,
        dailyWaterGoal,
        weeklyWorkoutGoal,
        remindersEnabled,
        reminderTime,
        createdAt: existingProfile?.createdAt || new Date().toISOString(),
    }), [
        activityLevel,
        age,
        dailyStepGoal,
        dailyWaterGoal,
        dietaryPreference,
        dislikedFoodsInput,
        existingProfile?.createdAt,
        gender,
        goal,
        height,
        indianFoodPreference,
        name,
        reminderTime,
        remindersEnabled,
        weight,
        weeklyWorkoutGoal,
    ]);

    const targets = calculateDailyTargets(draftProfile);
    const dietPlan = buildDietPlanSummary(draftProfile, targets);
    const workoutPlan = buildWorkoutPlanSummary(draftProfile);

    const handleSubmit = async () => {
        setIsSaving(true);
        try {
            await onComplete(draftProfile);
        } finally {
            setIsSaving(false);
        }
    };

    const nextStep = () => {
        if (step < stepTitles.length - 1) {
            setStep(step + 1);
            return;
        }

        void handleSubmit();
    };

    const prevStep = () => {
        if (step > 0) {
            setStep(step - 1);
        }
    };

    const handleSignOut = async () => {
        if (!onSignOut) {
            return;
        }

        setIsSigningOut(true);

        try {
            await onSignOut();
        } finally {
            setIsSigningOut(false);
        }
    };

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
                            <h2 className="ink-title mt-1 text-4xl font-black leading-none text-ink">{stepTitles[step]}</h2>
                        </div>
                        <p className="rounded-lg bg-white px-3 py-2 text-sm font-black text-brand-strong shadow-sm">
                            {step + 1}/{stepTitles.length}
                        </p>
                    </div>
                    <div className={`mt-5 grid gap-2 ${stepTitles.length === 6 ? 'grid-cols-6' : 'grid-cols-5'}`}>
                        {stepTitles.map((_, index) => (
                            <div
                                key={index}
                                className={`h-1.5 rounded ${index <= step ? 'bg-brand' : 'bg-line'}`}
                            />
                        ))}
                    </div>
                    {onSignOut && (
                        <div className="surface-quiet mt-4 flex flex-col gap-3 rounded-lg p-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted">Signed in</p>
                                <p className="mt-1 truncate text-sm font-black text-ink">
                                    {accountName || userEmail || 'Account ready'}
                                </p>
                                {userEmail && accountName && accountName !== userEmail ? (
                                    <p className="mt-1 truncate text-xs font-semibold text-muted">{userEmail}</p>
                                ) : null}
                            </div>
                            <button
                                type="button"
                                onClick={() => void handleSignOut()}
                                className="tap-scale min-h-11 rounded-lg border border-line bg-white px-4 text-sm font-black text-ink transition hover:border-brand hover:text-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={isSigningOut || isSaving}
                            >
                                {isSigningOut ? 'Signing out...' : 'Use another account'}
                            </button>
                        </div>
                    )}
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
                            <div>
                                <p className="mb-2 text-sm font-black text-ink">Diet preference</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {dietaryPreferences.map((item) => (
                                        <ChoiceButton
                                            key={item}
                                            active={dietaryPreference === item}
                                            onClick={() => setDietaryPreference(item)}
                                        >
                                            {getDietaryPreferenceLabel(item)}
                                        </ChoiceButton>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <p className="mb-2 text-sm font-black text-ink">Indian meal style</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {indianFoodPreferences.map((item) => (
                                        <ChoiceButton
                                            key={item}
                                            active={indianFoodPreference === item}
                                            onClick={() => setIndianFoodPreference(item)}
                                        >
                                            {getIndianFoodPreferenceLabel(item)}
                                        </ChoiceButton>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-black text-ink" htmlFor="dislikedFoods">
                                    Foods to avoid
                                </label>
                                <input
                                    id="dislikedFoods"
                                    type="text"
                                    value={dislikedFoodsInput}
                                    onChange={(event) => setDislikedFoodsInput(event.target.value)}
                                    placeholder="e.g. mushrooms, bitter gourd"
                                    className="input-field"
                                />
                                <p className="mt-2 text-xs font-semibold text-muted">Comma-separated. Leave blank if you are flexible.</p>
                            </div>
                        </section>
                    )}

                    {step === 4 && (
                        <section className="animate-rise-in space-y-4">
                            <p className="text-sm font-semibold text-muted">These defaults power the home dashboard from day one.</p>

                            <div className="grid grid-cols-2 gap-3">
                                <NumberField label="Daily steps" value={dailyStepGoal} onChange={setDailyStepGoal} suffix="steps" />
                                <NumberField label="Workouts / week" value={weeklyWorkoutGoal} onChange={setWeeklyWorkoutGoal} suffix="days" />
                            </div>

                            <div>
                                <p className="mb-2 text-sm font-black text-ink">Daily water goal</p>
                                <div className="grid grid-cols-4 gap-2">
                                    {[6, 8, 10, 12].map((value) => (
                                        <ChoiceButton
                                            key={value}
                                            active={dailyWaterGoal === value}
                                            onClick={() => setDailyWaterGoal(value)}
                                        >
                                            {value}
                                        </ChoiceButton>
                                    ))}
                                </div>
                            </div>

                            <div className="surface-quiet rounded-lg p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-black text-ink">Daily reminder</p>
                                        <p className="mt-1 text-xs font-semibold text-muted">Save a time now so the reminder system has a clear target later.</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <ChoiceButton active={remindersEnabled} onClick={() => setRemindersEnabled(true)}>
                                            On
                                        </ChoiceButton>
                                        <ChoiceButton active={!remindersEnabled} onClick={() => setRemindersEnabled(false)}>
                                            Off
                                        </ChoiceButton>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <label className="mb-2 block text-sm font-black text-ink" htmlFor="reminderTime">
                                        Reminder time
                                    </label>
                                    <input
                                        id="reminderTime"
                                        type="time"
                                        value={reminderTime}
                                        onChange={(event) => setReminderTime(event.target.value)}
                                        className="input-field"
                                        disabled={!remindersEnabled}
                                    />
                                </div>
                            </div>
                        </section>
                    )}

                    {step === 5 && (
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
                                <SummaryRow label="Body" value={`${weight}kg - ${height}cm - ${age}y`} />
                                <SummaryRow label="Goal" value={goals.find((item) => item.value === goal)?.label || ''} />
                                <SummaryRow label="Activity" value={activityLevels.find((item) => item.value === activityLevel)?.label || ''} />
                                <SummaryRow label="Diet" value={getDietaryPreferenceLabel(dietaryPreference)} />
                                <SummaryRow label="Cuisine" value={getIndianFoodPreferenceLabel(indianFoodPreference)} />
                                <SummaryRow label="Routine" value={`${dailyStepGoal} steps, ${dailyWaterGoal} glasses, ${weeklyWorkoutGoal} workouts/week`} />
                            </div>

                            <div className="surface-quiet rounded-lg p-4">
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-strong">Diet focus</p>
                                <div className="mt-3 space-y-2 text-sm font-semibold text-ink-soft">
                                    {dietPlan.map((item) => (
                                        <p key={item}>{item}</p>
                                    ))}
                                </div>
                            </div>

                            <div className="surface-quiet rounded-lg p-4">
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-strong">Training focus</p>
                                <div className="mt-3 space-y-2 text-sm font-semibold text-ink-soft">
                                    {workoutPlan.map((item) => (
                                        <p key={item}>{item}</p>
                                    ))}
                                </div>
                            </div>
                        </section>
                    )}
                </div>

                <footer className="mt-6 grid grid-cols-2 gap-3">
                    {step > 0 ? (
                        <button
                            type="button"
                            onClick={prevStep}
                            className="secondary-button tap-scale disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={isSaving || isSigningOut}
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
                        disabled={isSaving || isSigningOut}
                    >
                        {isSaving ? 'Saving...' : step === stepTitles.length - 1 ? 'Start tracking' : 'Continue'}
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
                    className="input-field pr-16"
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
            className={`tap-scale min-h-12 rounded-lg border px-3 text-sm font-black ${active
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
