import { DailyTargets, FoodItem, HabitCategory, NutritionInfo, UserProfile } from './types';

/**
 * Calculate BMR using Mifflin-St Jeor equation.
 */
export function calculateBMR(profile: UserProfile): number {
    const { weight, height, age, gender } = profile;
    if (gender === 'male') {
        return 10 * weight + 6.25 * height - 5 * age + 5;
    }
    return 10 * weight + 6.25 * height - 5 * age - 161;
}

/**
 * Activity level multipliers for TDEE.
 */
const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
};

/**
 * Calculate TDEE (Total Daily Energy Expenditure).
 */
export function calculateTDEE(profile: UserProfile): number {
    const bmr = calculateBMR(profile);
    return Math.round(bmr * activityMultipliers[profile.activityLevel]);
}

/**
 * Calculate daily targets based on user profile and goal.
 */
export function calculateDailyTargets(profile: UserProfile): DailyTargets {
    const tdee = calculateTDEE(profile);

    let calories: number;
    let proteinMultiplier: number;

    switch (profile.goal) {
        case 'muscle_building':
            calories = tdee + 300;
            proteinMultiplier = 2.0;
            break;
        case 'weight_loss':
            calories = tdee - 500;
            proteinMultiplier = 1.8;
            break;
        case 'maintain':
        default:
            calories = tdee;
            proteinMultiplier = 1.5;
            break;
    }

    const protein = Math.round(profile.weight * proteinMultiplier);
    const proteinCalories = protein * 4;
    const fatCalories = calories * 0.27;
    const fat = Math.round(fatCalories / 9);
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
 * Sum up nutrition from multiple food items.
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
 * Get today's date in local YYYY-MM-DD format.
 */
export function getTodayDate(): string {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    return local.toISOString().split('T')[0];
}

/**
 * Format date for display.
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
 * Get day number from start date.
 */
export function getDayNumber(startDate: string, currentDate: string): number {
    const start = new Date(startDate);
    const current = new Date(currentDate);
    const diff = current.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Get a short meal marker for compact UI.
 */
export function getMealEmoji(mealType: string): string {
    const markers: Record<string, string> = {
        breakfast: 'AM',
        lunch: 'NO',
        dinner: 'PM',
        snack: 'SN',
    };
    return markers[mealType] || 'ME';
}

/**
 * Get meal type label.
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
 * Get goal label.
 */
export function getGoalLabel(goal: string): string {
    const labels: Record<string, string> = {
        muscle_building: 'Muscle building',
        weight_loss: 'Weight loss',
        maintain: 'Maintain weight',
    };
    return labels[goal] || goal;
}

export function getDietaryPreferenceLabel(preference: string): string {
    const labels: Record<string, string> = {
        vegetarian: 'Vegetarian',
        eggetarian: 'Eggetarian',
        non_vegetarian: 'Non-vegetarian',
        vegan: 'Vegan',
    };
    return labels[preference] || preference;
}

export function getIndianFoodPreferenceLabel(preference: string): string {
    const labels: Record<string, string> = {
        north_indian: 'North Indian',
        south_indian: 'South Indian',
        mixed: 'Mixed Indian',
        any: 'Any style',
    };
    return labels[preference] || preference;
}

function formatSteps(goal: number) {
    if (goal >= 1000 && goal % 1000 === 0) {
        return `${goal / 1000}k steps`;
    }

    return `${goal} steps`;
}

export function buildDietPlanSummary(profile: UserProfile, targets: DailyTargets) {
    const plan: string[] = [];

    if (profile.goal === 'muscle_building') {
        plan.push(`Keep ${targets.protein}g protein spread across 3-4 meals so the surplus supports muscle instead of random snacking.`);
    } else if (profile.goal === 'weight_loss') {
        plan.push(`Start meals with protein and vegetables so the ${targets.calories} kcal target feels filling instead of restrictive.`);
    } else {
        plan.push(`Anchor each day around steady meals so ${targets.calories} kcal feels repeatable on busy weekdays.`);
    }

    if (profile.dietaryPreference === 'vegetarian') {
        plan.push('Rotate paneer, curd, dal, soy, chana, rajma, and sprouts so carbs never land on the plate alone.');
    } else if (profile.dietaryPreference === 'eggetarian') {
        plan.push('Use eggs for an easy protein layer, then rotate paneer, curd, dal, soy, and chana through the week.');
    } else if (profile.dietaryPreference === 'vegan') {
        plan.push('Build meals with dal, chana, rajma, tofu, soy chunks, peanuts, and sprouts to keep protein practical.');
    } else {
        plan.push('Keep one easy protein ready each day: eggs, curd, paneer, chicken, fish, or a dal-based meal prep box.');
    }

    if (profile.indianFoodPreference === 'north_indian') {
        plan.push('Bias toward roti, dal, sabzi, curd, paneer, kebab, or rajma-chawal style plates with protein first and oil under control.');
    } else if (profile.indianFoodPreference === 'south_indian') {
        plan.push('Use idli, dosa, upma, rice bowls, sambhar, curd rice, eggs, and podi add-ons to keep South Indian meals balanced.');
    } else if (profile.indianFoodPreference === 'mixed') {
        plan.push('Mix home-style North and South Indian plates so the app can suggest familiar meals without forcing one cuisine pattern.');
    } else {
        plan.push('Keep the meal database open to any Indian plate style so logging stays easy outside home too.');
    }

    if (profile.dislikedFoods.length > 0) {
        plan.push(`Skip foods you avoid: ${profile.dislikedFoods.join(', ')}.`);
    }

    return plan.slice(0, 4);
}

export function buildWorkoutPlanSummary(profile: UserProfile) {
    const plan: string[] = [];
    const weeklyGoal = Math.max(profile.weeklyWorkoutGoal, 2);

    if (profile.goal === 'muscle_building') {
        plan.push(`Aim for ${weeklyGoal} gym sessions each week with a strength-first split and at least one rest or mobility day.`);
    } else if (profile.goal === 'weight_loss') {
        plan.push(`Aim for ${weeklyGoal} training days each week, mixing strength with walking or cardio so fat loss keeps muscle.`);
    } else {
        plan.push(`Aim for ${weeklyGoal} active sessions each week to keep maintenance structured instead of accidental.`);
    }

    if (profile.activityLevel === 'sedentary' || profile.activityLevel === 'light') {
        plan.push(`Use ${formatSteps(profile.dailyStepGoal)} as the daily movement floor, even on non-training days.`);
    } else {
        plan.push(`Treat ${formatSteps(profile.dailyStepGoal)} as recovery movement, not extra punishment on hard training days.`);
    }

    if (profile.goal === 'muscle_building') {
        plan.push('Prioritize progressive overload on compounds, then use walking and mobility to keep recovery moving.');
    } else if (profile.goal === 'weight_loss') {
        plan.push('Keep sessions short and repeatable: 35-55 minutes of lifting, plus walks after meals when possible.');
    } else {
        plan.push('Balance lifting, mobility, and easy cardio so energy stays high and the routine survives travel or social weeks.');
    }

    return plan;
}

export function buildDailyHabitBlueprints(profile: UserProfile): Array<{ name: string; category: HabitCategory }> {
    const nutritionHabit =
        profile.goal === 'muscle_building'
            ? 'Hit protein in every main meal'
            : profile.goal === 'weight_loss'
                ? 'Build every plate around protein first'
                : 'Keep meals balanced and logged honestly';

    const recoveryHabit =
        profile.goal === 'muscle_building'
            ? 'Log training or mobility work'
            : profile.goal === 'weight_loss'
                ? 'Finish a post-meal walk'
                : 'Keep a steady sleep window';

    return [
        { name: nutritionHabit, category: 'nutrition' },
        { name: `Finish ${profile.dailyWaterGoal} glasses of water`, category: 'hydration' },
        { name: `Reach ${formatSteps(profile.dailyStepGoal)}`, category: 'movement' },
        { name: recoveryHabit, category: 'recovery' },
    ];
}

export function getReminderSummary(profile: UserProfile) {
    if (!profile.remindersEnabled) {
        return 'Reminders are off.';
    }

    return `Daily reminder at ${profile.reminderTime}.`;
}

/**
 * Calculate percentage with cap at 100.
 */
export function calcPercentage(current: number, target: number): number {
    if (target <= 0) return 0;
    return Math.min(Math.round((current / target) * 100), 100);
}

/**
 * Get remaining macro with sign.
 */
export function getRemaining(current: number, target: number): number {
    return target - current;
}
