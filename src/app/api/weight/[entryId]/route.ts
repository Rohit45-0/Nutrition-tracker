import { NextRequest, NextResponse } from 'next/server';
import { deleteWeightEntryForUser } from '@/lib/database';
import { getRequestSession } from '@/lib/request';

export const runtime = 'nodejs';

export async function DELETE(_request: NextRequest, context: RouteContext<'/api/weight/[entryId]'>) {
    try {
        const session = await getRequestSession(_request);
        if (!session.user) {
            return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
        }

        const { entryId } = await context.params;
        const deleted = await deleteWeightEntryForUser(session.user.id, entryId);

        if (!deleted) {
            return NextResponse.json({ error: 'Weight entry was not found.' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete weight entry error:', error);
        return NextResponse.json({ error: 'Unable to delete this weight entry right now.' }, { status: 500 });
    }
}
