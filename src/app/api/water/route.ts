import { NextRequest, NextResponse } from 'next/server';
import { updateWaterForUser } from '@/lib/database';
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
        const waterGlasses = Number(body.waterGlasses);

        if (!date) {
            return NextResponse.json({ error: 'A local date is required.' }, { status: 400 });
        }

        if (!Number.isFinite(waterGlasses) || waterGlasses < 0 || waterGlasses > 12) {
            return NextResponse.json({ error: 'Water value must be between 0 and 12.' }, { status: 400 });
        }

        const result = await updateWaterForUser(session.user.id, date, Math.round(waterGlasses));
        return NextResponse.json(result);
    } catch (error) {
        console.error('Water update error:', error);
        return NextResponse.json({ error: 'Unable to update water right now.' }, { status: 500 });
    }
}
