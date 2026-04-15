'use client';

import { UserProfile, DailyTargets } from '@/lib/types';
import { getGoalLabel } from '@/lib/nutrition';

interface Props {
    profile: UserProfile;
    targets: DailyTargets;
    onEditProfile: () => void;
    totalDays: number;
}

export default function Settings({ profile, targets, onEditProfile, totalDays }: Props) {
    return (
        <div className="px-4 pb-28 pt-6 space-y-5">
            <h1 className="text-xl font-bold animate-fade-in-up">⚙️ Settings</h1>

            {/* Profile Card */}
            <div className="glass rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-2xl">
                        {profile.gender === 'male' ? '🧑' : '👩'}
                    </div>
                    <div>
                        <p className="font-semibold text-lg">{profile.name}</p>
                        <p className="text-xs text-text-muted">{getGoalLabel(profile.goal)}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-surface rounded-xl p-3">
                        <p className="text-xs text-text-muted">Weight</p>
                        <p className="font-semibold">{profile.weight} kg</p>
                    </div>
                    <div className="bg-surface rounded-xl p-3">
                        <p className="text-xs text-text-muted">Height</p>
                        <p className="font-semibold">{profile.height} cm</p>
                    </div>
                    <div className="bg-surface rounded-xl p-3">
                        <p className="text-xs text-text-muted">Age</p>
                        <p className="font-semibold">{profile.age} years</p>
                    </div>
                    <div className="bg-surface rounded-xl p-3">
                        <p className="text-xs text-text-muted">Days Tracked</p>
                        <p className="font-semibold">{totalDays} days</p>
                    </div>
                </div>

                <button
                    onClick={onEditProfile}
                    className="w-full py-3 rounded-xl bg-primary/20 text-primary-light font-medium text-sm hover:bg-primary/30 transition-colors tap-scale"
                >
                    ✏️ Edit Profile
                </button>
            </div>

            {/* Daily Targets */}
            <div className="glass rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
                <h3 className="font-medium mb-3">🎯 Your Daily Targets</h3>
                <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-border/30">
                        <span className="text-sm text-text-secondary">Calories</span>
                        <span className="font-semibold text-accent">{targets.calories} kcal</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/30">
                        <span className="text-sm text-text-secondary">Protein</span>
                        <span className="font-semibold text-[#f87171]">{targets.protein}g</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/30">
                        <span className="text-sm text-text-secondary">Carbs</span>
                        <span className="font-semibold text-[#60a5fa]">{targets.carbs}g</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/30">
                        <span className="text-sm text-text-secondary">Fat</span>
                        <span className="font-semibold text-[#fbbf24]">{targets.fat}g</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-text-secondary">Fiber</span>
                        <span className="font-semibold text-success">{targets.fiber}g</span>
                    </div>
                </div>
            </div>

            {/* How Targets are Calculated */}
            <div className="glass rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <h3 className="font-medium mb-3">📐 How It&apos;s Calculated</h3>
                <div className="space-y-2 text-xs text-text-secondary">
                    <p>• <strong>BMR</strong> calculated using Mifflin-St Jeor equation</p>
                    <p>• <strong>TDEE</strong> = BMR × Activity multiplier</p>
                    <p>• <strong>Muscle Building:</strong> TDEE + 300 kcal surplus, 2g protein/kg</p>
                    <p>• <strong>Weight Loss:</strong> TDEE - 500 kcal deficit, 1.8g protein/kg</p>
                    <p>• <strong>Maintain:</strong> TDEE calories, 1.5g protein/kg</p>
                </div>
            </div>

            {/* Indian Diet Tips */}
            <div className="glass rounded-2xl p-5 animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
                <h3 className="font-medium mb-3">🇮🇳 Indian Diet Tips</h3>
                <div className="space-y-2 text-xs text-text-secondary">
                    {profile.goal === 'muscle_building' ? (
                        <>
                            <p>• Start your day with <strong>eggs + paneer bhurji</strong> for high protein</p>
                            <p>• Include <strong>dal/rajma/chole</strong> in every meal</p>
                            <p>• Post-workout: <strong>whey protein + banana</strong></p>
                            <p>• Snack on <strong>makhana, peanuts, or roasted chana</strong></p>
                            <p>• Night: <strong>paneer/chicken + roti</strong></p>
                        </>
                    ) : profile.goal === 'weight_loss' ? (
                        <>
                            <p>• Replace <strong>white rice with brown rice/quinoa</strong></p>
                            <p>• Have <strong>dal/sambar</strong> with more veggies</p>
                            <p>• Use <strong>roti instead of naan/paratha</strong></p>
                            <p>• Snack on <strong>fruits, sprouts, or buttermilk</strong></p>
                            <p>• Avoid <strong>fried snacks and sugary drinks</strong></p>
                        </>
                    ) : (
                        <>
                            <p>• Eat a <strong>balanced thali</strong> with all food groups</p>
                            <p>• Include <strong>seasonal fruits</strong> daily</p>
                            <p>• Stay hydrated with <strong>nimbu pani or coconut water</strong></p>
                            <p>• Have <strong>curd/raita</strong> with meals for probiotics</p>
                            <p>• Moderate portion sizes and eat mindfully</p>
                        </>
                    )}
                </div>
            </div>

            {/* App Info */}
            <div className="text-center py-4">
                <p className="text-xs text-text-muted">NutriTrack v1.0</p>
                <p className="text-xs text-text-muted">Made with ❤️ for Indian fitness enthusiasts</p>
            </div>
        </div>
    );
}
