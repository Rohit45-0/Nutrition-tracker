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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  try {
    await ensureDatabaseReady();
    const pool = getPool();

    // Ensure workouts table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workouts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'strength',
        duration_minutes INTEGER DEFAULT 0,
        notes TEXT,
        exercises JSONB DEFAULT '[]'::JSONB,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    const rows = await pool.query(
      `SELECT id, user_id, date::text, name, category, duration_minutes, notes, exercises, created_at
       FROM workouts WHERE user_id = $1 ORDER BY date DESC, created_at DESC LIMIT 60`,
      [userId]
    );

    const workouts = rows.rows.map((r) => ({
      id: r.id,
      date: r.date,
      name: r.name,
      category: r.category,
      durationMinutes: r.duration_minutes,
      notes: r.notes || '',
      exercises: Array.isArray(r.exercises) ? r.exercises : [],
    }));

    return NextResponse.json({ workouts });
  } catch (error) {
    console.error('GET /api/workouts error:', error);
    return NextResponse.json({ error: 'Failed to fetch workouts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, workout } = body;

    if (!userId || !workout) {
      return NextResponse.json({ error: 'userId and workout required' }, { status: 400 });
    }

    await ensureDatabaseReady();
    const pool = getPool();

    await pool.query(`
      CREATE TABLE IF NOT EXISTS workouts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'strength',
        duration_minutes INTEGER DEFAULT 0,
        notes TEXT,
        exercises JSONB DEFAULT '[]'::JSONB,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    const id = `w_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await pool.query(
      `INSERT INTO workouts (id, user_id, date, name, category, duration_minutes, notes, exercises)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        userId,
        workout.date,
        workout.name,
        workout.category,
        workout.durationMinutes || 0,
        workout.notes || '',
        JSON.stringify(workout.exercises || []),
      ]
    );

    return NextResponse.json({ workout: { ...workout, id } });
  } catch (error) {
    console.error('POST /api/workouts error:', error);
    return NextResponse.json({ error: 'Failed to save workout' }, { status: 500 });
  }
}
