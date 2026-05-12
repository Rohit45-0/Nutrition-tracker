import { NextRequest, NextResponse } from 'next/server';
import { deleteWorkoutForUser } from '@/lib/database';
import { getRequestSession } from '@/lib/request';

export const runtime = 'nodejs';

export async function DELETE(_request: NextRequest, context: RouteContext<'/api/workouts/[workoutId]'>) {
    try {
        const session = await getRequestSession(_request);
        if (!session.user) {
            return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
        }

        const { workoutId } = await context.params;
        const deleted = await deleteWorkoutForUser(session.user.id, workoutId);

        if (!deleted) {
            return NextResponse.json({ error: 'Workout was not found.' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete workout error:', error);
        return NextResponse.json({ error: 'Unable to delete this workout right now.' }, { status: 500 });
    }
}
