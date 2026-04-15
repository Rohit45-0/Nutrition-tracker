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
            <div className="screen space-y-5">
                <header>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-strong">History</p>
                    <h1 className="ink-title mt-1 text-4xl font-black leading-none text-ink">Your logbook</h1>
                </header>
                <div className="surface rounded-lg p-5">
                    <p className="text-lg font-black text-ink">No history yet.</p>
                    <p className="mt-1 text-sm font-semibold text-muted">Meals you log today will build your daily record here.</p>
                </div>
            </div>
        );
    }

    const last7 = logs.slice(0, 7);
    const avgCalories = Math.round(last7.reduce((sum, log) => sum + log.totalNutrition.calories, 0) / last7.length);
    const avgProtein = Math.round(last7.reduce((sum, log) => sum + log.totalNutrition.protein, 0) / last7.length);
    const goodDays = last7.filter((log) => {
        const pct = calcPercentage(log.totalNutrition.calories, targets.calories);
        return pct >= 80 && pct <= 120;
    }).length;

    return (
        <div className="screen space-y-5">
            <header className="animate-rise-in">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-strong">History</p>
                <h1 className="ink-title mt-1 text-4xl font-black leading-none text-ink">Your logbook</h1>
                <p className="mt-2 text-sm font-bold text-muted">Last 30 days, newest first.</p>
            </header>

            <section className="surface animate-rise-in rounded-lg p-4" style={{ animationDelay: '70ms' }}>
                <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-base font-black text-ink">7-day pulse</h2>
                        <p className="text-sm font-semibold text-muted">{goodDays} target days this week</p>
                    </div>
                    <span className="rounded-lg bg-brand-soft px-3 py-2 text-sm font-black text-brand-strong">
                        {logs.length} days
                    </span>
                </div>
                <div className="grid grid-cols-2 divide-x divide-line border-y border-line py-4 text-center">
                    <SummaryMetric label="Avg kcal" value={avgCalories} tone={avgCalories <= targets.calories ? 'text-brand-strong' : 'text-danger'} />
                    <SummaryMetric label="Avg protein" value={`${avgProtein}g`} tone={avgProtein >= targets.protein * 0.8 ? 'text-brand-strong' : 'text-warning'} />
                </div>
                <div className="mt-4 grid grid-cols-7 gap-2">
                    {last7.map((log) => {
                        const pct = calcPercentage(log.totalNutrition.calories, targets.calories);
                        return (
                            <div key={log.date} className="space-y-1 text-center">
                                <div
                                    className={`h-10 rounded-lg border ${pct >= 80 && pct <= 120
                                        ? 'border-brand/30 bg-brand-soft'
                                        : pct > 120
                                            ? 'border-danger/30 bg-chili-soft'
                                            : 'border-warning/30 bg-saffron-soft'
                                        }`}
                                    title={`${log.date}: ${log.totalNutrition.calories} kcal`}
                                />
                                <p className="text-[10px] font-bold text-muted">{formatDate(log.date).split(' ')[0]}</p>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="space-y-3">
                {logs.map((log, idx) => {
                    const calPct = calcPercentage(log.totalNutrition.calories, targets.calories);
                    const dayNum = Math.floor(
                        (new Date(log.date).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
                    ) + 1;
                    const status = calPct >= 80 && calPct <= 120 ? 'On target' : calPct > 120 ? 'Over target' : 'Under target';

                    return (
                        <article
                            key={log.date}
                            className="surface animate-rise-in rounded-lg p-4"
                            style={{ animationDelay: `${Math.min(idx * 35, 280)}ms` }}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-base font-black text-ink">{formatDate(log.date)}</h2>
                                    <p className="text-sm font-semibold text-muted">Day {dayNum > 0 ? dayNum : 1}</p>
                                </div>
                                <div className="text-right">
                                    <p className={`text-base font-black ${calPct >= 80 && calPct <= 120 ? 'text-brand-strong' : calPct > 120 ? 'text-danger' : 'text-warning'}`}>
                                        {log.totalNutrition.calories} kcal
                                    </p>
                                    <p className="text-xs font-bold text-muted">{status}</p>
                                </div>
                            </div>

                            <div className="mt-4 h-2 overflow-hidden rounded bg-page-deep">
                                <div
                                    className={`h-full rounded ${calPct >= 80 && calPct <= 120 ? 'bg-brand' : calPct > 120 ? 'bg-danger' : 'bg-saffron'}`}
                                    style={{ width: `${Math.min(calPct, 100)}%` }}
                                />
                            </div>

                            <div className="mt-4 grid grid-cols-4 divide-x divide-line border-y border-line py-3 text-center">
                                <DayMetric label="Protein" value={`${log.totalNutrition.protein}g`} className="text-chili" />
                                <DayMetric label="Carbs" value={`${log.totalNutrition.carbs}g`} className="text-sky" />
                                <DayMetric label="Fat" value={`${log.totalNutrition.fat}g`} className="text-warning" />
                                <DayMetric label="Water" value={String(log.waterGlasses)} className="text-sky" />
                            </div>

                            {log.meals.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {log.meals.map((meal) => (
                                        <span key={meal.id} className="rounded-md border border-line bg-white px-2 py-1 text-xs font-bold text-ink-soft">
                                            {getMealEmoji(meal.mealType)} {getMealLabel(meal.mealType)} - {meal.totalNutrition.calories}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </article>
                    );
                })}
            </section>
        </div>
    );
}

function SummaryMetric({ label, value, tone }: { label: string; value: number | string; tone: string }) {
    return (
        <div>
            <p className={`text-2xl font-black ${tone}`}>{value}</p>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
        </div>
    );
}

function DayMetric({ label, value, className }: { label: string; value: string; className: string }) {
    return (
        <div>
            <p className={`text-sm font-black ${className}`}>{value}</p>
            <p className="text-[10px] font-bold text-muted">{label}</p>
        </div>
    );
}
