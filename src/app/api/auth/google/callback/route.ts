import { NextRequest, NextResponse } from 'next/server';
import { createSession, findOrCreateGoogleUser, getSessionCookieName, getSessionCookieOptions } from '@/lib/database';
import {
    exchangeGoogleCodeForUser,
    getClearedGoogleStateCookieOptions,
    getGoogleOAuthConfig,
    getGoogleStateCookieName,
} from '@/lib/google-auth';

export const runtime = 'nodejs';

function redirectWithError(request: NextRequest, errorCode: string) {
    const response = NextResponse.redirect(new URL(`/?auth_error=${errorCode}`, request.nextUrl.origin));
    response.cookies.set(getGoogleStateCookieName(), '', getClearedGoogleStateCookieOptions());
    return response;
}

export async function GET(request: NextRequest) {
    const config = getGoogleOAuthConfig(request.nextUrl.origin);
    if (!config) {
        return redirectWithError(request, 'google_config');
    }

    const stateCookie = request.cookies.get(getGoogleStateCookieName())?.value;
    const state = request.nextUrl.searchParams.get('state');
    const error = request.nextUrl.searchParams.get('error');
    const code = request.nextUrl.searchParams.get('code');

    if (error) {
        return redirectWithError(request, 'google_denied');
    }

    if (!stateCookie || !state || stateCookie !== state) {
        return redirectWithError(request, 'google_state');
    }

    if (!code) {
        return redirectWithError(request, 'google_code');
    }

    try {
        const googleUser = await exchangeGoogleCodeForUser(code, config);
        const user = await findOrCreateGoogleUser({
            googleId: googleUser.sub,
            email: googleUser.email,
            name: googleUser.name || googleUser.given_name || 'User',
        });

        const session = await createSession(user.id, true);
        const response = NextResponse.redirect(new URL('/', config.appUrl));
        response.cookies.set(getGoogleStateCookieName(), '', getClearedGoogleStateCookieOptions());
        response.cookies.set(
            getSessionCookieName(),
            session.token,
            getSessionCookieOptions(true, session.expiresAt)
        );

        return response;
    } catch (callbackError) {
        console.error('Google auth callback error:', callbackError);
        return redirectWithError(request, 'google_failed');
    }
}
