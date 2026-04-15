import { NextRequest, NextResponse } from 'next/server';
import { buildBootstrapForUser } from '@/lib/database';
import { getRequestSession, readRequestedDateFromUrl, readRequestedDays } from '@/lib/request';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    try {
        const date = readRequestedDateFromUrl(request);
        if (!date) {
            return NextResponse.json({ error: 'A local date is required.' }, { status: 400 });
        }

        const session = await getRequestSession(request);
        if (!session.user) {
            return NextResponse.json({
                user: null,
                profile: null,
                todayLog: null,
                recentLogs: [],
                totalDays: 0,
            });
        }

        const bootstrap = await buildBootstrapForUser(session.user.id, date, readRequestedDays(request));
        return NextResponse.json(bootstrap);
    } catch (error) {
        console.error('Bootstrap error:', error);
        return NextResponse.json({ error: 'Unable to load app data right now.' }, { status: 500 });
    }
}
