'use client';

import { useState } from 'react';
import { UserProfile, Goal, ActivityLevel } from '@/lib/types';
import { saveProfile } from '@/lib/storage';
import { calculateDailyTargets } from '@/lib/nutrition';

interface Props {
    onComplete: (profile: UserProfile) => void;
    existingProfile?: UserProfile | null;
}

const goals: { value: Goal; label: string; emoji: string; desc: string }[] = [
    { value: 'muscle_building', label: 'Muscle Building', emoji: '💪', desc: 'Gain lean muscle mass' },
    { value: 'weight_loss', label: 'Weight Loss', emoji: '🔥', desc: 'Lose fat, stay fit' },
    { value: 'maintain', label: 'Maintain', emoji: '⚖️', desc: 'Stay at current weight' },
];

const activityLevels: { value: ActivityLevel; label: string; desc: string }[] = [
    { value: 'sedentary', label: 'Sedentary', desc: 'Desk job, no exercise' },
    { value: 'light', label: 'Lightly Active', desc: '1-3 days/week exercise' },
    { value: 'moderate', label: 'Moderately Active', desc: '3-5 days/week exercise' },
    { value: 'active', label: 'Very Active', desc: '6-7 days/week exercise' },
    { value: 'very_active', label: 'Athlete', desc: 'Intense daily training' },
];

