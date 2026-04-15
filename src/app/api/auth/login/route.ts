import { NextRequest, NextResponse } from 'next/server';
import {
    createSession,
    getSessionCookieName,
    getSessionCookieOptions,
    getUserByEmail,
    verifyPassword,
} from '@/lib/database';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const email = typeof body.email === 'string' ? body.email.trim() : '';
        const password = typeof body.password === 'string' ? body.password : '';
        const rememberMe = Boolean(body.rememberMe);

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
        }

        const user = await getUserByEmail(email);
        if (!user || !user.password_hash) {
            return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
        }

        const isValidPassword = await verifyPassword(password, user.password_hash);
        if (!isValidPassword) {
            return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
        }

        const session = await createSession(user.id, rememberMe);
        const response = NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                createdAt: new Date(user.created_at).toISOString(),
            },
        });

        response.cookies.set(
            getSessionCookieName(),
            session.token,
            getSessionCookieOptions(rememberMe, session.expiresAt)
        );

        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Unable to sign you in right now.' }, { status: 500 });
    }
}
