'use client';

import { UserProfile, DayLog, DailyTargets, MealEntry } from '@/lib/types';
import { calcPercentage, getRemaining, getMealEmoji, getMealLabel } from '@/lib/nutrition';

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

function CircularProgress({ value, max, size = 120, strokeWidth = 8, color = '#6366f1', children }: {
    value: number;
    max: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
    children?: React.ReactNode;
}) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const percentage = Math.min(value / max, 1);
    const dashoffset = circumference * (1 - percentage);

    return (
        <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="rgba(99, 102, 241, 0.15)"
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
                    className="transition-all duration-1000 ease-out"
                    style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                {children}
            </div>
        </div>
    );
}

function MacroBar({ label, current, target, color }: {
    label: string;
    current: number;
    target: number;
    color: string;
}) {
    const pct = calcPercentage(current, target);
    const remaining = getRemaining(current, target);

    return (
        <div className="space-y-1.5">
            <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-text-secondary">{label}</span>
                <span className="text-xs text-text-muted">{current}g / {target}g</span>
            </div>
            <div className="h-2 bg-surface-lighter rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                        width: `${pct}%`,
                        backgroundColor: color,
                        boxShadow: `0 0 8px ${color}60`,
                    }}
                />
            </div>
            <p className="text-xs text-text-muted">
                {remaining > 0 ? `${remaining}g to go` : `${Math.abs(remaining)}g over`}
            </p>
        </div>
    );
}

