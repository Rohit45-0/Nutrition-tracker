'use client';

import { useMemo, useState } from 'react';
import { MealType, MealEntry, FoodItem, NutritionInfo } from '@/lib/types';
import { getMealEmoji, getMealLabel, sumNutrition } from '@/lib/nutrition';

interface Props {
    onSave: (meal: MealEntry) => Promise<void> | void;
    onClose: () => void;
    initialMeal?: MealEntry | null;
}

const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const quickAddSuggestions: Record<MealType, string[]> = {
    breakfast: [
        '2 eggs, 2 toast',
        '2 idli, sambar',
        '1 paratha, curd',
        '1 dosa, chutney',
        'oats with milk, 1 banana',
        '1 protein scoop, 1 banana',
        'poha, chai',
        '2 egg omelette, 2 roti',
    ],
    lunch: [
        '2 roti, dal, rice',
        'chicken biryani',
        '3 roti, paneer, salad',
        '2 roti, rajma, rice',
        'rice, sambar, curd',
        '2 roti, chicken curry, rice',
        'chole, 2 bhatura',
        'khichdi, curd, papad',
    ],
    dinner: [
        '2 roti, sabzi, dal',
        '2 roti, chicken curry',
        'rice, fish curry',
        '3 roti, palak paneer',
        '2 roti, egg curry',
        'rice, dal, salad',
        '2 roti, mix veg, raita',
        '1 roti, dal, salad',
    ],
    snack: [
        '1 protein scoop',
        '10 almonds, 1 banana',
        'chai, 2 biscuit',
        '1 apple, peanuts',
        '1 guava',
        'makhana, green tea',
        'sprouts chaat',
        'dry fruits mix',
    ],
};

function mealToFoodText(meal: MealEntry) {
    return meal.items.map((item) => `${item.quantity} ${item.name}`).join(', ');
}

