import { NextRequest, NextResponse } from 'next/server';
import { addWorkoutForUser, getWorkoutsForUser } from '@/lib/database';
import { getRequestSession, readDateString, readRequestedDateFromUrl, readRequestedDays } from '@/lib/request';
import { Exercise, WorkoutEntry, WorkoutCategory } from '@/lib/types';

export const runtime = 'nodejs';

function isWorkoutCategory(value: unknown): value is WorkoutCategory {
    return (
        value === 'strength' ||
        value === 'cardio' ||
        value === 'walking' ||
        value === 'mobility' ||
        value === 'custom'
    );
}

function isExercise(value: unknown): value is Exercise {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const exercise = value as Exercise;
    return (
        typeof exercise.id === 'string' &&
        typeof exercise.name === 'string' &&
        Number.isFinite(exercise.sets) &&
        Number.isFinite(exercise.reps) &&
        Number.isFinite(exercise.weightKg) &&
        Number.isFinite(exercise.durationMinutes)
    );
}

function isWorkoutInput(value: unknown): value is Omit<WorkoutEntry, 'id'> {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const workout = value as Omit<WorkoutEntry, 'id'>;
    return (
        typeof workout.name === 'string' &&
        workout.name.trim().length > 0 &&
        typeof workout.date === 'string' &&
        Boolean(readDateString(workout.date)) &&
        isWorkoutCategory(workout.category) &&
        Number.isFinite(workout.durationMinutes) &&
        workout.durationMinutes >= 0 &&
        typeof workout.notes === 'string' &&
        Array.isArray(workout.exercises) &&
        workout.exercises.every(isExercise)
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

        const workouts = await getWorkoutsForUser(session.user.id, readRequestedDays(request), date);
        return NextResponse.json({ workouts });
    } catch (error) {
        console.error('Get workouts error:', error);
        return NextResponse.json({ error: 'Unable to load workouts right now.' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getRequestSession(request);
        if (!session.user) {
            return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
        }

        const body = await request.json();
        const workout = body.workout;

        if (!isWorkoutInput(workout)) {
            return NextResponse.json({ error: 'Workout details are invalid.' }, { status: 400 });
        }

        const savedWorkout = await addWorkoutForUser(session.user.id, {
            ...workout,
            name: workout.name.trim(),
            notes: workout.notes.trim(),
            exercises: workout.exercises.map((exercise) => ({
                ...exercise,
                name: exercise.name.trim(),
            })),
        });

        return NextResponse.json({ workout: savedWorkout });
    } catch (error) {
        console.error('Save workout error:', error);
        return NextResponse.json({ error: 'Unable to save this workout right now.' }, { status: 500 });
    }
}
