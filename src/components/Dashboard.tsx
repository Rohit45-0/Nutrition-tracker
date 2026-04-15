'use client';

import type { CSSProperties, ReactNode } from 'react';
import { UserProfile, DayLog, DailyTargets, MealEntry } from '@/lib/types';
import {
    calcPercentage,
    getRemaining,
    getMealEmoji,
    getMealLabel,
    getGoalLabel,
} from '@/lib/nutrition';

interface Props {
    profile: UserProfile;
    todayLog: DayLog;
    targets: DailyTargets;
    dayNumber: number;
    onAddMeal: () => void;
    onDeleteMeal: (mealId: string) => void;
    onAddWater: () => void;
    onRemoveWater: () => void;
}

function CircularProgress({
    value,
    max,
    size = 156,
    strokeWidth = 12,
    color = '#0b6b58',
    children,
}: {
    value: number;
    max: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
    children?: ReactNode;
}) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const percentage = Math.min(value / Math.max(max, 1), 1);
    const dashoffset = circumference * (1 - percentage);

    return (
        <div
            className="relative inline-flex items-center justify-center"
            style={{ width: size, height: size, '--ring-circumference': circumference } as CSSProperties}
        >
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="rgba(170, 185, 174, 0.55)"
                    strokeWidth={strokeWidth}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={dashoffset}
                    strokeLinecap="round"
                    className="animate-ring transition-all duration-700 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                {children}
            </div>
        </div>
    );
}

function MacroBar({
    label,
    current,
    target,
    color,
    trackClass,
}: {
    label: string;
    current: number;
    target: number;
    color: string;
    trackClass: string;
}) {
    const pct = calcPercentage(current, target);
    const remaining = getRemaining(current, target);

    return (
        <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-black text-ink">{label}</span>
                <span className="text-xs font-bold text-muted">
                    {current}g / {target}g
                </span>
            </div>
            <div className={`h-2 overflow-hidden rounded ${trackClass}`}>
                <div
                    className="h-full rounded transition-all duration-700 ease-out"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                />
            </div>
            <p className="text-xs font-semibold text-muted">
                {remaining > 0 ? `${remaining}g left` : `${Math.abs(remaining)}g over`}
            </p>
        </div>
    );
}

function MealCard({ meal, onDelete }: { meal: MealEntry; onDelete: () => void }) {
    return (
        <article className="surface animate-rise-in rounded-lg p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-[11px] font-black text-brand-strong">
                        {getMealEmoji(meal.mealType)}
                    </span>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <h3 className="text-sm font-black text-ink">{getMealLabel(meal.mealType)}</h3>
                            <span className="text-xs font-semibold text-muted">
                                {new Date(meal.timestamp).toLocaleTimeString('en-IN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </span>
                        </div>
                        <p className="mt-1 text-lg font-black text-brand-strong">{meal.totalNutrition.calories} kcal</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onDelete();
                    }}
                    className="tap-scale grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line bg-white text-muted"
                    aria-label={`Delete ${getMealLabel(meal.mealType)}`}
                >
                    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <path d="M19 6 18 20a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    </svg>
                </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                {meal.items.map((item) => (
                    <span key={item.id} className="rounded-md border border-line bg-white px-2.5 py-1 text-xs font-bold text-ink-soft">
                        {item.name} - {item.quantity}
                    </span>
                ))}
            </div>

            <div className="mt-4 grid grid-cols-3 divide-x divide-line border-t border-line pt-3 text-center">
                <MacroMini label="Protein" value={`${meal.totalNutrition.protein}g`} className="text-chili" />
                <MacroMini label="Carbs" value={`${meal.totalNutrition.carbs}g`} className="text-sky" />
                <MacroMini label="Fat" value={`${meal.totalNutrition.fat}g`} className="text-warning" />
            </div>
        </article>
    );
}

function MacroMini({ label, value, className }: { label: string; value: string; className: string }) {
    return (
        <div>
            <p className={`text-sm font-black ${className}`}>{value}</p>
            <p className="text-[11px] font-bold text-muted">{label}</p>
        </div>
    );
}

