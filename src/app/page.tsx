'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppBootstrap, AuthUser, DayLog, DailyTargets, MealEntry, UserProfile } from '@/lib/types';
import { calculateDailyTargets, getDayNumber, getTodayDate } from '@/lib/nutrition';
import {
  addMealToLog,
  deleteMealFromLog,
  getBootstrapData,
  saveProfile,
  signOut,
  updateMealInLog,
  updateWater,
} from '@/lib/storage';
import AuthScreen from '@/components/AuthScreen';
import ProfileSetup from '@/components/ProfileSetup';
import Dashboard from '@/components/Dashboard';
import AddMeal from '@/components/AddMeal';
import History from '@/components/History';
import Settings from '@/components/Settings';
import BottomNav from '@/components/BottomNav';
import ProgressScreen from '@/components/ProgressScreen';
import { WorkoutEntry } from '@/components/WorkoutLog';
import { WeightEntry } from '@/components/ProgressTracker';

function mergeTodayLogIntoRecentLogs(log: DayLog, previousLogs: DayLog[]) {
  const shouldKeep =
    log.meals.length > 0 ||
    log.waterGlasses > 0 ||
    log.totalNutrition.calories > 0 ||
    log.totalNutrition.protein > 0 ||
    log.totalNutrition.carbs > 0 ||
    log.totalNutrition.fat > 0;

  const filtered = previousLogs.filter((item) => item.date !== log.date);
  const nextLogs = shouldKeep ? [log, ...filtered] : filtered;

  return nextLogs
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30);
}

