'use client';

import { useEffect, useState } from 'react';
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
    const [oauthError, setOauthError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const params = new URLSearchParams(window.location.search);
        const authError = params.get('auth_error');

        if (!authError) {
            return;
        }

        const errorMessages: Record<string, string> = {
            google_config: 'Google sign-in is not configured yet.',
            google_denied: 'Google sign-in was cancelled.',
            google_state: 'Google sign-in expired. Please try again.',
            google_code: 'Google sign-in did not return a code.',
            google_failed: 'Google sign-in failed. Please try again.',
        };

        setOauthError(errorMessages[authError] || 'Unable to sign in with Google.');
        window.history.replaceState({}, '', window.location.pathname);
    }, []);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');
        setOauthError('');
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
                        <a
                            href="/api/auth/google/start"
                            className="tap-scale flex min-h-12 w-full items-center justify-center gap-3 rounded-lg border border-line bg-white px-4 py-3 text-sm font-black text-ink"
                        >
                            <GoogleMark />
                            Continue with Google
                        </a>

                        <div className="flex items-center gap-3">
                            <div className="h-px flex-1 bg-line" />
                            <span className="text-xs font-black uppercase tracking-[0.14em] text-faint">or</span>
                            <div className="h-px flex-1 bg-line" />
                        </div>

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

                        {(error || oauthError) && (
                            <div className="rounded-lg border border-danger/20 bg-chili-soft px-3 py-3 text-sm font-bold text-danger">
                                {error || oauthError}
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

function GoogleMark() {
    return (
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18">
            <path fill="#EA4335" d="M9 7.364v3.49h4.848c-.213 1.121-.852 2.069-1.81 2.707l2.926 2.271C16.67 14.257 17.545 11.9 17.545 9c0-.545-.05-1.068-.141-1.636H9Z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.805 5.96-2.168l-2.926-2.271c-.804.54-1.833.86-3.034.86-2.35 0-4.343-1.587-5.056-3.716H.928v2.342A8.998 8.998 0 0 0 9 18Z" />
            <path fill="#4A90E2" d="M3.944 10.705A5.41 5.41 0 0 1 3.661 9c0-.593.102-1.17.283-1.705V4.953H.928A8.996 8.996 0 0 0 0 9c0 1.45.347 2.822.928 4.047l3.016-2.342Z" />
            <path fill="#FBBC05" d="M9 3.58c1.321 0 2.511.455 3.444 1.346l2.582-2.582C13.466.89 11.43 0 9 0A8.998 8.998 0 0 0 .928 4.953l3.016 2.342C4.657 5.166 6.65 3.58 9 3.58Z" />
        </svg>
    );
}
