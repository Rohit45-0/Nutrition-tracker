import { randomBytes } from 'node:crypto';

const GOOGLE_AUTH_STATE_COOKIE = 'nutritrack_google_state';
const GOOGLE_AUTH_STATE_TTL_SECONDS = 10 * 60;

export interface GoogleOAuthConfig {
    clientId: string;
    clientSecret: string;
    appUrl: string;
    redirectUri: string;
}

interface GoogleTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
    id_token?: string;
}

interface GoogleUserInfo {
    sub: string;
    email: string;
    email_verified: boolean;
    name?: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
}

function normalizeUrl(url: string) {
    return url.replace(/\/$/, '');
}

export function resolveAppUrl(requestOrigin?: string) {
    const configured = process.env.APP_URL?.trim();
    if (configured) {
        return normalizeUrl(configured);
    }

    if (requestOrigin) {
        return normalizeUrl(requestOrigin);
    }

    return 'http://localhost:3000';
}

export function getGoogleOAuthConfig(requestOrigin?: string): GoogleOAuthConfig | null {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

    if (!clientId || !clientSecret) {
        return null;
    }

    const appUrl = resolveAppUrl(requestOrigin);

    return {
        clientId,
        clientSecret,
        appUrl,
        redirectUri: `${appUrl}/api/auth/google/callback`,
    };
}

export function getGoogleStateCookieName() {
    return GOOGLE_AUTH_STATE_COOKIE;
}

export function createGoogleState() {
    return randomBytes(24).toString('hex');
}

export function getGoogleStateCookieOptions() {
    return {
        httpOnly: true,
        sameSite: 'lax' as const,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: GOOGLE_AUTH_STATE_TTL_SECONDS,
    };
}

export function getClearedGoogleStateCookieOptions() {
    return {
        httpOnly: true,
        sameSite: 'lax' as const,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        expires: new Date(0),
    };
}

export function buildGoogleAuthorizationUrl(config: GoogleOAuthConfig, state: string) {
    const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        include_granted_scopes: 'true',
        prompt: 'select_account',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCodeForUser(code: string, config: GoogleOAuthConfig) {
    const tokenBody = new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
    });

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: tokenBody.toString(),
    });

    if (!tokenResponse.ok) {
        const tokenError = await tokenResponse.text().catch(() => '');
        throw new Error(`Google token exchange failed: ${tokenError}`);
    }

    const tokenData = (await tokenResponse.json()) as GoogleTokenResponse;
    if (!tokenData.access_token) {
        throw new Error('Google did not return an access token.');
    }

    const userResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
        },
    });

    if (!userResponse.ok) {
        const userError = await userResponse.text().catch(() => '');
        throw new Error(`Google userinfo fetch failed: ${userError}`);
    }

    const userInfo = (await userResponse.json()) as GoogleUserInfo;

    if (!userInfo.sub || !userInfo.email || !userInfo.email_verified) {
        throw new Error('Google account email is missing or not verified.');
    }

    return userInfo;
}
