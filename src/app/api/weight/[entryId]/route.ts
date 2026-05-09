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
  { params }: { params: Promise<{ entryId: string }> }
) {
  const { entryId } = await params;

  if (!entryId) {
    return NextResponse.json({ error: 'entryId required' }, { status: 400 });
  }

  try {
    await ensureDatabaseReady();
    const pool = getPool();
    await pool.query('DELETE FROM weight_logs WHERE id = $1', [entryId]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/weight/[entryId] error:', error);
    return NextResponse.json({ error: 'Failed to delete weight entry' }, { status: 500 });
  }
}
