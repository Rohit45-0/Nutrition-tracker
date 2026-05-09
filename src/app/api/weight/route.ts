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

async function ensureWeightTable(pool: InstanceType<typeof Pool>) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS weight_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      weight_kg NUMERIC(5,1) NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE (user_id, date)
    )
  `);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  try {
    await ensureDatabaseReady();
    const pool = getPool();
    await ensureWeightTable(pool);

    const rows = await pool.query(
      `SELECT id, user_id, date::text, weight_kg, notes, created_at
       FROM weight_logs WHERE user_id = $1 ORDER BY date DESC LIMIT 90`,
      [userId]
    );

    const entries = rows.rows.map((r) => ({
      id: r.id,
      date: r.date,
      weightKg: parseFloat(String(r.weight_kg)),
      notes: r.notes || '',
    }));

    return NextResponse.json({ entries });
  } catch (error) {
    console.error('GET /api/weight error:', error);
    return NextResponse.json({ error: 'Failed to fetch weight logs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, entry } = body;

    if (!userId || !entry) {
      return NextResponse.json({ error: 'userId and entry required' }, { status: 400 });
    }

    await ensureDatabaseReady();
    const pool = getPool();
    await ensureWeightTable(pool);

    const id = `wl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await pool.query(
      `INSERT INTO weight_logs (id, user_id, date, weight_kg, notes)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, date) DO UPDATE SET weight_kg = EXCLUDED.weight_kg, notes = EXCLUDED.notes`,
      [id, userId, entry.date, entry.weightKg, entry.notes || '']
    );

    return NextResponse.json({ entry: { ...entry, id } });
  } catch (error) {
    console.error('POST /api/weight error:', error);
    return NextResponse.json({ error: 'Failed to save weight entry' }, { status: 500 });
  }
}