function MealCard({ meal, onDelete }: { meal: MealEntry; onDelete: () => void }) {
    return (
        <div className="glass rounded-xl p-3.5 animate-slide-in tap-scale">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-lg">{getMealEmoji(meal.mealType)}</span>
                    <div>
                        <p className="font-medium text-sm">{getMealLabel(meal.mealType)}</p>
                        <p className="text-xs text-text-muted">
                            {new Date(meal.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-accent">{meal.totalNutrition.calories} kcal</span>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="text-text-muted hover:text-danger transition-colors p-1"
                        title="Delete meal"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                        </svg>
                    </button>
                </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
                {meal.items.map((item, idx) => (
                    <span key={idx} className="text-xs bg-surface-lighter px-2 py-1 rounded-lg text-text-secondary">
                        {item.name} ({item.quantity})
                    </span>
                ))}
            </div>
            <div className="flex gap-3 mt-2 pt-2 border-t border-border/50">
                <span className="text-xs text-[#f87171]">P: {meal.totalNutrition.protein}g</span>
                <span className="text-xs text-[#60a5fa]">C: {meal.totalNutrition.carbs}g</span>
                <span className="text-xs text-[#fbbf24]">F: {meal.totalNutrition.fat}g</span>
            </div>
        </div>
    );
}

export default function Dashboard({ profile, todayLog, targets, dayNumber, onAddMeal, onDeleteMeal, onAddWater, onRemoveWater }: Props) {
    const calPct = calcPercentage(todayLog.totalNutrition.calories, targets.calories);
    const calRemaining = getRemaining(todayLog.totalNutrition.calories, targets.calories);

    return (
        <div className="px-4 pb-28 pt-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between animate-fade-in-up">
                <div>
                    <p className="text-text-secondary text-sm">Day {dayNumber}</p>
                    <h1 className="text-xl font-bold">Hi, {profile.name} 👋</h1>
                </div>
                <div className="glass rounded-xl px-3 py-1.5 text-xs">
                    <span className="text-accent font-medium">
                        {profile.goal === 'muscle_building' ? '💪 Bulking' : profile.goal === 'weight_loss' ? '🔥 Cutting' : '⚖️ Maintain'}
                    </span>
                </div>
            </div>

            {/* Calorie Ring */}
            <div className="glass rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center justify-center gap-6">
                    <CircularProgress
                        value={todayLog.totalNutrition.calories}
                        max={targets.calories}
                        size={140}
                        strokeWidth={10}
                        color={calPct >= 100 ? '#ef4444' : '#6366f1'}
                    >
                        <p className="text-2xl font-bold">{todayLog.totalNutrition.calories}</p>
                        <p className="text-[10px] text-text-muted">of {targets.calories}</p>
                        <p className="text-[10px] text-text-secondary">kcal</p>
                    </CircularProgress>

                    <div className="space-y-3 flex-1 max-w-[160px]">
                        <MacroBar label="🥩 Protein" current={todayLog.totalNutrition.protein} target={targets.protein} color="#f87171" />
                        <MacroBar label="🌾 Carbs" current={todayLog.totalNutrition.carbs} target={targets.carbs} color="#60a5fa" />
                        <MacroBar label="🧈 Fat" current={todayLog.totalNutrition.fat} target={targets.fat} color="#fbbf24" />
                    </div>
                </div>

                <div className={`text-center mt-4 py-2 rounded-xl text-sm font-medium ${calRemaining > 0
                        ? 'bg-primary/10 text-primary-light'
                        : 'bg-danger/10 text-danger'
                    }`}>
                    {calRemaining > 0
                        ? `🍽️ ${calRemaining} kcal remaining today`
                        : `⚠️ ${Math.abs(calRemaining)} kcal over target`}
                </div>
            </div>

            {/* Water Tracker */}
            <div className="glass rounded-2xl p-4 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">💧</span>
                        <div>
                            <p className="font-medium text-sm">Water</p>
                            <p className="text-xs text-text-muted">{todayLog.waterGlasses}/8 glasses</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onRemoveWater}
                            className="w-8 h-8 rounded-lg bg-surface-lighter flex items-center justify-center text-text-secondary hover:bg-surface tap-scale"
                        >
                            −
                        </button>
                        <div className="flex gap-0.5">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-3 h-6 rounded-sm transition-all duration-300 ${i < todayLog.waterGlasses ? 'bg-blue-400' : 'bg-surface-lighter'
                                        }`}
                                />
                            ))}
                        </div>
                        <button
                            onClick={onAddWater}
                            className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary hover:bg-primary/30 tap-scale"
                        >
                            +
                        </button>
                    </div>
                </div>
            </div>

            {/* Today's Meals */}
            <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold">Today&apos;s Meals</h2>
                    <button
                        onClick={onAddMeal}
                        className="text-xs bg-primary/20 text-primary-light px-3 py-1.5 rounded-lg hover:bg-primary/30 transition-colors tap-scale"
                    >
                        + Add Meal
                    </button>
                </div>

                {todayLog.meals.length === 0 ? (
                    <div className="glass rounded-2xl p-8 text-center">
                        <p className="text-3xl mb-3">🍽️</p>
                        <p className="text-text-secondary text-sm">No meals logged yet</p>
                        <p className="text-text-muted text-xs mt-1">Tap &quot;+ Add Meal&quot; to start tracking</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {todayLog.meals.map((meal) => (
                            <MealCard key={meal.id} meal={meal} onDelete={() => onDeleteMeal(meal.id)} />
                        ))}
                    </div>
                )}
            </div>

            {/* Quick Tips */}
            {todayLog.meals.length > 0 && (
                <div className="glass rounded-2xl p-4 animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
                    <p className="text-sm font-medium mb-2">💡 Suggestion</p>
                    {todayLog.totalNutrition.protein < targets.protein * 0.5 ? (
                        <p className="text-xs text-text-secondary">
                            You&apos;re low on protein! Try adding dal, paneer, eggs, or a protein shake to your next meal.
                        </p>
                    ) : calRemaining > 300 ? (
                        <p className="text-xs text-text-secondary">
                            You still have {calRemaining} kcal to go. Consider having a balanced meal with roti, sabzi, and dal.
                        </p>
                    ) : calRemaining < 0 ? (
                        <p className="text-xs text-text-secondary">
                            You&apos;ve exceeded your calorie target. Try lighter meals for the rest of the day and drink more water.
                        </p>
                    ) : (
                        <p className="text-xs text-text-secondary">
                            Great job! You&apos;re on track with your daily nutrition goals. Keep it up! 💪
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
