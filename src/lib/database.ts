import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Pool, type QueryResultRow } from 'pg';
import { DayLog, MealEntry, NutritionInfo, UserProfile, AuthUser, AppBootstrap } from './types';
import { sumNutrition } from './nutrition';

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
                CREATE TABLE IF NOT EXISTS profiles (
                    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                    weight INTEGER NOT NULL,
                    height INTEGER NOT NULL,
                    age INTEGER NOT NULL,
                    gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
                    goal TEXT NOT NULL CHECK (goal IN ('muscle_building', 'weight_loss', 'maintain')),
                    activity_level TEXT NOT NULL CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
                    created_at TIMESTAMPTZ NOT NULL,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
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
                CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
                ON sessions (expires_at);
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
                SELECT user_id, weight, height, age, gender, goal, activity_level, created_at
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
                created_at,
                updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            ON CONFLICT (user_id)
            DO UPDATE SET
                weight = EXCLUDED.weight,
                height = EXCLUDED.height,
                age = EXCLUDED.age,
                gender = EXCLUDED.gender,
                goal = EXCLUDED.goal,
                activity_level = EXCLUDED.activity_level,
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
            createdAt,
        ]
    );

    return getUserProfile(userId);
}

async function getStoredDayLog(userId: string, date: string) {
    await ensureDatabaseReady();
    const pool = getPool();
    const result = await pool.query<DbDayLogRow>(
        `
            SELECT id, user_id, date, water_glasses, meals, total_nutrition
            FROM day_logs
            WHERE user_id = $1 AND date = $2
            LIMIT 1;
        `,
        [userId, date]
    );

    const row = result.rows[0];
    return row ? rowToDayLog(row) : null;
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
    const savedLog = await saveDayLog(userId, {
        ...todayLog,
        waterGlasses,
    });

    return {
        todayLog: savedLog,
        totalDays: await countStoredLogs(userId),
    };
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
        };
    }

    return {
        user,
        profile,
        todayLog: profile ? await getTodayLogForUser(userId, date) : null,
        recentLogs,
        totalDays,
    };
}
