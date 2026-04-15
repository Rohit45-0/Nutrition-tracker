import { NextRequest, NextResponse } from 'next/server';
import {
    buildGoogleAuthorizationUrl,
    createGoogleState,
    getGoogleOAuthConfig,
    getGoogleStateCookieName,
    getGoogleStateCookieOptions,
} from '@/lib/google-auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    const config = getGoogleOAuthConfig(request.nextUrl.origin);
    if (!config) {
        return NextResponse.redirect(new URL('/?auth_error=google_config', request.nextUrl.origin));
    }

    const state = createGoogleState();
    const response = NextResponse.redirect(buildGoogleAuthorizationUrl(config, state));
    response.cookies.set(getGoogleStateCookieName(), state, getGoogleStateCookieOptions());

    return response;
}
