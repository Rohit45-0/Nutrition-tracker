import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Pool, type QueryResultRow } from 'pg';
import { AppBootstrap, AuthUser, DayLog, HabitLog, MealEntry, NutritionInfo, StepEntry, UserProfile, WorkoutEntry, WeightEntry } from './types';
import { buildDailyHabitBlueprints, sumNutrition } from './nutrition';

const scrypt = promisify(scryptCallback);

const SESSION_COOKIE_NAME = 'nutritrack_session';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ZERO_NUTRITION: NutritionInfo = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
};
const DEFAULT_DIETARY_PREFERENCE: UserProfile['dietaryPreference'] = 'vegetarian';
const DEFAULT_INDIAN_FOOD_PREFERENCE: UserProfile['indianFoodPreference'] = 'mixed';
const DEFAULT_STEP_GOAL = 8000;
const DEFAULT_WATER_GOAL = 8;
const DEFAULT_WEEKLY_WORKOUT_GOAL = 4;
const DEFAULT_REMINDER_TIME = '08:00';

type DbUserRow = QueryResultRow & {
    id: string;
    email: string;
    name: string;
    password_hash: string | null;
    google_id: string | null;
    created_at: Date | string;
};

type DbProfileRow = QueryResultRow & {
    user_id: string;
    weight: number;
    height: number;
    age: number;
    gender: UserProfile['gender'];
    goal: UserProfile['goal'];
    activity_level: UserProfile['activityLevel'];
    dietary_preference: UserProfile['dietaryPreference'] | null;
    indian_food_preference: UserProfile['indianFoodPreference'] | null;
    disliked_foods: string[] | null;
    daily_step_goal: number | null;
    daily_water_goal: number | null;
    weekly_workout_goal: number | null;
    reminders_enabled: boolean | null;
    reminder_time: string | null;
    created_at: Date | string;
};

type DbDayLogRow = QueryResultRow & {
    id: string;
    user_id: string;
    date: Date | string;
    water_glasses: number;
    meals: MealEntry[] | string;
    total_nutrition: NutritionInfo | string;
};

type DbMealLogRow = QueryResultRow & {
    id: string;
    user_id: string;
    date: Date | string;
    meal_type: MealEntry['mealType'];
    logged_at: Date | string;
    total_nutrition: NutritionInfo | string;
    created_at: Date | string;
};

type DbMealItemRow = QueryResultRow & {
    id: string;
    meal_log_id: string;
    item_order: number;
    name: string;
    quantity: string;
    nutrition: NutritionInfo | string;
};

type DbHydrationLogRow = QueryResultRow & {
    id: string;
    user_id: string;
    date: Date | string;
    glasses: number;
    goal: number;
    created_at: Date | string;
};

type DbWorkoutRow = QueryResultRow & {
    id: string;
    user_id: string;
    date: Date | string;
    name: string;
    category: WorkoutEntry['category'];
    duration_minutes: number;
    notes: string | null;
    exercises: WorkoutEntry['exercises'] | string;
    created_at: Date | string;
};

type DbWeightLogRow = QueryResultRow & {
    id: string;
    user_id: string;
    date: Date | string;
    weight_kg: number | string;
    notes: string | null;
    created_at: Date | string;
};

type DbStepLogRow = QueryResultRow & {
    id: string;
    user_id: string;
    date: Date | string;
    steps: number;
    goal: number;
    source: StepEntry['source'];
    created_at: Date | string;
};

type DbHabitLogRow = QueryResultRow & {
    id: string;
    user_id: string;
    date: Date | string;
    name: string;
    category: HabitLog['category'];
    completed: boolean;
    slot: number;
    created_at: Date | string;
};

declare global {
    var nutritrackPool: Pool | undefined;
    var nutritrackSetupPromise: Promise<void> | undefined;
}

function getDatabaseUrl() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error('DATABASE_URL is not configured.');
    }
    return databaseUrl;
}

function shouldUseSsl(connectionString: string) {
    try {
        const url = new URL(connectionString);
        return !['localhost', '127.0.0.1'].includes(url.hostname);
    } catch {
        return true;
    }
}

function getPool() {
    if (!globalThis.nutritrackPool) {
        const connectionString = getDatabaseUrl();
        globalThis.nutritrackPool = new Pool({
            connectionString,
            ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
        });
    }

    return globalThis.nutritrackPool;
}

