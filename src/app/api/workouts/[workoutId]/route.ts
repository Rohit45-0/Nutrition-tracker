import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseReady } from '@/lib/database';
import pg from 'pg';
const { Pool } = pg;

function getPool() {
  if (!globalThis.nutritrackPool) {
    const connectionString = process.env.DATABASE_URL!;
    globalThis.nutritrackPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
  }
  return globalThis.nutritrackPool;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ workoutId: string }> }
) {
  const { workoutId } = await params;

  if (!workoutId) {
    return NextResponse.json({ error: 'workoutId required' }, { status: 400 });
  }

  try {
    await ensureDatabaseReady();
    const pool = getPool();
    await pool.query('DELETE FROM workouts WHERE id = $1', [workoutId]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/workouts/[workoutId] error:', error);
    return NextResponse.json({ error: 'Failed to delete workout' }, { status: 500 });
  }
}
