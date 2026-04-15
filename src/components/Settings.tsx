'use client';

import { UserProfile, DailyTargets } from '@/lib/types';
import { getGoalLabel } from '@/lib/nutrition';

interface Props {
    profile: UserProfile;
    userEmail: string;
    targets: DailyTargets;
    onEditProfile: () => void;
    onSignOut: () => Promise<void> | void;
    totalDays: number;
}

export default function Settings({ profile, userEmail, targets, onEditProfile, onSignOut, totalDays }: Props) {
    const initials = profile.name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'NT';

    return (
        <div className="screen space-y-5">
            <header className="animate-rise-in">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-strong">Profile</p>
                <h1 className="ink-title mt-1 text-4xl font-black leading-none text-ink">Your setup</h1>
                <p className="mt-2 text-sm font-bold text-muted">Targets, body stats, and food guidance.</p>
            </header>

            <section className="surface animate-rise-in rounded-lg p-4" style={{ animationDelay: '70ms' }}>
                <div className="flex items-center gap-4">
                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-brand text-xl font-black text-white">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <h2 className="truncate text-2xl font-black text-ink">{profile.name}</h2>
                        <p className="text-sm font-bold text-muted">{getGoalLabel(profile.goal)}</p>
                        <p className="truncate text-xs font-bold text-faint">{userEmail}</p>
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                    <ProfileMetric label="Weight" value={`${profile.weight} kg`} />
                    <ProfileMetric label="Height" value={`${profile.height} cm`} />
                    <ProfileMetric label="Age" value={`${profile.age} years`} />
                    <ProfileMetric label="Tracked" value={`${totalDays} days`} />
                </div>

                <button
                    type="button"
                    onClick={onEditProfile}
                    className="secondary-button tap-scale mt-4 w-full"
                >
                    Edit profile
                </button>
                <button
                    type="button"
                    onClick={onSignOut}
                    className="tap-scale mt-3 w-full rounded-lg border border-line bg-white px-4 py-3 text-sm font-black text-ink-soft"
                >
                    Sign out
                </button>
            </section>

            <section className="surface animate-rise-in rounded-lg p-4" style={{ animationDelay: '120ms' }}>
                <div className="mb-4 flex items-baseline justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-black text-ink">Daily targets</h2>
                        <p className="text-sm font-semibold text-muted">Built from your goal and activity.</p>
                    </div>
                    <span className="rounded-lg bg-brand-soft px-3 py-2 text-sm font-black text-brand-strong">
                        {targets.calories} kcal
                    </span>
                </div>

                <div className="divide-y divide-line border-y border-line">
                    <TargetRow label="Protein" value={`${targets.protein}g`} className="text-chili" />
                    <TargetRow label="Carbs" value={`${targets.carbs}g`} className="text-sky" />
                    <TargetRow label="Fat" value={`${targets.fat}g`} className="text-warning" />
                    <TargetRow label="Fiber" value={`${targets.fiber}g`} className="text-brand-strong" />
                </div>
            </section>

            <section className="surface-quiet animate-rise-in rounded-lg p-4" style={{ animationDelay: '170ms' }}>
                <h2 className="text-lg font-black text-ink">How targets work</h2>
                <div className="mt-3 space-y-3 text-sm font-semibold text-ink-soft">
                    <p>BMR uses the Mifflin-St Jeor equation.</p>
                    <p>TDEE is BMR multiplied by your selected activity level.</p>
                    <p>Muscle building adds 300 kcal with 2g protein per kg.</p>
                    <p>Weight loss subtracts 500 kcal with 1.8g protein per kg.</p>
                    <p>Maintenance keeps TDEE with 1.5g protein per kg.</p>
                </div>
            </section>

            <section className="surface-quiet animate-rise-in rounded-lg p-4" style={{ animationDelay: '220ms' }}>
                <h2 className="text-lg font-black text-ink">Indian plate notes</h2>
                <div className="mt-3 space-y-3 text-sm font-semibold text-ink-soft">
                    {profile.goal === 'muscle_building' ? (
                        <>
                            <p>Pair roti or rice with dal, paneer, eggs, chicken, or fish instead of letting carbs stand alone.</p>
                            <p>Keep a quick protein option ready: whey, roasted chana, sprouts, curd, or boiled eggs.</p>
                            <p>Add vegetables to volume-heavy meals so the surplus stays useful.</p>
                        </>
                    ) : profile.goal === 'weight_loss' ? (
                        <>
                            <p>Build the plate around dal, curd, eggs, paneer, chicken, or fish before adding rice or roti.</p>
                            <p>Use smaller portions of fried snacks, sweets, sweet chai, naan, and paratha.</p>
                            <p>Choose filling sides: salad, sabzi, buttermilk, fruit, sprouts, or clear soup.</p>
                        </>
                    ) : (
                        <>
                            <p>Keep a balanced thali rhythm: protein, vegetables, carbs, curd, and water.</p>
                            <p>Use seasonal fruits and simple snacks to avoid random grazing.</p>
                            <p>Watch portions on restaurant meals, especially oil-heavy gravies and biryani.</p>
                        </>
                    )}
                </div>
            </section>

            <footer className="py-2 text-center">
                <p className="text-xs font-bold text-muted">NutriTrack v1.0</p>
                <p className="text-xs font-bold text-muted">Built for Indian meal tracking.</p>
            </footer>
        </div>
    );
}

function ProfileMetric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-line bg-white px-3 py-3">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-muted">{label}</p>
            <p className="mt-1 text-base font-black text-ink">{value}</p>
        </div>
    );
}

function TargetRow({ label, value, className }: { label: string; value: string; className: string }) {
    return (
        <div className="flex items-center justify-between gap-4 py-3">
            <span className="text-sm font-bold text-muted">{label}</span>
            <span className={`text-base font-black ${className}`}>{value}</span>
        </div>
    );
}
