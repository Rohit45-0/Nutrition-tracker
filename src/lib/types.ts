export interface UserProfile {
  name: string;
  weight: number; // kg
  height: number; // cm
  age: number;
  gender: 'male' | 'female';
  goal: 'muscle_building' | 'weight_loss' | 'maintain';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
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

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type Goal = 'muscle_building' | 'weight_loss' | 'maintain';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
