'use client';

import { useState } from 'react';
import { MealType, MealEntry, FoodItem, NutritionInfo } from '@/lib/types';
import { getMealEmoji, getMealLabel, sumNutrition } from '@/lib/nutrition';

interface Props {
    onSave: (meal: MealEntry) => void;
    onClose: () => void;
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

export default function AddMeal({ onSave, onClose }: Props) {
    const [mealType, setMealType] = useState<MealType>('breakfast');
    const [foodText, setFoodText] = useState('');
    const [loading, setLoading] = useState(false);
    const [parsedItems, setParsedItems] = useState<FoodItem[]>([]);
    const [error, setError] = useState('');
    const [step, setStep] = useState<'input' | 'review'>('input');

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

    const handleSave = () => {
        if (parsedItems.length === 0) return;

        const totalNutrition: NutritionInfo = sumNutrition(parsedItems);

        const meal: MealEntry = {
            id: Date.now().toString(),
            mealType,
            items: parsedItems,
            timestamp: new Date().toISOString(),
            totalNutrition,
        };

        onSave(meal);
    };

    const removeItem = (id: string) => {
        setParsedItems(parsedItems.filter((item) => item.id !== id));
    };

    const handleQuickAdd = (text: string) => {
        setFoodText(text);
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-surface/95 backdrop-blur-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-border/50">
                <button onClick={onClose} className="text-text-secondary p-1 tap-scale">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                </button>
                <h2 className="font-semibold">Add Meal</h2>
                <div className="w-8" />
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
                {step === 'input' ? (
                    <>
                        {/* Meal Type Selector */}
                        <div>
                            <label className="text-sm text-text-secondary mb-2 block">Meal Type</label>
                            <div className="grid grid-cols-4 gap-2">
                                {mealTypes.map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setMealType(type)}
                                        className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs transition-all tap-scale ${mealType === type
                                                ? 'bg-primary/20 border-2 border-primary text-white'
                                                : 'bg-surface-light border-2 border-transparent text-text-secondary'
                                            }`}
                                    >
                                        <span className="text-lg">{getMealEmoji(type)}</span>
                                        <span>{getMealLabel(type)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Food Input */}
                        <div>
                            <label className="text-sm text-text-secondary mb-2 block">
                                What did you eat? 🍽️
                            </label>
                            <textarea
                                value={foodText}
                                onChange={(e) => setFoodText(e.target.value)}
                                placeholder="e.g., 2 eggs, 1 banana, 1 protein scoop, 2 roti with dal..."
                                rows={3}
                                className="w-full bg-surface-light border border-border rounded-xl px-4 py-3 text-text placeholder-text-muted focus:outline-none focus:border-primary transition-colors resize-none text-sm"
                            />
                            <p className="text-xs text-text-muted mt-1.5">
                                💡 Type naturally in English or Hinglish
                            </p>
                        </div>

                        {/* Quick Add Suggestions */}
                        <div>
                            <label className="text-sm text-text-secondary mb-2 block">Quick Add</label>
                            <div className="flex flex-wrap gap-2">
                                {quickAddSuggestions[mealType].map((suggestion, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleQuickAdd(suggestion)}
                                        className={`text-xs px-3 py-1.5 rounded-lg transition-all tap-scale ${foodText === suggestion
                                                ? 'bg-primary/30 text-primary-light border border-primary/50'
                                                : 'bg-surface-lighter text-text-secondary hover:bg-surface-light'
                                            }`}
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <div className="bg-danger/10 border border-danger/30 rounded-xl p-3 text-sm text-danger">
                                {error}
                            </div>
                        )}
                    </>
                ) : (
                    /* Review Step */
                    <>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{getMealEmoji(mealType)}</span>
                            <h3 className="font-medium">{getMealLabel(mealType)} Items</h3>
                        </div>

                        <div className="space-y-2.5">
                            {parsedItems.map((item) => (
                                <div key={item.id} className="glass rounded-xl p-3.5 animate-slide-in">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <p className="font-medium text-sm">{item.name}</p>
                                            <p className="text-xs text-text-muted">{item.quantity}</p>
                                        </div>
                                        <button
                                            onClick={() => removeItem(item.id)}
                                            className="text-text-muted hover:text-danger transition-colors p-0.5"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M18 6L6 18M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        <div className="text-center bg-surface-lighter rounded-lg py-1.5">
                                            <p className="text-xs font-semibold text-accent">{item.nutrition.calories}</p>
                                            <p className="text-[10px] text-text-muted">kcal</p>
                                        </div>
                                        <div className="text-center bg-surface-lighter rounded-lg py-1.5">
                                            <p className="text-xs font-semibold text-[#f87171]">{item.nutrition.protein}g</p>
                                            <p className="text-[10px] text-text-muted">protein</p>
                                        </div>
                                        <div className="text-center bg-surface-lighter rounded-lg py-1.5">
                                            <p className="text-xs font-semibold text-[#60a5fa]">{item.nutrition.carbs}g</p>
                                            <p className="text-[10px] text-text-muted">carbs</p>
                                        </div>
                                        <div className="text-center bg-surface-lighter rounded-lg py-1.5">
                                            <p className="text-xs font-semibold text-[#fbbf24]">{item.nutrition.fat}g</p>
                                            <p className="text-[10px] text-text-muted">fat</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Total */}
                        {parsedItems.length > 0 && (
                            <div className="gradient-border">
                                <div className="bg-card rounded-2xl p-4">
                                    <p className="text-sm font-medium mb-2">Meal Total</p>
                                    <div className="grid grid-cols-4 gap-3 text-center">
                                        <div>
                                            <p className="text-lg font-bold text-accent">{sumNutrition(parsedItems).calories}</p>
                                            <p className="text-[10px] text-text-muted">kcal</p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-[#f87171]">{sumNutrition(parsedItems).protein}g</p>
                                            <p className="text-[10px] text-text-muted">protein</p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-[#60a5fa]">{sumNutrition(parsedItems).carbs}g</p>
                                            <p className="text-[10px] text-text-muted">carbs</p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-[#fbbf24]">{sumNutrition(parsedItems).fat}g</p>
                                            <p className="text-[10px] text-text-muted">fat</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => { setStep('input'); }}
                            className="text-sm text-primary-light tap-scale"
                        >
                            ← Edit food items
                        </button>
                    </>
                )}
            </div>

            {/* Bottom Action */}
            <div className="p-4 border-t border-border/50 glass-strong pb-safe">
                {step === 'input' ? (
                    <button
                        onClick={handleAnalyze}
                        disabled={!foodText.trim() || loading}
                        className={`w-full py-3.5 rounded-xl font-medium transition-all tap-scale ${foodText.trim() && !loading
                                ? 'bg-primary hover:bg-primary-dark text-white pulse-glow'
                                : 'bg-surface-lighter text-text-muted cursor-not-allowed'
                            }`}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Analyzing...
                            </span>
                        ) : (
                            '🔍 Analyze Nutrition'
                        )}
                    </button>
                ) : (
                    <button
                        onClick={handleSave}
                        disabled={parsedItems.length === 0}
                        className="w-full py-3.5 rounded-xl bg-success hover:bg-success/80 text-white font-medium transition-all tap-scale"
                    >
                        ✅ Log This Meal
                    </button>
                )}
            </div>
        </div>
    );
}
