export interface UserProfile {
  name: string;
  weight: number; // kg
  height: number; // cm
  age: number;
  gender: 'male' | 'female';
  goal: 'muscle_building' | 'weight_loss' | 'maintain';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  dietaryPreference: 'vegetarian' | 'eggetarian' | 'non_vegetarian' | 'vegan';
  indianFoodPreference: 'north_indian' | 'south_indian' | 'mixed' | 'any';
  dislikedFoods: string[];
  dailyStepGoal: number;
  dailyWaterGoal: number;
  weeklyWorkoutGoal: number;
  remindersEnabled: boolean;
  reminderTime: string;
  createdAt: string;
}

export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface FoodItem {
  id: string;
  name: string;
  quantity: string;
  nutrition: NutritionInfo;
}

export interface MealEntry {
  id: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  items: FoodItem[];
  timestamp: string;
  totalNutrition: NutritionInfo;
}

export interface DayLog {
  date: string; // YYYY-MM-DD
  meals: MealEntry[];
  totalNutrition: NutritionInfo;
  waterGlasses: number;
}

export interface DailyTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weightKg: number;
  durationMinutes: number;
}

export interface WorkoutEntry {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  category: 'strength' | 'cardio' | 'walking' | 'mobility' | 'custom';
  durationMinutes: number;
  notes: string;
  exercises: Exercise[];
}

export interface WeightEntry {
  id: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  notes: string;
}

export interface StepEntry {
  date: string; // YYYY-MM-DD
  steps: number;
  goal: number;
  source: 'manual' | 'device' | 'imported';
}

export interface HabitLog {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  category: 'nutrition' | 'hydration' | 'movement' | 'recovery';
  completed: boolean;
  slot: number;
}

export interface WorkoutSummary {
  date: string; // YYYY-MM-DD
  todayCount: number;
  todayMinutes: number;
  weekCount: number;
  weeklyGoal: number;
}

export interface AppBootstrap {
  user: AuthUser | null;
  profile: UserProfile | null;
  todayLog: DayLog | null;
  recentLogs: DayLog[];
  totalDays: number;
  todaySteps: StepEntry | null;
  todayHabits: HabitLog[];
  todayWorkoutSummary: WorkoutSummary | null;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type Goal = 'muscle_building' | 'weight_loss' | 'maintain';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type WorkoutCategory = WorkoutEntry['category'];
export type DietaryPreference = UserProfile['dietaryPreference'];
export type IndianFoodPreference = UserProfile['indianFoodPreference'];
export type HabitCategory = HabitLog['category'];