export default function ProfileSetup({ onComplete, existingProfile }: Props) {
    const [step, setStep] = useState(0);
    const [name, setName] = useState(existingProfile?.name || '');
    const [weight, setWeight] = useState(existingProfile?.weight || 70);
    const [height, setHeight] = useState(existingProfile?.height || 170);
    const [age, setAge] = useState(existingProfile?.age || 25);
    const [gender, setGender] = useState<'male' | 'female'>(existingProfile?.gender || 'male');
    const [goal, setGoal] = useState<Goal>(existingProfile?.goal || 'muscle_building');
    const [activityLevel, setActivityLevel] = useState<ActivityLevel>(existingProfile?.activityLevel || 'moderate');

    const handleSubmit = () => {
        const profile: UserProfile = {
            name: name || 'User',
            weight,
            height,
            age,
            gender,
            goal,
            activityLevel,
            createdAt: existingProfile?.createdAt || new Date().toISOString(),
        };
        saveProfile(profile);
        onComplete(profile);
    };

    const nextStep = () => {
        if (step < 3) setStep(step + 1);
        else handleSubmit();
    };

    const prevStep = () => {
        if (step > 0) setStep(step - 1);
    };

    const targets = calculateDailyTargets({
        name: name || 'User', weight, height, age, gender, goal, activityLevel,
        createdAt: '',
    });

    return (
        <div className="min-h-dvh flex flex-col px-5 py-8">
            {/* Header */}
            <div className="text-center mb-8 animate-fade-in-up">
                <h1 className="text-3xl font-bold gradient-text mb-2">NutriTrack</h1>
                <p className="text-text-secondary text-sm">Your Indian Diet Companion</p>
            </div>

            {/* Progress */}
            <div className="flex gap-2 mb-8">
                {[0, 1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= step ? 'bg-primary' : 'bg-surface-lighter'
                            }`}
                    />
                ))}
            </div>

            {/* Step 0: Basics */}
            {step === 0 && (
                <div className="flex-1 animate-fade-in-up">
                    <h2 className="text-xl font-semibold mb-1">Hey there! 👋</h2>
                    <p className="text-text-secondary text-sm mb-6">Let&apos;s personalize your nutrition plan</p>

                    <div className="space-y-4">
                        <div>
                            <label className="text-sm text-text-secondary mb-1.5 block">Your Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter your name"
                                className="w-full bg-surface-light border border-border rounded-xl px-4 py-3.5 text-text placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-text-secondary mb-1.5 block">Age</label>
                                <input
                                    type="number"
                                    value={age}
                                    onChange={(e) => setAge(Number(e.target.value))}
                                    className="w-full bg-surface-light border border-border rounded-xl px-4 py-3.5 text-text focus:outline-none focus:border-primary transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-text-secondary mb-1.5 block">Gender</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setGender('male')}
                                        className={`flex-1 py-3.5 rounded-xl text-sm font-medium transition-all ${gender === 'male'
                                                ? 'bg-primary text-white'
                                                : 'bg-surface-light border border-border text-text-secondary'
                                            }`}
                                    >
                                        👨 Male
                                    </button>
                                    <button
                                        onClick={() => setGender('female')}
                                        className={`flex-1 py-3.5 rounded-xl text-sm font-medium transition-all ${gender === 'female'
                                                ? 'bg-primary text-white'
                                                : 'bg-surface-light border border-border text-text-secondary'
                                            }`}
                                    >
                                        👩 Female
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-text-secondary mb-1.5 block">Weight (kg)</label>
                                <input
                                    type="number"
                                    value={weight}
                                    onChange={(e) => setWeight(Number(e.target.value))}
                                    className="w-full bg-surface-light border border-border rounded-xl px-4 py-3.5 text-text focus:outline-none focus:border-primary transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-text-secondary mb-1.5 block">Height (cm)</label>
                                <input
                                    type="number"
                                    value={height}
                                    onChange={(e) => setHeight(Number(e.target.value))}
                                    className="w-full bg-surface-light border border-border rounded-xl px-4 py-3.5 text-text focus:outline-none focus:border-primary transition-colors"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 1: Goal */}
            {step === 1 && (
                <div className="flex-1 animate-fade-in-up">
                    <h2 className="text-xl font-semibold mb-1">What&apos;s your goal? 🎯</h2>
                    <p className="text-text-secondary text-sm mb-6">We&apos;ll optimize your nutrition accordingly</p>

                    <div className="space-y-3">
                        {goals.map((g) => (
                            <button
                                key={g.value}
                                onClick={() => setGoal(g.value)}
                                className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all tap-scale ${goal === g.value
                                        ? 'bg-primary/20 border-2 border-primary'
                                        : 'bg-surface-light border-2 border-transparent hover:border-border'
                                    }`}
                            >
                                <span className="text-3xl">{g.emoji}</span>
                                <div className="text-left">
                                    <p className="font-medium">{g.label}</p>
                                    <p className="text-sm text-text-secondary">{g.desc}</p>
                                </div>
                                {goal === g.value && (
                                    <span className="ml-auto text-primary">✓</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 2: Activity Level */}
            {step === 2 && (
                <div className="flex-1 animate-fade-in-up">
                    <h2 className="text-xl font-semibold mb-1">Activity Level 🏃</h2>
                    <p className="text-text-secondary text-sm mb-6">How active are you daily?</p>

                    <div className="space-y-2.5">
                        {activityLevels.map((a) => (
                            <button
                                key={a.value}
                                onClick={() => setActivityLevel(a.value)}
                                className={`w-full flex items-center gap-3 p-3.5 rounded-xl transition-all tap-scale ${activityLevel === a.value
                                        ? 'bg-primary/20 border-2 border-primary'
                                        : 'bg-surface-light border-2 border-transparent hover:border-border'
                                    }`}
                            >
                                <div className="text-left flex-1">
                                    <p className="font-medium text-sm">{a.label}</p>
                                    <p className="text-xs text-text-secondary">{a.desc}</p>
                                </div>
                                {activityLevel === a.value && (
                                    <span className="text-primary text-sm">✓</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 3: Summary */}
            {step === 3 && (
                <div className="flex-1 animate-fade-in-up">
                    <h2 className="text-xl font-semibold mb-1">Your Plan ✨</h2>
                    <p className="text-text-secondary text-sm mb-6">Here&apos;s your personalized daily targets</p>

                    <div className="glass rounded-2xl p-5 mb-4">
                        <div className="text-center mb-4">
                            <p className="text-4xl font-bold gradient-text">{targets.calories}</p>
                            <p className="text-text-secondary text-sm">Daily Calories</p>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-surface rounded-xl p-3 text-center">
                                <p className="text-lg font-bold text-[#f87171]">{targets.protein}g</p>
                                <p className="text-xs text-text-secondary">Protein</p>
                            </div>
                            <div className="bg-surface rounded-xl p-3 text-center">
                                <p className="text-lg font-bold text-[#60a5fa]">{targets.carbs}g</p>
                                <p className="text-xs text-text-secondary">Carbs</p>
                            </div>
                            <div className="bg-surface rounded-xl p-3 text-center">
                                <p className="text-lg font-bold text-[#fbbf24]">{targets.fat}g</p>
                                <p className="text-xs text-text-secondary">Fat</p>
                            </div>
                        </div>
                    </div>

                    <div className="glass rounded-2xl p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-text-secondary">Name</span>
                            <span>{name || 'User'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-text-secondary">Stats</span>
                            <span>{weight}kg · {height}cm · {age}y</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-text-secondary">Goal</span>
                            <span>{goals.find((g) => g.value === goal)?.label}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-text-secondary">Activity</span>
                            <span>{activityLevels.find((a) => a.value === activityLevel)?.label}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 mt-6">
                {step > 0 && (
                    <button
                        onClick={prevStep}
                        className="flex-1 py-3.5 rounded-xl bg-surface-light border border-border text-text-secondary font-medium tap-scale"
                    >
                        Back
                    </button>
                )}
                <button
                    onClick={nextStep}
                    className="flex-1 py-3.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-medium transition-colors tap-scale pulse-glow"
                >
                    {step === 3 ? "Let's Go! 🚀" : 'Continue'}
                </button>
            </div>
        </div>
    );
}