export default function Dashboard({
    profile,
    todayLog,
    targets,
    dayNumber,
    onAddMeal,
    onDeleteMeal,
    onAddWater,
    onRemoveWater,
}: Props) {
    const calPct = calcPercentage(todayLog.totalNutrition.calories, targets.calories);
    const calRemaining = getRemaining(todayLog.totalNutrition.calories, targets.calories);
    const ringColor = calPct >= 100 ? '#d73c2c' : '#0b6b58';
    const totalMeals = todayLog.meals.length;

    return (
        <div className="screen space-y-5">
            <header className="animate-rise-in flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-strong">Day {dayNumber}</p>
                    <h1 className="ink-title mt-1 text-4xl font-black leading-none text-ink">
                        Hi, {profile.name}
                    </h1>
                    <p className="mt-2 text-sm font-bold text-muted">{getGoalLabel(profile.goal)}</p>
                </div>
                <button
                    type="button"
                    onClick={onAddMeal}
                    className="primary-button tap-scale shrink-0 px-4 text-sm"
                >
                    Add meal
                </button>
            </header>

            <section className="meal-photo animate-rise-in min-h-28 rounded-lg p-4 text-white shadow-[0_18px_40px_rgba(21,24,22,0.18)]" style={{ animationDelay: '60ms' }}>
                <p className="max-w-[14rem] text-xs font-black uppercase tracking-[0.18em] text-white/80">Indian meal journal</p>
                <p className="mt-2 max-w-[16rem] text-2xl font-black leading-tight">Log it while the plate is still warm.</p>
            </section>

            <section className="surface animate-rise-in rounded-lg p-4" style={{ animationDelay: '110ms' }}>
                <div className="grid grid-cols-[156px_1fr] items-center gap-4">
                    <CircularProgress
                        value={todayLog.totalNutrition.calories}
                        max={targets.calories}
                        color={ringColor}
                    >
                        <p className="text-3xl font-black text-ink">{todayLog.totalNutrition.calories}</p>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-muted">of {targets.calories}</p>
                        <p className="text-xs font-black text-brand-strong">kcal</p>
                    </CircularProgress>

                    <div className="min-w-0 space-y-3">
                        <p className={`rounded-lg px-3 py-2 text-sm font-black ${calRemaining >= 0
                            ? 'bg-brand-soft text-brand-strong'
                            : 'bg-chili-soft text-danger'
                            }`}>
                            {calRemaining >= 0
                                ? `${calRemaining} kcal left`
                                : `${Math.abs(calRemaining)} kcal over`}
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <StatPill label="Meals" value={String(totalMeals)} />
                            <StatPill label="Water" value={`${todayLog.waterGlasses}/8`} />
                        </div>
                    </div>
                </div>

                <div className="mt-5 space-y-4 border-t border-line pt-4">
                    <MacroBar label="Protein" current={todayLog.totalNutrition.protein} target={targets.protein} color="#d73c2c" trackClass="bg-chili-soft" />
                    <MacroBar label="Carbs" current={todayLog.totalNutrition.carbs} target={targets.carbs} color="#2474bc" trackClass="bg-sky-soft" />
                    <MacroBar label="Fat" current={todayLog.totalNutrition.fat} target={targets.fat} color="#aa7400" trackClass="bg-saffron-soft" />
                </div>
            </section>

            <section className="surface-quiet animate-rise-in rounded-lg p-4" style={{ animationDelay: '160ms' }}>
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-base font-black text-ink">Water</h2>
                        <p className="text-sm font-semibold text-muted">{todayLog.waterGlasses} of 8 glasses</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onRemoveWater}
                            className="tap-scale grid h-11 w-11 place-items-center rounded-lg border border-line bg-white text-xl font-black text-ink-soft"
                            aria-label="Remove water glass"
                        >
                            -
                        </button>
                        <button
                            type="button"
                            onClick={onAddWater}
                            className="tap-scale grid h-11 w-11 place-items-center rounded-lg bg-sky text-xl font-black text-white"
                            aria-label="Add water glass"
                        >
                            +
                        </button>
                    </div>
                </div>
                <div className="mt-4 grid grid-cols-8 gap-1.5">
                    {Array.from({ length: 8 }).map((_, index) => (
                        <div
                            key={index}
                            className={`h-8 rounded ${index < todayLog.waterGlasses ? 'bg-sky' : 'bg-white border border-line'}`}
                        />
                    ))}
                </div>
            </section>

            <section className="animate-rise-in" style={{ animationDelay: '210ms' }}>
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-black text-ink">Today&apos;s Meals</h2>
                        <p className="text-sm font-semibold text-muted">Breakfast, lunch, dinner, and snacks</p>
                    </div>
                    <button
                        type="button"
                        onClick={onAddMeal}
                        className="secondary-button tap-scale min-h-11 shrink-0 px-3 text-sm"
                    >
                        Add
                    </button>
                </div>

                {todayLog.meals.length === 0 ? (
                    <div className="surface rounded-lg p-5">
                        <p className="text-lg font-black text-ink">No meals yet.</p>
                        <p className="mt-1 text-sm font-semibold text-muted">Start with what you actually ate. Hinglish works too.</p>
                        <button
                            type="button"
                            onClick={onAddMeal}
                            className="primary-button tap-scale mt-4 w-full"
                        >
                            Log first meal
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {todayLog.meals.map((meal) => (
                            <MealCard key={meal.id} meal={meal} onDelete={() => onDeleteMeal(meal.id)} />
                        ))}
                    </div>
                )}
            </section>

            {todayLog.meals.length > 0 && (
                <section className="surface-quiet animate-rise-in rounded-lg p-4" style={{ animationDelay: '260ms' }}>
                    <p className="text-sm font-black uppercase tracking-[0.16em] text-brand-strong">Next move</p>
                    {todayLog.totalNutrition.protein < targets.protein * 0.5 ? (
                        <p className="mt-2 text-sm font-semibold text-ink-soft">
                            Protein is running low. Dal, paneer, eggs, chicken, sprouts, or whey can pull the day back in range.
                        </p>
                    ) : calRemaining > 300 ? (
                        <p className="mt-2 text-sm font-semibold text-ink-soft">
                            You still have room for a balanced plate: roti or rice, dal, sabzi, and a protein side.
                        </p>
                    ) : calRemaining < 0 ? (
                        <p className="mt-2 text-sm font-semibold text-ink-soft">
                            Calories crossed target. Keep the next plate lighter and drink water before snacking.
                        </p>
                    ) : (
                        <p className="mt-2 text-sm font-semibold text-ink-soft">
                            You are close to target. Keep the next choice simple and consistent.
                        </p>
                    )}
                </section>
            )}
        </div>
    );
}

function StatPill({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-line bg-white px-3 py-2">
            <p className="text-lg font-black text-ink">{value}</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
        </div>
    );
}
