import { NextRequest, NextResponse } from 'next/server';
import { saveHabitsForUser } from '@/lib/database';
import { getRequestSession, readDateString } from '@/lib/request';
import { HabitLog } from '@/lib/types';

export const runtime = 'nodejs';

function isValidHabit(habit: Partial<HabitLog>): habit is HabitLog {
    return (
        typeof habit.id === 'string' &&
        habit.id.length > 0 &&
        typeof habit.name === 'string' &&
        habit.name.trim().length > 0 &&
        (
            habit.category === 'nutrition' ||
            habit.category === 'hydration' ||
            habit.category === 'movement' ||
            habit.category === 'recovery'
        ) &&
        typeof habit.completed === 'boolean' &&
        Number.isFinite(habit.slot)
    );
}

export async function PUT(request: NextRequest) {
    try {
        const session = await getRequestSession(request);
        if (!session.user) {
            return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
        }

        const body = await request.json();
        const date = readDateString(body.date);
        const habits = Array.isArray(body.habits) ? (body.habits as Partial<HabitLog>[]) : [];

        if (!date) {
            return NextResponse.json({ error: 'A local date is required.' }, { status: 400 });
        }

        if (habits.length === 0 || habits.length > 6 || !habits.every(isValidHabit)) {
            return NextResponse.json({ error: 'Habit payload is invalid.' }, { status: 400 });
        }

        const savedHabits = await saveHabitsForUser(session.user.id, date, habits);
        return NextResponse.json({ habits: savedHabits });
    } catch (error) {
        console.error('Habit update error:', error);
        return NextResponse.json({ error: 'Unable to update habits right now.' }, { status: 500 });
    }
}