export default function AddMeal({ onSave, onClose, initialMeal }: Props) {
    const isEditing = Boolean(initialMeal);
    const [mealType, setMealType] = useState<MealType>(initialMeal?.mealType || 'breakfast');
    const [foodText, setFoodText] = useState(initialMeal ? mealToFoodText(initialMeal) : '');
    const [loading, setLoading] = useState(false);
    const [parsedItems, setParsedItems] = useState<FoodItem[]>(initialMeal?.items || []);
    const [error, setError] = useState('');
    const [step, setStep] = useState<'input' | 'review'>(initialMeal ? 'review' : 'input');
    const [isSaving, setIsSaving] = useState(false);
    const mealTotal = useMemo(() => sumNutrition(parsedItems), [parsedItems]);

    const handleAnalyze = async () => {
        if (!foodText.trim()) return;

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/nutrition', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ foodText: foodText.trim() }),
            });

            if (!response.ok) {
                throw new Error('Failed to analyze food');
            }

            const data = await response.json();

            if (data.error) {
                setError(data.error);
                return;
            }

            if (!Array.isArray(data.items) || data.items.length === 0) {
                setError('I could not read that meal. Try adding quantities like "2 roti, dal".');
                return;
            }

            const items: FoodItem[] = data.items.map((item: {
                name: string;
                quantity: string;
                calories: number;
                protein: number;
                carbs: number;
                fat: number;
                fiber: number;
            }, idx: number) => ({
                id: `${Date.now()}-${idx}`,
                name: item.name,
                quantity: item.quantity,
                nutrition: {
                    calories: item.calories,
                    protein: item.protein,
                    carbs: item.carbs,
                    fat: item.fat,
                    fiber: item.fiber,
                },
            }));

            setParsedItems(items);
            setStep('review');
        } catch (err) {
            setError('Something went wrong. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (parsedItems.length === 0) return;

        const totalNutrition: NutritionInfo = mealTotal;

        const meal: MealEntry = {
            id: initialMeal?.id || Date.now().toString(),
            mealType,
            items: parsedItems,
            timestamp: initialMeal?.timestamp || new Date().toISOString(),
            totalNutrition,
        };

        setIsSaving(true);
        try {
            await onSave(meal);
        } finally {
            setIsSaving(false);
        }
    };

    const removeItem = (id: string) => {
        setParsedItems(parsedItems.filter((item) => item.id !== id));
    };

    const handleQuickAdd = (text: string) => {
        setFoodText(text);
        setError('');
    };

    return (
        <div className="fixed inset-0 z-50 bg-page/95 backdrop-blur">
            <div className="app-shell flex min-h-dvh flex-col">
                <header className="sticky top-0 z-10 border-b border-line bg-page/90 px-4 py-4 backdrop-blur">
                    <div className="flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="tap-scale grid h-11 w-11 place-items-center rounded-lg border border-line bg-white text-ink"
                            aria-label={isEditing ? 'Close edit meal' : 'Close add meal'}
                        >
                            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 12H5" />
                                <path d="m12 19-7-7 7-7" />
                            </svg>
                        </button>
                        <div className="text-center">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-strong">
                                {step === 'input' ? 'Step 1 of 2' : 'Step 2 of 2'}
                            </p>
                            <h1 className="text-lg font-black text-ink">{isEditing ? 'Edit meal' : 'Log a meal'}</h1>
                        </div>
                        <div className="h-11 w-11" />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className={`h-1.5 rounded ${step === 'input' || step === 'review' ? 'bg-brand' : 'bg-line'}`} />
                        <div className={`h-1.5 rounded ${step === 'review' ? 'bg-brand' : 'bg-line'}`} />
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto px-4 py-5">
                    {step === 'input' ? (
                        <div className="space-y-6">
                            <section>
                                <div className="mb-3">
                                    <h2 className="ink-title text-3xl font-black text-ink">
                                        {isEditing ? 'Update this plate' : 'What plate is this?'}
                                    </h2>
                                    <p className="mt-1 text-sm font-semibold text-muted">Pick the meal, then type it naturally.</p>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {mealTypes.map((type) => (
                                        <button
                                            type="button"
                                            key={type}
                                            onClick={() => setMealType(type)}
                                            className={`tap-scale min-h-[76px] rounded-lg border p-2 text-center ${mealType === type
                                                ? 'border-brand bg-brand text-white shadow-[0_12px_26px_rgba(11,107,88,0.2)]'
                                                : 'border-line bg-white text-ink-soft'
                                                }`}
                                        >
                                            <span className="mx-auto grid h-8 w-8 place-items-center rounded-md bg-white/20 text-[10px] font-black">
                                                {getMealEmoji(type)}
                                            </span>
                                            <span className="mt-2 block text-xs font-black leading-tight">{getMealLabel(type)}</span>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <label className="mb-2 block text-sm font-black text-ink" htmlFor="foodText">
                                    Food eaten
                                </label>
                                <textarea
                                    id="foodText"
                                    value={foodText}
                                    onChange={(event) => {
                                        setFoodText(event.target.value);
                                        setError('');
                                    }}
                                    placeholder="Example: 2 roti, dal, rice, paneer, salad"
                                    rows={5}
                                    className="input-field resize-none"
                                />
                                <p className="mt-2 text-xs font-bold text-muted">English and Hinglish both work. Quantities help a lot.</p>
                            </section>

                            <section>
                                <div className="mb-3 flex items-baseline justify-between gap-3">
                                    <h2 className="text-base font-black text-ink">Quick plates</h2>
                                    <p className="text-xs font-bold text-muted">{getMealLabel(mealType)}</p>
                                </div>
                                <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2">
                                    {quickAddSuggestions[mealType].map((suggestion) => (
                                        <button
                                            type="button"
                                            key={suggestion}
                                            onClick={() => handleQuickAdd(suggestion)}
                                            className={`tap-scale min-h-11 shrink-0 snap-start rounded-lg border px-3 text-sm font-bold ${foodText === suggestion
                                                ? 'border-brand bg-brand-soft text-brand-strong'
                                                : 'border-line bg-white text-ink-soft'
                                                }`}
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {error && (
                                <div className="rounded-lg border border-danger/30 bg-chili-soft p-3 text-sm font-bold text-danger">
                                    {error}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <section className="surface rounded-lg p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-strong">Review</p>
                                        <h2 className="ink-title mt-1 text-3xl font-black text-ink">{getMealLabel(mealType)}</h2>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setStep('input')}
                                        className="secondary-button tap-scale min-h-10 px-3 text-sm"
                                    >
                                        Edit
                                    </button>
                                </div>
                                <div className="mt-4 grid grid-cols-4 divide-x divide-line border-t border-line pt-4 text-center">
                                    <TotalCell label="kcal" value={mealTotal.calories} className="text-brand-strong" />
                                    <TotalCell label="protein" value={`${mealTotal.protein}g`} className="text-chili" />
                                    <TotalCell label="carbs" value={`${mealTotal.carbs}g`} className="text-sky" />
                                    <TotalCell label="fat" value={`${mealTotal.fat}g`} className="text-warning" />
                                </div>
                            </section>

                            <section className="space-y-3">
                                {parsedItems.map((item) => (
                                    <article key={item.id} className="surface rounded-lg p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <h3 className="truncate text-base font-black text-ink">{item.name}</h3>
                                                <p className="mt-1 text-sm font-semibold text-muted">{item.quantity}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeItem(item.id)}
                                                className="tap-scale grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line bg-white text-muted"
                                                aria-label={`Remove ${item.name}`}
                                            >
                                                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
                                                    <path d="M18 6 6 18" />
                                                    <path d="m6 6 12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                                            <NutrientChip label="kcal" value={item.nutrition.calories} />
                                            <NutrientChip label="protein" value={`${item.nutrition.protein}g`} />
                                            <NutrientChip label="carbs" value={`${item.nutrition.carbs}g`} />
                                            <NutrientChip label="fat" value={`${item.nutrition.fat}g`} />
                                        </div>
                                    </article>
                                ))}
                            </section>
                        </div>
                    )}
                </div>

                <footer className="sticky bottom-0 border-t border-line bg-surface/95 p-4 pb-safe backdrop-blur">
                    {step === 'input' ? (
                        <button
                            type="button"
                            onClick={handleAnalyze}
                            disabled={!foodText.trim() || loading}
                            className="primary-button tap-scale flex w-full items-center justify-center gap-2"
                        >
                            {loading && (
                                <svg aria-hidden="true" className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" />
                                </svg>
                            )}
                            {loading ? 'Analyzing meal' : 'Analyze nutrition'}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => { void handleSave(); }}
                            disabled={parsedItems.length === 0 || isSaving}
                            className="primary-button tap-scale w-full"
                        >
                            {isSaving ? 'Saving meal...' : isEditing ? 'Save changes' : 'Log this meal'}
                        </button>
                    )}
                </footer>
            </div>
        </div>
    );
}

function TotalCell({ label, value, className }: { label: string; value: number | string; className: string }) {
    return (
        <div>
            <p className={`text-lg font-black ${className}`}>{value}</p>
            <p className="text-[11px] font-bold text-muted">{label}</p>
        </div>
    );
}

function NutrientChip({ label, value }: { label: string; value: number | string }) {
    return (
        <div className="rounded-lg border border-line bg-white px-2 py-2">
            <p className="text-sm font-black text-ink">{value}</p>
            <p className="text-[10px] font-bold text-muted">{label}</p>
        </div>
    );
}
