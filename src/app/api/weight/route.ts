import { NextRequest, NextResponse } from 'next/server';
import { getWeightEntriesForUser, saveWeightEntryForUser } from '@/lib/database';
import { getRequestSession, readDateString, readRequestedDateFromUrl, readRequestedDays } from '@/lib/request';
import { WeightEntry } from '@/lib/types';

export const runtime = 'nodejs';

function isWeightEntryInput(value: unknown): value is Omit<WeightEntry, 'id'> {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const entry = value as Omit<WeightEntry, 'id'>;
    return (
        typeof entry.date === 'string' &&
        Boolean(readDateString(entry.date)) &&
        Number.isFinite(entry.weightKg) &&
        entry.weightKg >= 20 &&
        entry.weightKg <= 300 &&
        typeof entry.notes === 'string'
    );
}

export async function GET(request: NextRequest) {
    try {
        const session = await getRequestSession(request);
        if (!session.user) {
            return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
        }

        const date = readRequestedDateFromUrl(request);
        if (!date) {
            return NextResponse.json({ error: 'A local date is required.' }, { status: 400 });
        }

        const entries = await getWeightEntriesForUser(session.user.id, readRequestedDays(request), date);
        return NextResponse.json({ entries });
    } catch (error) {
        console.error('Get weight entries error:', error);
        return NextResponse.json({ error: 'Unable to load weight entries right now.' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getRequestSession(request);
        if (!session.user) {
            return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
        }

        const body = await request.json();
        const entry = body.entry;

        if (!isWeightEntryInput(entry)) {
            return NextResponse.json({ error: 'Weight entry is invalid.' }, { status: 400 });
        }

        const savedEntry = await saveWeightEntryForUser(session.user.id, {
            ...entry,
            notes: entry.notes.trim(),
        });

        return NextResponse.json({ entry: savedEntry });
    } catch (error) {
        console.error('Save weight entry error:', error);
        return NextResponse.json({ error: 'Unable to save this weight entry right now.' }, { status: 500 });
    }
}
