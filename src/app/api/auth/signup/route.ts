import { NextRequest, NextResponse } from 'next/server';
import {
    createSession,
    createUserAccount,
    getSessionCookieName,
    getSessionCookieOptions,
} from '@/lib/database';

export const runtime = 'nodejs';

function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const email = typeof body.email === 'string' ? body.email.trim() : '';
        const password = typeof body.password === 'string' ? body.password : '';
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        const rememberMe = Boolean(body.rememberMe);

        if (!name) {
            return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 });
        }

        if (!isValidEmail(email)) {
            return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
        }

        const user = await createUserAccount({ email, name, password });
        const session = await createSession(user.id, rememberMe);

        const response = NextResponse.json({ user });
        response.cookies.set(
            getSessionCookieName(),
            session.token,
            getSessionCookieOptions(rememberMe, session.expiresAt)
        );

        return response;
    } catch (error) {
        console.error('Signup error:', error);

        if (error instanceof Error) {
            const status = error.message.includes('already exists') ? 409 : 500;
            return NextResponse.json({ error: error.message }, { status });
        }

        return NextResponse.json({ error: 'Unable to create your account right now.' }, { status: 500 });
    }
}
