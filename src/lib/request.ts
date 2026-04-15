import { NextRequest } from 'next/server';
import { getAuthUserBySessionToken, getSessionCookieName } from './database';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function readDateString(value: unknown) {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    return DATE_PATTERN.test(trimmed) ? trimmed : null;
}

export function readRequestedDateFromUrl(request: NextRequest) {
    return readDateString(request.nextUrl.searchParams.get('date'));
}

export function readRequestedDays(request: NextRequest) {
    const raw = Number(request.nextUrl.searchParams.get('days') ?? 30);
    if (!Number.isFinite(raw)) {
        return 30;
    }

    return Math.min(Math.max(Math.round(raw), 1), 90);
}

export async function getRequestSession(request: NextRequest) {
    const token = request.cookies.get(getSessionCookieName())?.value;
    const user = await getAuthUserBySessionToken(token);

    return {
        token,
        user,
    };
}
