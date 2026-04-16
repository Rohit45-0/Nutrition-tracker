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
