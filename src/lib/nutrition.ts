import { UserProfile, DailyTargets, NutritionInfo, FoodItem } from './types';

/**
 * Calculate BMR using Mifflin-St Jeor equation
 */
export function calculateBMR(profile: UserProfile): number {
    const { weight, height, age, gender } = profile;
    if (gender === 'male') {
        return 10 * weight + 6.25 * height - 5 * age + 5;
    }
    return 10 * weight + 6.25 * height - 5 * age - 161;
}

/**
 * Activity level multipliers for TDEE
 */
const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
};

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 */
export function calculateTDEE(profile: UserProfile): number {
    const bmr = calculateBMR(profile);
    return Math.round(bmr * activityMultipliers[profile.activityLevel]);
}

/**
 * Calculate daily targets based on user profile and goal
 */
export function calculateDailyTargets(profile: UserProfile): DailyTargets {
    const tdee = calculateTDEE(profile);

    let calories: number;
    let proteinMultiplier: number; // g per kg body weight

    switch (profile.goal) {
        case 'muscle_building':
            calories = tdee + 300; // Caloric surplus
            proteinMultiplier = 2.0; // Higher protein for muscle building
            break;
        case 'weight_loss':
            calories = tdee - 500; // Caloric deficit
            proteinMultiplier = 1.8; // High protein to preserve muscle
            break;
        case 'maintain':
        default:
            calories = tdee;
            proteinMultiplier = 1.5;
            break;
    }

    const protein = Math.round(profile.weight * proteinMultiplier);
    const proteinCalories = protein * 4;

    // Fat: 25-30% of calories
    const fatCalories = calories * 0.27;
    const fat = Math.round(fatCalories / 9);

    // Carbs: remaining calories
    const carbCalories = calories - proteinCalories - fatCalories;
    const carbs = Math.round(carbCalories / 4);

    const fiber = profile.gender === 'male' ? 38 : 25;

    return {
        calories: Math.round(calories),
        protein,
        carbs: Math.max(carbs, 50),
        fat,
        fiber,
    };
}

/**
 * Sum up nutrition from multiple food items
 */
export function sumNutrition(items: FoodItem[]): NutritionInfo {
    return items.reduce(
        (acc, item) => ({
            calories: acc.calories + item.nutrition.calories,
            protein: acc.protein + item.nutrition.protein,
            carbs: acc.carbs + item.nutrition.carbs,
            fat: acc.fat + item.nutrition.fat,
            fiber: acc.fiber + item.nutrition.fiber,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    );
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
}

/**
 * Format date for display
 */
export function formatDate(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    });
}

/**
 * Get day number from start date
 */
export function getDayNumber(startDate: string, currentDate: string): number {
    const start = new Date(startDate);
    const current = new Date(currentDate);
    const diff = current.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Get meal type emoji
 */
export function getMealEmoji(mealType: string): string {
    const emojis: Record<string, string> = {
        breakfast: '🌅',
        lunch: '☀️',
        dinner: '🌙',
        snack: '🍿',
    };
    return emojis[mealType] || '🍽️';
}

/**
 * Get meal type label
 */
export function getMealLabel(mealType: string): string {
    const labels: Record<string, string> = {
        breakfast: 'Breakfast',
        lunch: 'Lunch',
        dinner: 'Dinner',
        snack: 'Snack',
    };
    return labels[mealType] || 'Meal';
}

/**
 * Get goal label
 */
export function getGoalLabel(goal: string): string {
    const labels: Record<string, string> = {
        muscle_building: '💪 Muscle Building',
        weight_loss: '🏃 Weight Loss',
        maintain: '⚖️ Maintain Weight',
    };
    return labels[goal] || goal;
}

/**
 * Calculate percentage with cap at 100
 */
export function calcPercentage(current: number, target: number): number {
    if (target <= 0) return 0;
    return Math.min(Math.round((current / target) * 100), 100);
}

/**
 * Get remaining macro with sign
 */
export function getRemaining(current: number, target: number): number {
    return target - current;
}
