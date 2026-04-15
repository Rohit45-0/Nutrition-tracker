import { NextRequest, NextResponse } from 'next/server';
import { deleteMealForUser } from '@/lib/database';
import { getRequestSession, readRequestedDateFromUrl } from '@/lib/request';

export const runtime = 'nodejs';

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
