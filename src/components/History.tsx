'use client';

import { DayLog, DailyTargets } from '@/lib/types';
import { formatDate, calcPercentage, getMealEmoji, getMealLabel } from '@/lib/nutrition';

interface Props {
    logs: DayLog[];
    targets: DailyTargets;
    startDate: string;
}

export default function History({ logs, targets, startDate }: Props) {
    if (logs.length === 0) {
        return (
            <div className="px-4 pb-28 pt-6">
                <h1 className="text-xl font-bold mb-6">📊 History</h1>
                <div className="glass rounded-2xl p-8 text-center">
                    <p className="text-3xl mb-3">📅</p>
                    <p className="text-text-secondary text-sm">No history yet</p>
                    <p className="text-text-muted text-xs mt-1">Start logging meals to see your history here</p>
                </div>
            </div>
        );
    }

    // Calculate weekly averages
    const last7 = logs.slice(0, 7);
    const avgCalories = Math.round(last7.reduce((s, l) => s + l.totalNutrition.calories, 0) / last7.length);
    const avgProtein = Math.round(last7.reduce((s, l) => s + l.totalNutrition.protein, 0) / last7.length);

    return (
        <div className="px-4 pb-28 pt-6 space-y-5">
            <h1 className="text-xl font-bold animate-fade-in-up">📊 History</h1>

            {/* Weekly Summary */}
            <div className="glass rounded-2xl p-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                <p className="text-sm font-medium mb-3">Last 7 Days Average</p>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-surface rounded-xl p-3 text-center">
                        <p className="text-xl font-bold gradient-text">{avgCalories}</p>
                        <p className="text-xs text-text-muted">Avg Calories</p>
                        <p className={`text-[10px] mt-1 ${avgCalories <= targets.calories ? 'text-success' : 'text-danger'}`}>
                            {avgCalories <= targets.calories ? '✅ On track' : '⚠️ Over target'}
                        </p>
                    </div>
                    <div className="bg-surface rounded-xl p-3 text-center">
                        <p className="text-xl font-bold text-[#f87171]">{avgProtein}g</p>
                        <p className="text-xs text-text-muted">Avg Protein</p>
                        <p className={`text-[10px] mt-1 ${avgProtein >= targets.protein * 0.8 ? 'text-success' : 'text-warning'}`}>
                            {avgProtein >= targets.protein * 0.8 ? '✅ Good' : '⚠️ Low'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Streak */}
            <div className="glass rounded-2xl p-4 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🔥</span>
                    <div>
                        <p className="font-medium text-sm">Tracking Streak</p>
                        <p className="text-xs text-text-muted">{logs.length} days logged since you started</p>
                    </div>
                </div>
                <div className="flex gap-1 mt-3 flex-wrap">
                    {logs.slice(0, 14).map((log) => {
                        const pct = calcPercentage(log.totalNutrition.calories, targets.calories);
                        return (
                            <div
                                key={log.date}
                                className={`w-5 h-5 rounded-sm flex items-center justify-center text-[8px] ${pct >= 80 && pct <= 120
                                        ? 'bg-success/30 text-success'
                                        : pct > 120
                                            ? 'bg-danger/30 text-danger'
                                            : 'bg-warning/30 text-warning'
                                    }`}
                                title={`${log.date}: ${log.totalNutrition.calories} kcal`}
                            >
                                {pct >= 80 && pct <= 120 ? '✓' : pct > 120 ? '!' : '·'}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Day Cards */}
            <div className="space-y-3">
                {logs.map((log, idx) => {
                    const calPct = calcPercentage(log.totalNutrition.calories, targets.calories);
                    const dayNum = Math.floor(
                        (new Date(log.date).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
                    ) + 1;

                    return (
                        <div
                            key={log.date}
                            className="glass rounded-2xl p-4 animate-slide-in"
                            style={{ animationDelay: `${idx * 0.05}s` }}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <p className="font-medium text-sm">{formatDate(log.date)}</p>
                                    <p className="text-xs text-text-muted">Day {dayNum > 0 ? dayNum : 1}</p>
                                </div>
                                <div className="text-right">
                                    <p className={`text-sm font-bold ${calPct >= 80 && calPct <= 120 ? 'text-success' : calPct > 120 ? 'text-danger' : 'text-warning'
                                        }`}>
                                        {log.totalNutrition.calories} kcal
                                    </p>
                                    <p className="text-[10px] text-text-muted">{calPct}% of target</p>
                                </div>
                            </div>

                            {/* Mini macro bar */}
                            <div className="h-1.5 bg-surface-lighter rounded-full overflow-hidden mb-3">
                                <div
                                    className={`h-full rounded-full transition-all ${calPct >= 80 && calPct <= 120 ? 'bg-success' : calPct > 120 ? 'bg-danger' : 'bg-warning'
                                        }`}
                                    style={{ width: `${Math.min(calPct, 100)}%` }}
                                />
                            </div>

                            {/* Macros */}
                            <div className="flex gap-4 text-xs mb-2">
                                <span className="text-[#f87171]">P: {log.totalNutrition.protein}g</span>
                                <span className="text-[#60a5fa]">C: {log.totalNutrition.carbs}g</span>
                                <span className="text-[#fbbf24]">F: {log.totalNutrition.fat}g</span>
                                <span className="text-blue-400">💧 {log.waterGlasses}</span>
                            </div>

                            {/* Meals summary */}
                            <div className="flex flex-wrap gap-1.5">
                                {log.meals.map((meal) => (
                                    <span key={meal.id} className="text-[10px] bg-surface-lighter px-2 py-0.5 rounded-md text-text-muted">
                                        {getMealEmoji(meal.mealType)} {getMealLabel(meal.mealType)} ({meal.totalNutrition.calories})
                                    </span>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
