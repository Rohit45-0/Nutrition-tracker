import { NextRequest, NextResponse } from 'next/server';
import {
    getClearedSessionCookieOptions,
    getSessionCookieName,
    invalidateSession,
} from '@/lib/database';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get(getSessionCookieName())?.value;
        await invalidateSession(token);

        const response = NextResponse.json({ success: true });
        response.cookies.set(getSessionCookieName(), '', getClearedSessionCookieOptions());

        return response;
    } catch (error) {
        console.error('Logout error:', error);
        return NextResponse.json({ error: 'Unable to sign you out right now.' }, { status: 500 });
    }
}
