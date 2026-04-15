import { UserProfile, DayLog, MealEntry, NutritionInfo } from './types';
import { getTodayDate, sumNutrition } from './nutrition';

const PROFILE_KEY = 'caltrack_profile';
const LOGS_KEY = 'caltrack_logs';

/**
 * Save user profile to localStorage
 */
export function saveProfile(profile: UserProfile): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

/**
 * Get user profile from localStorage
 */
export function getProfile(): UserProfile | null {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(PROFILE_KEY);
    if (!data) return null;
    try {
        return JSON.parse(data) as UserProfile;
    } catch {
        return null;
    }
}

/**
 * Get all day logs from localStorage
 */
export function getAllLogs(): DayLog[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(LOGS_KEY);
    if (!data) return [];
    try {
        return JSON.parse(data) as DayLog[];
    } catch {
        return [];
    }
}

/**
 * Save all day logs to localStorage
 */
function saveLogs(logs: DayLog[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

/**
 * Get or create today's log
 */
export function getTodayLog(): DayLog {
    const today = getTodayDate();
    const logs = getAllLogs();
    const existing = logs.find((l) => l.date === today);
    if (existing) return existing;

    const newLog: DayLog = {
        date: today,
        meals: [],
        totalNutrition: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
        waterGlasses: 0,
    };
    return newLog;
}

/**
 * Add a meal to today's log
 */
export function addMealToLog(meal: MealEntry): DayLog {
    const today = getTodayDate();
    const logs = getAllLogs();
    let logIndex = logs.findIndex((l) => l.date === today);

    if (logIndex === -1) {
        logs.push({
            date: today,
            meals: [],
            totalNutrition: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
            waterGlasses: 0,
        });
        logIndex = logs.length - 1;
    }

    logs[logIndex].meals.push(meal);

    // Recalculate total
    const allItems = logs[logIndex].meals.flatMap((m) => m.items);
    logs[logIndex].totalNutrition = sumNutrition(allItems);

    saveLogs(logs);
    return logs[logIndex];
}

/**
 * Delete a meal from today's log
 */
export function deleteMealFromLog(mealId: string): DayLog | null {
    const today = getTodayDate();
    const logs = getAllLogs();
    const logIndex = logs.findIndex((l) => l.date === today);

    if (logIndex === -1) return null;

    logs[logIndex].meals = logs[logIndex].meals.filter((m) => m.id !== mealId);

    const allItems = logs[logIndex].meals.flatMap((m) => m.items);
    logs[logIndex].totalNutrition = allItems.length > 0
        ? sumNutrition(allItems)
        : { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

    saveLogs(logs);
    return logs[logIndex];
}

/**
 * Update water count for today
 */
export function updateWater(glasses: number): void {
    const today = getTodayDate();
    const logs = getAllLogs();
    let logIndex = logs.findIndex((l) => l.date === today);

    if (logIndex === -1) {
        logs.push({
            date: today,
            meals: [],
            totalNutrition: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
            waterGlasses: 0,
        });
        logIndex = logs.length - 1;
    }

    logs[logIndex].waterGlasses = glasses;
    saveLogs(logs);
}

/**
 * Get log for a specific date
 */
export function getLogByDate(date: string): DayLog | null {
    const logs = getAllLogs();
    return logs.find((l) => l.date === date) || null;
}

/**
 * Get logs for the last N days
 */
export function getRecentLogs(days: number): DayLog[] {
    const logs = getAllLogs();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    return logs
        .filter((l) => l.date >= cutoffStr)
        .sort((a, b) => b.date.localeCompare(a.date));
}
