'use client';

import { useState } from 'react';
import { ApiError, signIn, signUp } from '@/lib/storage';

interface Props {
    onAuthenticated: () => Promise<void> | void;
}

type Mode = 'login' | 'signup';

export default function AuthScreen({ onAuthenticated }: Props) {
    const [mode, setMode] = useState<Mode>('login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(true);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            if (mode === 'signup') {
                await signUp({ name, email, password, rememberMe });
            } else {
                await signIn({ email, password, rememberMe });
            }

            await onAuthenticated();
        } catch (submitError) {
            if (submitError instanceof ApiError) {
                setError(submitError.message);
            } else {
                setError('Something went wrong. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="app-shell min-h-dvh">
            <div className="screen flex min-h-dvh flex-col justify-between gap-6 pb-8">
                <div>
                    <section className="meal-photo animate-rise-in min-h-36 rounded-lg p-4 text-white shadow-[0_18px_40px_rgba(21,24,22,0.18)]">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-white/80">NutriTrack</p>
                        <h1 className="mt-2 max-w-[16rem] text-3xl font-black leading-tight">Private meal logs for your whole friend group.</h1>
                        <p className="mt-3 max-w-[16rem] text-sm font-semibold text-white/88">
                            Create an account, keep your own data, and pick up right where you left off.
                        </p>
                    </section>

                    <div className="mt-6 flex rounded-lg border border-line bg-white p-1">
                        <ModeButton active={mode === 'login'} onClick={() => setMode('login')}>
                            Sign in
                        </ModeButton>
                        <ModeButton active={mode === 'signup'} onClick={() => setMode('signup')}>
                            Create account
                        </ModeButton>
                    </div>

                    <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                        {mode === 'signup' && (
                            <div>
                                <label className="mb-2 block text-sm font-black text-ink" htmlFor="name">
                                    Name
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    className="input-field"
                                    autoComplete="name"
                                    placeholder="Your name"
                                    required
                                />
                            </div>
                        )}

                        <div>
                            <label className="mb-2 block text-sm font-black text-ink" htmlFor="email">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                className="input-field"
                                autoComplete="email"
                                placeholder="you@example.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-black text-ink" htmlFor="password">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                className="input-field"
                                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                                placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
                                required
                                minLength={8}
                            />
                        </div>

                        <label className="flex items-start gap-3 rounded-lg border border-line bg-white px-3 py-3 text-sm font-semibold text-ink-soft">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(event) => setRememberMe(event.target.checked)}
                                className="mt-1 h-4 w-4 accent-[var(--color-brand)]"
                            />
                            <span>
                                Keep me signed in on this device.
                                <span className="mt-1 block text-xs font-bold text-muted">
                                    Browsers can also save the email and password automatically.
                                </span>
                            </span>
                        </label>

                        {error && (
                            <div className="rounded-lg border border-danger/20 bg-chili-soft px-3 py-3 text-sm font-bold text-danger">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="primary-button tap-scale flex w-full items-center justify-center"
                            disabled={isSubmitting}
                        >
                            {isSubmitting
                                ? (mode === 'signup' ? 'Creating account...' : 'Signing in...')
                                : (mode === 'signup' ? 'Create account' : 'Sign in')}
                        </button>
                    </form>
                </div>

                <div className="surface-quiet rounded-lg p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-strong">Good to know</p>
                    <ul className="mt-3 space-y-2 text-sm font-semibold text-ink-soft">
                        <li>Your meals stay separate from everyone else.</li>
                        <li>Logging works across phones and browsers once you sign in.</li>
                        <li>Google sign-in can be added on top of this next.</li>
                    </ul>
                </div>
            </div>
        </main>
    );
}

function ModeButton({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`tap-scale min-h-11 flex-1 rounded-md text-sm font-black ${active
                ? 'bg-brand text-white shadow-[0_10px_22px_rgba(11,107,88,0.18)]'
                : 'text-muted'
                }`}
        >
            {children}
        </button>
    );
}
