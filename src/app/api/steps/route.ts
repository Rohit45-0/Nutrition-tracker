import { NextRequest, NextResponse } from 'next/server';
import { saveStepEntryForUser } from '@/lib/database';
import { getRequestSession, readDateString } from '@/lib/request';

export const runtime = 'nodejs';

export async function PUT(request: NextRequest) {
    try {
        const session = await getRequestSession(request);
        if (!session.user) {
            return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
        }

        const body = await request.json();
        const date = readDateString(body.date);
        const steps = Number(body.steps);

        if (!date) {
            return NextResponse.json({ error: 'A local date is required.' }, { status: 400 });
        }

        if (!Number.isFinite(steps) || steps < 0 || steps > 100000) {
            return NextResponse.json({ error: 'Step count must be between 0 and 100000.' }, { status: 400 });
        }

        const entry = await saveStepEntryForUser(session.user.id, date, Math.round(steps));
        return NextResponse.json({ entry });
    } catch (error) {
        console.error('Step update error:', error);
        return NextResponse.json({ error: 'Unable to update steps right now.' }, { status: 500 });
    }
}