export default function Home() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [todayLog, setTodayLog] = useState<DayLog | null>(null);
  const [targets, setTargets] = useState<DailyTargets | null>(null);
  const [recentLogs, setRecentLogs] = useState<DayLog[]>([]);
  const [totalDays, setTotalDays] = useState(0);
  const [activeTab, setActiveTab] = useState('home');
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<MealEntry | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Workout state
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [workoutsLoaded, setWorkoutsLoaded] = useState(false);

  // Weight/progress state
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [weightLoaded, setWeightLoaded] = useState(false);

  const [progressLoading, setProgressLoading] = useState(false);

  const applyBootstrap = useCallback((bootstrap: AppBootstrap) => {
    setUser(bootstrap.user);
    setProfile(bootstrap.profile);
    setTodayLog(bootstrap.todayLog);
    setRecentLogs(bootstrap.recentLogs);
    setTotalDays(bootstrap.totalDays);
    setTargets(bootstrap.profile ? calculateDailyTargets(bootstrap.profile) : null);

    if (bootstrap.profile) {
      setShowSetup(false);
    }
  }, []);

  const loadApp = useCallback(async () => {
    setIsLoading(true);

    try {
      const bootstrap = await getBootstrapData(getTodayDate(), 30);
      applyBootstrap(bootstrap);
    } catch (error) {
      console.error('Failed to load app:', error);
      applyBootstrap({
        user: null,
        profile: null,
        todayLog: null,
        recentLogs: [],
        totalDays: 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, [applyBootstrap]);

  useEffect(() => {
    void loadApp();
  }, [loadApp]);

  // Load progress data when tab is active
  const loadProgressData = useCallback(async (userId: string) => {
    setProgressLoading(true);
    try {
      const [workoutsRes, weightRes] = await Promise.all([
        fetch(`/api/workouts?userId=${userId}`),
        fetch(`/api/weight?userId=${userId}`),
      ]);

      if (workoutsRes.ok) {
        const data = await workoutsRes.json();
        setWorkouts(data.workouts || []);
        setWorkoutsLoaded(true);
      }

      if (weightRes.ok) {
        const data = await weightRes.json();
        setWeightEntries(data.entries || []);
        setWeightLoaded(true);
      }
    } catch (err) {
      console.error('Failed to load progress data:', err);
    } finally {
      setProgressLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    if (activeTab === 'progress' && !workoutsLoaded && !weightLoaded && !progressLoading) {
      void loadProgressData(user.id);
    }
  }, [activeTab, user, workoutsLoaded, weightLoaded, progressLoading, loadProgressData]);

  const syncTodayState = useCallback((nextLog: DayLog, nextTotalDays: number) => {
    setTodayLog(nextLog);
    setTotalDays(nextTotalDays);
    setRecentLogs((previousLogs) => mergeTodayLogIntoRecentLogs(nextLog, previousLogs));
  }, []);

  const handleProfileComplete = useCallback(async (newProfile: UserProfile) => {
    const result = await saveProfile(newProfile, getTodayDate());

    if (result.profile) {
      setProfile(result.profile);
      setTargets(calculateDailyTargets(result.profile));
    }

    syncTodayState(result.todayLog, result.totalDays);
    setShowSetup(false);
  }, [syncTodayState]);

  const openAddMeal = useCallback(() => {
    setEditingMeal(null);
    setShowAddMeal(true);
  }, []);

  const closeMealEditor = useCallback(() => {
    setShowAddMeal(false);
    setEditingMeal(null);
  }, []);

  const handleSaveMeal = useCallback(async (meal: MealEntry) => {
    const result = editingMeal
      ? await updateMealInLog(editingMeal.id, meal, getTodayDate())
      : await addMealToLog(meal, getTodayDate());

    syncTodayState(result.todayLog, result.totalDays);
    closeMealEditor();
    setActiveTab('home');
  }, [closeMealEditor, editingMeal, syncTodayState]);

  const handleEditMeal = useCallback((meal: MealEntry) => {
    setEditingMeal(meal);
    setShowAddMeal(true);
  }, []);

  const handleDeleteMeal = useCallback(async (mealId: string) => {
    const result = await deleteMealFromLog(mealId, getTodayDate());
    syncTodayState(result.todayLog, result.totalDays);
  }, [syncTodayState]);

  const handleAddWater = useCallback(async () => {
    if (!todayLog) return;
    const result = await updateWater(Math.min(todayLog.waterGlasses + 1, 12), getTodayDate());
    syncTodayState(result.todayLog, result.totalDays);
  }, [syncTodayState, todayLog]);

  const handleRemoveWater = useCallback(async () => {
    if (!todayLog) return;
    const result = await updateWater(Math.max(todayLog.waterGlasses - 1, 0), getTodayDate());
    syncTodayState(result.todayLog, result.totalDays);
  }, [syncTodayState, todayLog]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setUser(null);
    setProfile(null);
    setTodayLog(null);
    setTargets(null);
    setRecentLogs([]);
    setTotalDays(0);
    setShowSetup(false);
    setShowAddMeal(false);
    setEditingMeal(null);
    setActiveTab('home');
    setWorkouts([]);
    setWeightEntries([]);
    setWorkoutsLoaded(false);
    setWeightLoaded(false);
  }, []);

  // Workout handlers
  const handleAddWorkout = useCallback(async (workout: Omit<WorkoutEntry, 'id'>) => {
    if (!user) return;
    const res = await fetch('/api/workouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, workout }),
    });
    if (res.ok) {
      const data = await res.json();
      setWorkouts((prev) => [data.workout, ...prev]);
    }
  }, [user]);

  const handleDeleteWorkout = useCallback(async (id: string) => {
    const res = await fetch(`/api/workouts/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setWorkouts((prev) => prev.filter((w) => w.id !== id));
    }
  }, []);

  // Weight handlers
  const handleAddWeight = useCallback(async (entry: { date: string; weightKg: number; notes: string }) => {
    if (!user) return;
    const res = await fetch('/api/weight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, entry }),
    });
    if (res.ok) {
      const data = await res.json();
      setWeightEntries((prev) => {
        const filtered = prev.filter((e) => e.date !== entry.date);
        return [data.entry, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
      });
    }
  }, [user]);

  const handleDeleteWeight = useCallback(async (id: string) => {
    const res = await fetch(`/api/weight/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setWeightEntries((prev) => prev.filter((e) => e.id !== id));
    }
  }, []);

  const dayNumber = useMemo(() => {
    if (!profile) {
      return 1;
    }

    const raw = getDayNumber(profile.createdAt.split('T')[0], getTodayDate());
    return raw > 0 ? raw : 1;
  }, [profile]);

  if (isLoading) {
    return (
      <div className="app-shell flex min-h-dvh items-center justify-center px-6">
        <div className="surface w-full max-w-sm rounded-lg p-5 text-center">
          <div className="mx-auto mb-4 h-2 w-24 animate-pulse rounded bg-brand" />
          <p className="ink-title text-3xl font-black">NutriTrack</p>
          <p className="mt-1 text-sm font-semibold text-muted">Preparing your journal</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuthenticated={loadApp} />;
  }

  if (showSetup || !profile) {
    return (
      <ProfileSetup
        onComplete={handleProfileComplete}
        existingProfile={profile}
        accountName={user.name}
        userEmail={user.email}
        onSignOut={handleSignOut}
      />
    );
  }

  if (showAddMeal) {
    return (
      <AddMeal
        onSave={handleSaveMeal}
        onClose={closeMealEditor}
        initialMeal={editingMeal}
      />
    );
  }

  return (
    <main className="app-shell relative min-h-dvh">
      {activeTab === 'home' && todayLog && targets && (
        <Dashboard
          profile={profile}
          todayLog={todayLog}
          targets={targets}
          dayNumber={dayNumber}
          onAddMeal={openAddMeal}
          onEditMeal={handleEditMeal}
          onDeleteMeal={handleDeleteMeal}
          onAddWater={handleAddWater}
          onRemoveWater={handleRemoveWater}
        />
      )}

      {activeTab === 'history' && targets && (
        <History
          logs={recentLogs}
          targets={targets}
          startDate={profile.createdAt.split('T')[0]}
        />
      )}

      {activeTab === 'progress' && (
        progressLoading ? (
          <div className="screen flex items-center justify-center">
            <p className="text-sm font-bold text-muted">Loading...</p>
          </div>
        ) : (
          <ProgressScreen
            workouts={workouts}
            weightEntries={weightEntries}
            startWeight={profile.weight}
            onAddWorkout={handleAddWorkout}
            onDeleteWorkout={handleDeleteWorkout}
            onAddWeight={handleAddWeight}
            onDeleteWeight={handleDeleteWeight}
          />
        )
      )}

      {activeTab === 'settings' && targets && (
        <Settings
          profile={profile}
          userEmail={user.email}
          targets={targets}
          onEditProfile={() => setShowSetup(true)}
          onSignOut={handleSignOut}
          totalDays={totalDays}
        />
      )}

      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAddMeal={openAddMeal}
      />
    </main>
  );
}