export async function ensureDatabaseReady() {
    if (!globalThis.nutritrackSetupPromise) {
        globalThis.nutritrackSetupPromise = (async () => {
            const pool = getPool();

            await pool.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT NOT NULL UNIQUE,
                    name TEXT NOT NULL DEFAULT 'User',
                    password_hash TEXT,
                    google_id TEXT UNIQUE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            `);

            await pool.query(`
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS google_id TEXT;
            `);

            await pool.query(`
                CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id
                ON users (google_id)
                WHERE google_id IS NOT NULL;
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS profiles (
                    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                    weight INTEGER NOT NULL,
                    height INTEGER NOT NULL,
                    age INTEGER NOT NULL,
                    gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
                    goal TEXT NOT NULL CHECK (goal IN ('muscle_building', 'weight_loss', 'maintain')),
                    activity_level TEXT NOT NULL CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
                    dietary_preference TEXT NOT NULL DEFAULT 'vegetarian' CHECK (dietary_preference IN ('vegetarian', 'eggetarian', 'non_vegetarian', 'vegan')),
                    indian_food_preference TEXT NOT NULL DEFAULT 'mixed' CHECK (indian_food_preference IN ('north_indian', 'south_indian', 'mixed', 'any')),
                    disliked_foods TEXT[] NOT NULL DEFAULT '{}'::text[],
                    daily_step_goal INTEGER NOT NULL DEFAULT 8000,
                    daily_water_goal INTEGER NOT NULL DEFAULT 8,
                    weekly_workout_goal INTEGER NOT NULL DEFAULT 4,
                    reminders_enabled BOOLEAN NOT NULL DEFAULT FALSE,
                    reminder_time TEXT NOT NULL DEFAULT '08:00',
                    created_at TIMESTAMPTZ NOT NULL,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            `);

            await pool.query(`
                ALTER TABLE profiles
                ADD COLUMN IF NOT EXISTS dietary_preference TEXT NOT NULL DEFAULT 'vegetarian';
            `);

            await pool.query(`
                ALTER TABLE profiles
                ADD COLUMN IF NOT EXISTS indian_food_preference TEXT NOT NULL DEFAULT 'mixed';
            `);

            await pool.query(`
                ALTER TABLE profiles
                ADD COLUMN IF NOT EXISTS disliked_foods TEXT[] NOT NULL DEFAULT '{}'::text[];
            `);

            await pool.query(`
                ALTER TABLE profiles
                ADD COLUMN IF NOT EXISTS daily_step_goal INTEGER NOT NULL DEFAULT 8000;
            `);

            await pool.query(`
                ALTER TABLE profiles
                ADD COLUMN IF NOT EXISTS daily_water_goal INTEGER NOT NULL DEFAULT 8;
            `);

            await pool.query(`
                ALTER TABLE profiles
                ADD COLUMN IF NOT EXISTS weekly_workout_goal INTEGER NOT NULL DEFAULT 4;
            `);

            await pool.query(`
                ALTER TABLE profiles
                ADD COLUMN IF NOT EXISTS reminders_enabled BOOLEAN NOT NULL DEFAULT FALSE;
            `);

            await pool.query(`
                ALTER TABLE profiles
                ADD COLUMN IF NOT EXISTS reminder_time TEXT NOT NULL DEFAULT '08:00';
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    token_hash TEXT NOT NULL UNIQUE,
                    expires_at TIMESTAMPTZ NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS day_logs (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    date DATE NOT NULL,
                    water_glasses INTEGER NOT NULL DEFAULT 0,
                    meals JSONB NOT NULL DEFAULT '[]'::jsonb,
                    total_nutrition JSONB NOT NULL DEFAULT '{"calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0}'::jsonb,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE (user_id, date)
                );
            `);

            await pool.query(`
                CREATE INDEX IF NOT EXISTS idx_day_logs_user_date
                ON day_logs (user_id, date DESC);
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS meal_logs (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    date DATE NOT NULL,
                    meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
                    logged_at TIMESTAMPTZ NOT NULL,
                    total_nutrition JSONB NOT NULL DEFAULT '{"calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0}'::jsonb,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            `);

            await pool.query(`
                CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date
                ON meal_logs (user_id, date DESC, logged_at ASC);
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS meal_items (
                    id TEXT PRIMARY KEY,
                    meal_log_id TEXT NOT NULL REFERENCES meal_logs(id) ON DELETE CASCADE,
                    item_order INTEGER NOT NULL DEFAULT 0,
                    name TEXT NOT NULL,
                    quantity TEXT NOT NULL,
                    nutrition JSONB NOT NULL DEFAULT '{"calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0}'::jsonb
                );
            `);

            await pool.query(`
                CREATE INDEX IF NOT EXISTS idx_meal_items_meal_order
                ON meal_items (meal_log_id, item_order ASC);
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS hydration_logs (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    date DATE NOT NULL,
                    glasses INTEGER NOT NULL DEFAULT 0,
                    goal INTEGER NOT NULL DEFAULT 8,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE (user_id, date)
                );
            `);

            await pool.query(`
                CREATE INDEX IF NOT EXISTS idx_hydration_logs_user_date
                ON hydration_logs (user_id, date DESC);
            `);

            await pool.query(`
                CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
                ON sessions (expires_at);
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS workouts (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    date DATE NOT NULL,
                    name TEXT NOT NULL,
                    category TEXT NOT NULL CHECK (category IN ('strength', 'cardio', 'walking', 'mobility', 'custom')),
                    duration_minutes INTEGER NOT NULL DEFAULT 0,
                    notes TEXT,
                    exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            `);

            await pool.query(`
                CREATE INDEX IF NOT EXISTS idx_workouts_user_date
                ON workouts (user_id, date DESC, created_at DESC);
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS weight_logs (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    date DATE NOT NULL,
                    weight_kg NUMERIC(5,1) NOT NULL,
                    notes TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE (user_id, date)
                );
            `);

            await pool.query(`
                CREATE INDEX IF NOT EXISTS idx_weight_logs_user_date
                ON weight_logs (user_id, date DESC);
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS step_logs (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    date DATE NOT NULL,
                    steps INTEGER NOT NULL DEFAULT 0,
                    goal INTEGER NOT NULL DEFAULT 8000,
                    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'device', 'imported')),
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE (user_id, date)
                );
            `);

            await pool.query(`
                CREATE INDEX IF NOT EXISTS idx_step_logs_user_date
                ON step_logs (user_id, date DESC);
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS habit_logs (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    date DATE NOT NULL,
                    name TEXT NOT NULL,
                    category TEXT NOT NULL CHECK (category IN ('nutrition', 'hydration', 'movement', 'recovery')),
                    completed BOOLEAN NOT NULL DEFAULT FALSE,
                    slot INTEGER NOT NULL DEFAULT 0,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE (user_id, date, slot)
                );
            `);

            await pool.query(`
                CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date
                ON habit_logs (user_id, date DESC, slot ASC);
            `);
        })().catch((error) => {
            globalThis.nutritrackSetupPromise = undefined;
            throw error;
        });
    }

    await globalThis.nutritrackSetupPromise;
}

function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}

function createEmptyDayLog(date: string): DayLog {
    return {
        date,
        meals: [],
        totalNutrition: { ...ZERO_NUTRITION },
        waterGlasses: 0,
    };
}

function shouldPersistLog(log: DayLog) {
    return (
        log.meals.length > 0 ||
        log.waterGlasses > 0 ||
        log.totalNutrition.calories > 0 ||
        log.totalNutrition.protein > 0 ||
        log.totalNutrition.carbs > 0 ||
        log.totalNutrition.fat > 0 ||
        log.totalNutrition.fiber > 0
    );
}

function normalizeDateValue(value: Date | string) {
    if (typeof value === 'string') {
        return value.slice(0, 10);
    }

    return value.toISOString().slice(0, 10);
}

function parseMeals(value: MealEntry[] | string) {
    if (typeof value === 'string') {
        try {
            return JSON.parse(value) as MealEntry[];
        } catch {
            return [];
        }
    }

    return value ?? [];
}

function parseNutrition(value: NutritionInfo | string): NutritionInfo {
    if (typeof value === 'string') {
        try {
            return JSON.parse(value) as NutritionInfo;
        } catch {
            return { ...ZERO_NUTRITION };
        }
    }

    return value ?? { ...ZERO_NUTRITION };
}

function parseExercises(value: WorkoutEntry['exercises'] | string) {
    if (typeof value === 'string') {
        try {
            return JSON.parse(value) as WorkoutEntry['exercises'];
        } catch {
            return [];
        }
    }

    return Array.isArray(value) ? value : [];
}

function parseTextArray(value: string[] | string | null | undefined) {
    if (Array.isArray(value)) {
        return value.filter((item) => typeof item === 'string' && item.trim().length > 0);
    }

    if (typeof value === 'string') {
        return value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return [];
}

function normalizeDislikedFoods(items: string[]) {
    return items
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 12);
}

function rowToAuthUser(row: DbUserRow): AuthUser {
    return {
        id: row.id,
        email: row.email,
        name: row.name,
        createdAt: new Date(row.created_at).toISOString(),
    };
}

function profileRowsToUserProfile(user: AuthUser, row: DbProfileRow): UserProfile {
    return {
        name: user.name,
        weight: Number(row.weight),
        height: Number(row.height),
        age: Number(row.age),
        gender: row.gender,
        goal: row.goal,
        activityLevel: row.activity_level,
        dietaryPreference: row.dietary_preference ?? DEFAULT_DIETARY_PREFERENCE,
        indianFoodPreference: row.indian_food_preference ?? DEFAULT_INDIAN_FOOD_PREFERENCE,
        dislikedFoods: parseTextArray(row.disliked_foods),
        dailyStepGoal: Number(row.daily_step_goal ?? DEFAULT_STEP_GOAL),
        dailyWaterGoal: Number(row.daily_water_goal ?? DEFAULT_WATER_GOAL),
        weeklyWorkoutGoal: Number(row.weekly_workout_goal ?? DEFAULT_WEEKLY_WORKOUT_GOAL),
        remindersEnabled: Boolean(row.reminders_enabled),
        reminderTime: row.reminder_time ?? DEFAULT_REMINDER_TIME,
        createdAt: new Date(row.created_at).toISOString(),
    };
}

function rowToDayLog(row: DbDayLogRow): DayLog {
    return {
        date: normalizeDateValue(row.date),
        meals: parseMeals(row.meals),
        totalNutrition: parseNutrition(row.total_nutrition),
        waterGlasses: Number(row.water_glasses),
    };
}

function rowToWorkout(row: DbWorkoutRow): WorkoutEntry {
    return {
        id: row.id,
        date: normalizeDateValue(row.date),
        name: row.name,
        category: row.category,
        durationMinutes: Number(row.duration_minutes),
        notes: row.notes ?? '',
        exercises: parseExercises(row.exercises),
    };
}

function rowToWeightEntry(row: DbWeightLogRow): WeightEntry {
    return {
        id: row.id,
        date: normalizeDateValue(row.date),
        weightKg: Number(row.weight_kg),
        notes: row.notes ?? '',
    };
}

function rowToStepEntry(row: DbStepLogRow): StepEntry {
    return {
        date: normalizeDateValue(row.date),
        steps: Number(row.steps),
        goal: Number(row.goal),
        source: row.source,
    };
}

function rowToHabitLog(row: DbHabitLogRow): HabitLog {
    return {
        id: row.id,
        date: normalizeDateValue(row.date),
        name: row.name,
        category: row.category,
        completed: Boolean(row.completed),
        slot: Number(row.slot),
    };
}

function rowToMealEntry(row: DbMealLogRow, items: DbMealItemRow[]): MealEntry {
    return {
        id: row.id,
        mealType: row.meal_type,
        timestamp: new Date(row.logged_at).toISOString(),
        totalNutrition: parseNutrition(row.total_nutrition),
        items: items.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            nutrition: parseNutrition(item.nutrition),
        })),
    };
}

function createEmptyStepEntry(date: string, goal = DEFAULT_STEP_GOAL): StepEntry {
    return {
        date,
        steps: 0,
        goal,
        source: 'manual',
    };
}

export async function hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const derived = (await scrypt(password, salt, 64)) as Buffer;
    return `${salt}:${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash: string) {
    const [salt, savedKey] = storedHash.split(':');
    if (!salt || !savedKey) {
        return false;
    }

    const derived = (await scrypt(password, salt, 64)) as Buffer;
    const savedBuffer = Buffer.from(savedKey, 'hex');

    if (savedBuffer.length !== derived.length) {
        return false;
    }

    return timingSafeEqual(savedBuffer, derived);
}

function hashSessionToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
}

export function getSessionCookieName() {
    return SESSION_COOKIE_NAME;
}

export function getSessionCookieOptions(rememberMe: boolean, expiresAt: Date) {
    return {
        httpOnly: true,
        sameSite: 'lax' as const,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        expires: rememberMe ? expiresAt : undefined,
    };
}

export function getClearedSessionCookieOptions() {
    return {
        httpOnly: true,
        sameSite: 'lax' as const,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        expires: new Date(0),
    };
}

export async function createUserAccount(input: {
    email: string;
    name: string;
    password: string;
}) {
    await ensureDatabaseReady();
    const pool = getPool();

    const email = normalizeEmail(input.email);
    const passwordHash = await hashPassword(input.password);

    try {
        const result = await pool.query<DbUserRow>(
            `
                INSERT INTO users (id, email, name, password_hash)
                VALUES ($1, $2, $3, $4)
                RETURNING id, email, name, password_hash, google_id, created_at;
            `,
            [randomUUID(), email, input.name.trim() || 'User', passwordHash]
        );

        return rowToAuthUser(result.rows[0]);
    } catch (error: unknown) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
            throw new Error('An account with that email already exists.');
        }

        throw error;
    }
}

export async function getUserByEmail(email: string) {
    await ensureDatabaseReady();
    const pool = getPool();
    const result = await pool.query<DbUserRow>(
        `
            SELECT id, email, name, password_hash, google_id, created_at
            FROM users
            WHERE email = $1
            LIMIT 1;
        `,
        [normalizeEmail(email)]
    );

    return result.rows[0] ?? null;
}

export async function getUserById(userId: string) {
    await ensureDatabaseReady();
    const pool = getPool();
    const result = await pool.query<DbUserRow>(
        `
            SELECT id, email, name, password_hash, google_id, created_at
            FROM users
            WHERE id = $1
            LIMIT 1;
        `,
        [userId]
    );

    const row = result.rows[0];
    return row ? rowToAuthUser(row) : null;
}

export async function findOrCreateGoogleUser(input: {
    googleId: string;
    email: string;
    name: string;
}) {
    await ensureDatabaseReady();
    const pool = getPool();
    const email = normalizeEmail(input.email);
    const displayName = input.name.trim() || 'User';

    const existingGoogleUser = await pool.query<DbUserRow>(
        `
            SELECT id, email, name, password_hash, google_id, created_at
            FROM users
            WHERE google_id = $1
            LIMIT 1;
        `,
        [input.googleId]
    );

    if (existingGoogleUser.rows[0]) {
        return rowToAuthUser(existingGoogleUser.rows[0]);
    }

    const existingEmailUser = await pool.query<DbUserRow>(
        `
            SELECT id, email, name, password_hash, google_id, created_at
            FROM users
            WHERE email = $1
            LIMIT 1;
        `,
        [email]
    );

    if (existingEmailUser.rows[0]) {
        const row = existingEmailUser.rows[0];

        if (row.google_id && row.google_id !== input.googleId) {
            throw new Error('That email is already linked to a different Google account.');
        }

        const updateResult = await pool.query<DbUserRow>(
            `
                UPDATE users
                SET
                    google_id = $2,
                    name = CASE WHEN name = 'User' OR name = '' THEN $3 ELSE name END,
                    updated_at = NOW()
                WHERE id = $1
                RETURNING id, email, name, password_hash, google_id, created_at;
            `,
            [row.id, input.googleId, displayName]
        );

        return rowToAuthUser(updateResult.rows[0]);
    }

    const insertResult = await pool.query<DbUserRow>(
        `
            INSERT INTO users (id, email, name, google_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id, email, name, password_hash, google_id, created_at;
        `,
        [randomUUID(), email, displayName, input.googleId]
    );

    return rowToAuthUser(insertResult.rows[0]);
}

export async function createSession(userId: string, rememberMe: boolean) {
    await ensureDatabaseReady();
    const pool = getPool();
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + (rememberMe ? THIRTY_DAYS_MS : ONE_DAY_MS));

    await pool.query(
        `
            INSERT INTO sessions (id, user_id, token_hash, expires_at)
            VALUES ($1, $2, $3, $4);
        `,
        [randomUUID(), userId, hashSessionToken(token), expiresAt.toISOString()]
    );

    return {
        token,
        expiresAt,
    };
}

export async function invalidateSession(token: string | undefined) {
    if (!token) {
        return;
    }

    await ensureDatabaseReady();
    const pool = getPool();

    await pool.query(
        `
            DELETE FROM sessions
            WHERE token_hash = $1;
        `,
        [hashSessionToken(token)]
    );
}

export async function getAuthUserBySessionToken(token: string | undefined) {
    if (!token) {
        return null;
    }

    await ensureDatabaseReady();
    const pool = getPool();
    const tokenHash = hashSessionToken(token);

    const result = await pool.query<(DbUserRow & { expires_at: Date | string })>(
        `
            SELECT u.id, u.email, u.name, u.password_hash, u.google_id, u.created_at, s.expires_at
            FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.token_hash = $1
            LIMIT 1;
        `,
        [tokenHash]
    );

    const row = result.rows[0];
    if (!row) {
        return null;
    }

    if (new Date(row.expires_at).getTime() <= Date.now()) {
        await invalidateSession(token);
        return null;
    }

    return rowToAuthUser(row);
}

export async function getUserProfile(userId: string) {
    await ensureDatabaseReady();
    const pool = getPool();
    const [user, profileResult] = await Promise.all([
        getUserById(userId),
        pool.query<DbProfileRow>(
            `
                SELECT
                    user_id,
                    weight,
                    height,
                    age,
                    gender,
                    goal,
                    activity_level,
                    dietary_preference,
                    indian_food_preference,
                    disliked_foods,
                    daily_step_goal,
                    daily_water_goal,
                    weekly_workout_goal,
                    reminders_enabled,
                    reminder_time,
                    created_at
                FROM profiles
                WHERE user_id = $1
                LIMIT 1;
            `,
            [userId]
        ),
    ]);

    if (!user || profileResult.rows.length === 0) {
        return null;
    }

    return profileRowsToUserProfile(user, profileResult.rows[0]);
}

export async function saveUserProfile(userId: string, profile: UserProfile) {
    await ensureDatabaseReady();
    const pool = getPool();
    const createdAt = profile.createdAt || new Date().toISOString();
    const dislikedFoods = normalizeDislikedFoods(profile.dislikedFoods);

    await pool.query(
        `
            UPDATE users
            SET name = $2, updated_at = NOW()
            WHERE id = $1;
        `,
        [userId, profile.name.trim() || 'User']
    );

    await pool.query(
        `
            INSERT INTO profiles (
                user_id,
                weight,
                height,
                age,
                gender,
                goal,
                activity_level,
                dietary_preference,
                indian_food_preference,
                disliked_foods,
                daily_step_goal,
                daily_water_goal,
                weekly_workout_goal,
                reminders_enabled,
                reminder_time,
                created_at,
                updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
            ON CONFLICT (user_id)
            DO UPDATE SET
                weight = EXCLUDED.weight,
                height = EXCLUDED.height,
                age = EXCLUDED.age,
                gender = EXCLUDED.gender,
                goal = EXCLUDED.goal,
                activity_level = EXCLUDED.activity_level,
                dietary_preference = EXCLUDED.dietary_preference,
                indian_food_preference = EXCLUDED.indian_food_preference,
                disliked_foods = EXCLUDED.disliked_foods,
                daily_step_goal = EXCLUDED.daily_step_goal,
                daily_water_goal = EXCLUDED.daily_water_goal,
                weekly_workout_goal = EXCLUDED.weekly_workout_goal,
                reminders_enabled = EXCLUDED.reminders_enabled,
                reminder_time = EXCLUDED.reminder_time,
                updated_at = NOW();
        `,
        [
            userId,
            profile.weight,
            profile.height,
            profile.age,
            profile.gender,
            profile.goal,
            profile.activityLevel,
            profile.dietaryPreference,
            profile.indianFoodPreference,
            dislikedFoods,
            profile.dailyStepGoal,
            profile.dailyWaterGoal,
            profile.weeklyWorkoutGoal,
            profile.remindersEnabled,
            profile.reminderTime,
            createdAt,
        ]
    );

    return getUserProfile(userId);
}

function getWeekStartDate(date: string) {
    const value = new Date(`${date}T00:00:00`);
    const weekday = (value.getDay() + 6) % 7;
    value.setDate(value.getDate() - weekday);
    return value.toISOString().slice(0, 10);
}

async function getHydrationGlassesForUser(userId: string, date: string) {
    await ensureDatabaseReady();
    const pool = getPool();
    const result = await pool.query<DbHydrationLogRow>(
        `
            SELECT id, user_id, date, glasses, goal, created_at
            FROM hydration_logs
            WHERE user_id = $1 AND date = $2
            LIMIT 1;
        `,
        [userId, date]
    );

    return result.rows[0] ? Number(result.rows[0].glasses) : null;
}

async function saveHydrationForUser(userId: string, date: string, glasses: number, goal: number) {
    await ensureDatabaseReady();
    const pool = getPool();
    const existing = await pool.query<{ id: string }>(
        `
            SELECT id
            FROM hydration_logs
            WHERE user_id = $1 AND date = $2
            LIMIT 1;
        `,
        [userId, date]
    );
    const id = existing.rows[0]?.id ?? randomUUID();

    await pool.query(
        `
            INSERT INTO hydration_logs (
                id,
                user_id,
                date,
                glasses,
                goal,
                created_at,
                updated_at
            )
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            ON CONFLICT (user_id, date)
            DO UPDATE SET
                glasses = EXCLUDED.glasses,
                goal = EXCLUDED.goal,
                updated_at = NOW();
        `,
        [id, userId, date, glasses, goal]
    );
}

async function getMealEntriesForDate(userId: string, date: string) {
    await ensureDatabaseReady();
    const pool = getPool();
    const mealResult = await pool.query<DbMealLogRow>(
        `
            SELECT id, user_id, date, meal_type, logged_at, total_nutrition, created_at
            FROM meal_logs
            WHERE user_id = $1 AND date = $2
            ORDER BY logged_at ASC, created_at ASC;
        `,
        [userId, date]
    );

    if (mealResult.rows.length === 0) {
        return [];
    }

    const mealIds = mealResult.rows.map((row) => row.id);
    const itemResult = await pool.query<DbMealItemRow>(
        `
            SELECT id, meal_log_id, item_order, name, quantity, nutrition
            FROM meal_items
            WHERE meal_log_id = ANY($1::text[])
            ORDER BY meal_log_id ASC, item_order ASC;
        `,
        [mealIds]
    );

    const itemsByMeal = new Map<string, DbMealItemRow[]>();

    for (const row of itemResult.rows) {
        const list = itemsByMeal.get(row.meal_log_id) ?? [];
        list.push(row);
        itemsByMeal.set(row.meal_log_id, list);
    }

    return mealResult.rows.map((row) => rowToMealEntry(row, itemsByMeal.get(row.id) ?? []));
}

async function replaceMealsForDate(userId: string, date: string, meals: MealEntry[]) {
    await ensureDatabaseReady();
    const pool = getPool();
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        await client.query(
            `
                DELETE FROM meal_logs
                WHERE user_id = $1 AND date = $2;
            `,
            [userId, date]
        );

        for (const meal of meals) {
            const mealId = meal.id || randomUUID();
            await client.query(
                `
                    INSERT INTO meal_logs (
                        id,
                        user_id,
                        date,
                        meal_type,
                        logged_at,
                        total_nutrition,
                        created_at,
                        updated_at
                    )
                    VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW(), NOW());
                `,
                [
                    mealId,
                    userId,
                    date,
                    meal.mealType,
                    meal.timestamp,
                    JSON.stringify(meal.totalNutrition),
                ]
            );

            for (const [index, item] of meal.items.entries()) {
                await client.query(
                    `
                        INSERT INTO meal_items (
                            id,
                            meal_log_id,
                            item_order,
                            name,
                            quantity,
                            nutrition
                        )
                        VALUES ($1, $2, $3, $4, $5, $6::jsonb);
                    `,
                    [
                        item.id || randomUUID(),
                        mealId,
                        index,
                        item.name,
                        item.quantity,
                        JSON.stringify(item.nutrition),
                    ]
                );
            }
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

export async function getStepEntryForUser(userId: string, date: string, syncGoalWithProfile = false) {
    await ensureDatabaseReady();
    const pool = getPool();
    const [profile, result] = await Promise.all([
        getUserProfile(userId),
        pool.query<DbStepLogRow>(
            `
                SELECT id, user_id, date, steps, goal, source, created_at
                FROM step_logs
                WHERE user_id = $1 AND date = $2
                LIMIT 1;
            `,
            [userId, date]
        ),
    ]);

    const goal = profile?.dailyStepGoal ?? DEFAULT_STEP_GOAL;
    const row = result.rows[0];

    if (!row) {
        return createEmptyStepEntry(date, goal);
    }

    if (syncGoalWithProfile && Number(row.goal) !== goal) {
        await pool.query(
            `
                UPDATE step_logs
                SET goal = $3, updated_at = NOW()
                WHERE user_id = $1 AND date = $2;
            `,
            [userId, date, goal]
        );

        return {
            ...rowToStepEntry(row),
            goal,
        };
    }

    return rowToStepEntry(row);
}

export async function saveStepEntryForUser(userId: string, date: string, steps: number) {
    await ensureDatabaseReady();
    const pool = getPool();
    const [profile, existing] = await Promise.all([
        getUserProfile(userId),
        pool.query<{ id: string }>(
            `
                SELECT id
                FROM step_logs
                WHERE user_id = $1 AND date = $2
                LIMIT 1;
            `,
            [userId, date]
        ),
    ]);
    const id = existing.rows[0]?.id ?? randomUUID();
    const goal = profile?.dailyStepGoal ?? DEFAULT_STEP_GOAL;
    const result = await pool.query<DbStepLogRow>(
        `
            INSERT INTO step_logs (
                id,
                user_id,
                date,
                steps,
                goal,
                source,
                created_at,
                updated_at
            )
            VALUES ($1, $2, $3, $4, $5, 'manual', NOW(), NOW())
            ON CONFLICT (user_id, date)
            DO UPDATE SET
                steps = EXCLUDED.steps,
                goal = EXCLUDED.goal,
                source = EXCLUDED.source,
                updated_at = NOW()
            RETURNING id, user_id, date, steps, goal, source, created_at;
        `,
        [id, userId, date, steps, goal]
    );

    return rowToStepEntry(result.rows[0]);
}

function createDefaultHabitLogs(date: string, profile: UserProfile): HabitLog[] {
    return buildDailyHabitBlueprints(profile).map((habit, slot) => ({
        id: randomUUID(),
        date,
        name: habit.name,
        category: habit.category,
        completed: false,
        slot,
    }));
}

export async function getHabitsForUser(userId: string, date: string) {
    await ensureDatabaseReady();
    const pool = getPool();
    const result = await pool.query<DbHabitLogRow>(
        `
            SELECT id, user_id, date, name, category, completed, slot, created_at
            FROM habit_logs
            WHERE user_id = $1 AND date = $2
            ORDER BY slot ASC, created_at ASC;
        `,
        [userId, date]
    );

    if (result.rows.length > 0) {
        return result.rows.map(rowToHabitLog);
    }

    const profile = await getUserProfile(userId);
    if (!profile) {
        return [];
    }

    const defaults = createDefaultHabitLogs(date, profile);
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        for (const habit of defaults) {
            await client.query(
                `
                    INSERT INTO habit_logs (
                        id,
                        user_id,
                        date,
                        name,
                        category,
                        completed,
                        slot,
                        created_at,
                        updated_at
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
                    ON CONFLICT (user_id, date, slot)
                    DO NOTHING;
                `,
                [habit.id, userId, date, habit.name, habit.category, habit.completed, habit.slot]
            );
        }
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }

    return defaults;
}

export async function saveHabitsForUser(userId: string, date: string, habits: HabitLog[]) {
    await ensureDatabaseReady();
    const pool = getPool();
    const normalizedHabits = habits
        .slice()
        .sort((a, b) => a.slot - b.slot)
        .map((habit, index) => ({
            id: habit.id || randomUUID(),
            date,
            name: habit.name.trim(),
            category: habit.category,
            completed: Boolean(habit.completed),
            slot: index,
        }))
        .filter((habit) => habit.name.length > 0)
        .slice(0, 6);

    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        await client.query(
            `
                DELETE FROM habit_logs
                WHERE user_id = $1 AND date = $2;
            `,
            [userId, date]
        );

        for (const habit of normalizedHabits) {
            await client.query(
                `
                    INSERT INTO habit_logs (
                        id,
                        user_id,
                        date,
                        name,
                        category,
                        completed,
                        slot,
                        created_at,
                        updated_at
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW());
                `,
                [habit.id, userId, date, habit.name, habit.category, habit.completed, habit.slot]
            );
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }

    return normalizedHabits;
}

export async function getWorkoutSummaryForUser(userId: string, date: string, weeklyGoal: number) {
    await ensureDatabaseReady();
    const pool = getPool();
    const weekStart = getWeekStartDate(date);
    const result = await pool.query<{
        today_count: number;
        today_minutes: number;
        week_count: number;
    }>(
        `
            SELECT
                COUNT(*) FILTER (WHERE date = $2)::int AS today_count,
                COALESCE(SUM(duration_minutes) FILTER (WHERE date = $2), 0)::int AS today_minutes,
                COUNT(*) FILTER (WHERE date >= $3 AND date <= $2)::int AS week_count
            FROM workouts
            WHERE user_id = $1
              AND date >= $3
              AND date <= $2;
        `,
        [userId, date, weekStart]
    );

    const row = result.rows[0];
    return {
        date,
        todayCount: Number(row?.today_count ?? 0),
        todayMinutes: Number(row?.today_minutes ?? 0),
        weekCount: Number(row?.week_count ?? 0),
        weeklyGoal,
    };
}

async function getStoredDayLog(userId: string, date: string) {
    await ensureDatabaseReady();
    const pool = getPool();
    const [legacyResult, normalizedMeals, hydrationGlasses] = await Promise.all([
        pool.query<DbDayLogRow>(
            `
                SELECT id, user_id, date, water_glasses, meals, total_nutrition
                FROM day_logs
                WHERE user_id = $1 AND date = $2
                LIMIT 1;
            `,
            [userId, date]
        ),
        getMealEntriesForDate(userId, date),
        getHydrationGlassesForUser(userId, date),
    ]);

    const legacy = legacyResult.rows[0] ? rowToDayLog(legacyResult.rows[0]) : null;
    const meals = normalizedMeals.length > 0 ? normalizedMeals : legacy?.meals ?? [];
    const waterGlasses = hydrationGlasses ?? legacy?.waterGlasses ?? 0;

    if (!legacy && meals.length === 0 && waterGlasses === 0) {
        return null;
    }

    return {
        date,
        meals,
        totalNutrition: meals.length > 0 ? sumNutrition(meals.flatMap((meal) => meal.items)) : legacy?.totalNutrition ?? { ...ZERO_NUTRITION },
        waterGlasses,
    };
}

export async function getTodayLogForUser(userId: string, date: string) {
    return (await getStoredDayLog(userId, date)) ?? createEmptyDayLog(date);
}

async function saveDayLog(userId: string, log: DayLog) {
    await ensureDatabaseReady();
    const pool = getPool();
    const existing = await pool.query<{ id: string }>(
        `
            SELECT id
            FROM day_logs
            WHERE user_id = $1 AND date = $2
            LIMIT 1;
        `,
        [userId, log.date]
    );

    if (!shouldPersistLog(log)) {
        if (existing.rows[0]?.id) {
            await pool.query(
                `
                    DELETE FROM day_logs
                    WHERE user_id = $1 AND date = $2;
                `,
                [userId, log.date]
            );
        }

        return createEmptyDayLog(log.date);
    }

    const id = existing.rows[0]?.id ?? randomUUID();
    const result = await pool.query<DbDayLogRow>(
        `
            INSERT INTO day_logs (
                id,
                user_id,
                date,
                water_glasses,
                meals,
                total_nutrition,
                created_at,
                updated_at
            )
            VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, NOW(), NOW())
            ON CONFLICT (user_id, date)
            DO UPDATE SET
                water_glasses = EXCLUDED.water_glasses,
                meals = EXCLUDED.meals,
                total_nutrition = EXCLUDED.total_nutrition,
                updated_at = NOW()
            RETURNING id, user_id, date, water_glasses, meals, total_nutrition;
        `,
        [
            id,
            userId,
            log.date,
            log.waterGlasses,
            JSON.stringify(log.meals),
            JSON.stringify(log.totalNutrition),
        ]
    );

    return rowToDayLog(result.rows[0]);
}

export async function countStoredLogs(userId: string) {
    await ensureDatabaseReady();
    const pool = getPool();
    const result = await pool.query<{ count: string }>(
        `
            SELECT COUNT(*)::text AS count
            FROM day_logs
            WHERE user_id = $1;
        `,
        [userId]
    );

    return Number(result.rows[0]?.count ?? 0);
}

export async function getRecentLogsForUser(userId: string, days: number, anchorDate: string) {
    await ensureDatabaseReady();
    const pool = getPool();
    const cutoff = new Date(`${anchorDate}T00:00:00`);
    cutoff.setDate(cutoff.getDate() - Math.max(days - 1, 0));
    const cutoffDate = cutoff.toISOString().slice(0, 10);

    const result = await pool.query<DbDayLogRow>(
        `
            SELECT id, user_id, date, water_glasses, meals, total_nutrition
            FROM day_logs
            WHERE user_id = $1 AND date >= $2
            ORDER BY date DESC;
        `,
        [userId, cutoffDate]
    );

    return result.rows.map(rowToDayLog);
}

export async function addMealForUser(userId: string, date: string, meal: MealEntry) {
    const todayLog = await getTodayLogForUser(userId, date);
    const meals = [...todayLog.meals, meal];
    const allItems = meals.flatMap((entry) => entry.items);
    await replaceMealsForDate(userId, date, meals);
    const savedLog = await saveDayLog(userId, {
        ...todayLog,
        meals,
        totalNutrition: sumNutrition(allItems),
    });

    return {
        todayLog: savedLog,
        totalDays: await countStoredLogs(userId),
    };
}

export async function deleteMealForUser(userId: string, date: string, mealId: string) {
    const todayLog = await getTodayLogForUser(userId, date);
    const meals = todayLog.meals.filter((meal) => meal.id !== mealId);
    const allItems = meals.flatMap((entry) => entry.items);
    await replaceMealsForDate(userId, date, meals);
    const savedLog = await saveDayLog(userId, {
        ...todayLog,
        meals,
        totalNutrition: allItems.length > 0 ? sumNutrition(allItems) : { ...ZERO_NUTRITION },
    });

    return {
        todayLog: savedLog,
        totalDays: await countStoredLogs(userId),
    };
}

export async function updateMealForUser(userId: string, date: string, mealId: string, meal: MealEntry) {
    const todayLog = await getTodayLogForUser(userId, date);
    let foundMeal: MealEntry | null = null;

    const meals = todayLog.meals.map((entry) => {
        if (entry.id !== mealId) {
            return entry;
        }

        foundMeal = entry;
        return {
            ...meal,
            id: mealId,
            timestamp: entry.timestamp,
        };
    });

    if (!foundMeal) {
        return null;
    }

    const allItems = meals.flatMap((entry) => entry.items);
    await replaceMealsForDate(userId, date, meals);
    const savedLog = await saveDayLog(userId, {
        ...todayLog,
        meals,
        totalNutrition: allItems.length > 0 ? sumNutrition(allItems) : { ...ZERO_NUTRITION },
    });

    return {
        todayLog: savedLog,
        totalDays: await countStoredLogs(userId),
    };
}

export async function updateWaterForUser(userId: string, date: string, waterGlasses: number) {
    const todayLog = await getTodayLogForUser(userId, date);
    const profile = await getUserProfile(userId);
    await saveHydrationForUser(userId, date, waterGlasses, profile?.dailyWaterGoal ?? DEFAULT_WATER_GOAL);
    const savedLog = await saveDayLog(userId, {
        ...todayLog,
        waterGlasses,
    });

    return {
        todayLog: savedLog,
        totalDays: await countStoredLogs(userId),
    };
}

export async function getWorkoutsForUser(userId: string, days: number, anchorDate: string) {
    await ensureDatabaseReady();
    const pool = getPool();
    const cutoff = new Date(`${anchorDate}T00:00:00`);
    cutoff.setDate(cutoff.getDate() - Math.max(days - 1, 0));
    const cutoffDate = cutoff.toISOString().slice(0, 10);

    const result = await pool.query<DbWorkoutRow>(
        `
            SELECT id, user_id, date, name, category, duration_minutes, notes, exercises, created_at
            FROM workouts
            WHERE user_id = $1 AND date >= $2
            ORDER BY date DESC, created_at DESC;
        `,
        [userId, cutoffDate]
    );

    return result.rows.map(rowToWorkout);
}

export async function addWorkoutForUser(userId: string, workout: Omit<WorkoutEntry, 'id'>) {
    await ensureDatabaseReady();
    const pool = getPool();
    const id = randomUUID();
    const result = await pool.query<DbWorkoutRow>(
        `
            INSERT INTO workouts (
                id,
                user_id,
                date,
                name,
                category,
                duration_minutes,
                notes,
                exercises,
                created_at,
                updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW(), NOW())
            RETURNING id, user_id, date, name, category, duration_minutes, notes, exercises, created_at;
        `,
        [
            id,
            userId,
            workout.date,
            workout.name,
            workout.category,
            workout.durationMinutes,
            workout.notes,
            JSON.stringify(workout.exercises),
        ]
    );

    return rowToWorkout(result.rows[0]);
}

export async function deleteWorkoutForUser(userId: string, workoutId: string) {
    await ensureDatabaseReady();
    const pool = getPool();
    const result = await pool.query(
        `
            DELETE FROM workouts
            WHERE id = $1 AND user_id = $2;
        `,
        [workoutId, userId]
    );

    return (result.rowCount ?? 0) > 0;
}

export async function getWeightEntriesForUser(userId: string, days: number, anchorDate: string) {
    await ensureDatabaseReady();
    const pool = getPool();
    const cutoff = new Date(`${anchorDate}T00:00:00`);
    cutoff.setDate(cutoff.getDate() - Math.max(days - 1, 0));
    const cutoffDate = cutoff.toISOString().slice(0, 10);

    const result = await pool.query<DbWeightLogRow>(
        `
            SELECT id, user_id, date, weight_kg, notes, created_at
            FROM weight_logs
            WHERE user_id = $1 AND date >= $2
            ORDER BY date DESC, created_at DESC;
        `,
        [userId, cutoffDate]
    );

    return result.rows.map(rowToWeightEntry);
}

export async function saveWeightEntryForUser(userId: string, entry: Omit<WeightEntry, 'id'>) {
    await ensureDatabaseReady();
    const pool = getPool();
    const existing = await pool.query<{ id: string }>(
        `
            SELECT id
            FROM weight_logs
            WHERE user_id = $1 AND date = $2
            LIMIT 1;
        `,
        [userId, entry.date]
    );
    const id = existing.rows[0]?.id ?? randomUUID();

    const result = await pool.query<DbWeightLogRow>(
        `
            INSERT INTO weight_logs (
                id,
                user_id,
                date,
                weight_kg,
                notes,
                created_at,
                updated_at
            )
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            ON CONFLICT (user_id, date)
            DO UPDATE SET
                weight_kg = EXCLUDED.weight_kg,
                notes = EXCLUDED.notes,
                updated_at = NOW()
            RETURNING id, user_id, date, weight_kg, notes, created_at;
        `,
        [id, userId, entry.date, entry.weightKg, entry.notes]
    );

    return rowToWeightEntry(result.rows[0]);
}

export async function deleteWeightEntryForUser(userId: string, entryId: string) {
    await ensureDatabaseReady();
    const pool = getPool();
    const result = await pool.query(
        `
            DELETE FROM weight_logs
            WHERE id = $1 AND user_id = $2;
        `,
        [entryId, userId]
    );

    return (result.rowCount ?? 0) > 0;
}

export async function buildBootstrapForUser(userId: string, date: string, days: number): Promise<AppBootstrap> {
    const [user, profile, recentLogs, totalDays] = await Promise.all([
        getUserById(userId),
        getUserProfile(userId),
        getRecentLogsForUser(userId, days, date),
        countStoredLogs(userId),
    ]);

    if (!user) {
        return {
            user: null,
            profile: null,
            todayLog: null,
            recentLogs: [],
            totalDays: 0,
            todaySteps: null,
            todayHabits: [],
            todayWorkoutSummary: null,
        };
    }

    if (!profile) {
        return {
            user,
            profile: null,
            todayLog: null,
            recentLogs,
            totalDays,
            todaySteps: null,
            todayHabits: [],
            todayWorkoutSummary: null,
        };
    }

    const [todayLog, todaySteps, todayHabits, todayWorkoutSummary] = await Promise.all([
        getTodayLogForUser(userId, date),
        getStepEntryForUser(userId, date, true),
        getHabitsForUser(userId, date),
        getWorkoutSummaryForUser(userId, date, profile.weeklyWorkoutGoal),
    ]);

    return {
        user,
        profile,
        todayLog,
        recentLogs,
        totalDays,
        todaySteps,
        todayHabits,
        todayWorkoutSummary,
    };
}
