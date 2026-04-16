import { NextRequest, NextResponse } from 'next/server';
import { deleteMealForUser, updateMealForUser } from '@/lib/database';
import { getRequestSession, readDateString, readRequestedDateFromUrl } from '@/lib/request';
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

export async function DELETE(request: NextRequest, context: RouteContext<'/api/meals/[mealId]'>) {
    try {
        const session = await getRequestSession(request);
        if (!session.user) {
            return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
        }

        const date = readRequestedDateFromUrl(request);
        if (!date) {
            return NextResponse.json({ error: 'A local date is required.' }, { status: 400 });
        }

        const { mealId } = await context.params;
        const result = await deleteMealForUser(session.user.id, date, mealId);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Delete meal error:', error);
        return NextResponse.json({ error: 'Unable to delete this meal right now.' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, context: RouteContext<'/api/meals/[mealId]'>) {
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

        const { mealId } = await context.params;
        const result = await updateMealForUser(session.user.id, date, mealId, meal);

        if (!result) {
            return NextResponse.json({ error: 'Meal was not found.' }, { status: 404 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Update meal error:', error);
        return NextResponse.json({ error: 'Unable to update this meal right now.' }, { status: 500 });
    }
}
