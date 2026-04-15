import { NextRequest, NextResponse } from 'next/server';
import { addMealForUser } from '@/lib/database';
import { getRequestSession, readDateString } from '@/lib/request';
import { MealEntry } from '@/lib/types';

export const runtime = 'nodejs';

function isMealEntry(value: unknown): value is MealEntry {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const meal = value as MealEntry;
    return (
        typeof meal.id === 'string' &&
        typeof meal.timestamp === 'string' &&
        Array.isArray(meal.items) &&
        typeof meal.totalNutrition === 'object'
    );
}

export async function POST(request: NextRequest) {
    try {
        const session = await getRequestSession(request);
        if (!session.user) {
            return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
        }

        const body = await request.json();
        const date = readDateString(body.date);
        const meal = body.meal;

        if (!date) {
            return NextResponse.json({ error: 'A local date is required.' }, { status: 400 });
        }

        if (!isMealEntry(meal)) {
            return NextResponse.json({ error: 'Meal data is invalid.' }, { status: 400 });
        }

        const result = await addMealForUser(session.user.id, date, meal);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Add meal error:', error);
        return NextResponse.json({ error: 'Unable to save this meal right now.' }, { status: 500 });
    }
}
