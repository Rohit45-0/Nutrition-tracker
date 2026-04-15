'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserProfile, DayLog, DailyTargets, MealEntry } from '@/lib/types';
import { calculateDailyTargets, getDayNumber, getTodayDate } from '@/lib/nutrition';
import {
  getProfile,
  getTodayLog,
  addMealToLog,
  deleteMealFromLog,
  updateWater,
  getRecentLogs,
  getAllLogs,
} from '@/lib/storage';
import ProfileSetup from '@/components/ProfileSetup';
import Dashboard from '@/components/Dashboard';
import AddMeal from '@/components/AddMeal';
import History from '@/components/History';
import Settings from '@/components/Settings';
import BottomNav from '@/components/BottomNav';

export default function Home() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [todayLog, setTodayLog] = useState<DayLog | null>(null);
  const [targets, setTargets] = useState<DailyTargets | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshTodayLog = useCallback(() => {
    const log = getTodayLog();
    setTodayLog(log);
  }, []);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;

      const savedProfile = getProfile();
      if (savedProfile) {
        setProfile(savedProfile);
        setTargets(calculateDailyTargets(savedProfile));
        refreshTodayLog();
      } else {
        setShowSetup(true);
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [refreshTodayLog]);

  const handleProfileComplete = (newProfile: UserProfile) => {
    setProfile(newProfile);
    setTargets(calculateDailyTargets(newProfile));
    refreshTodayLog();
    setShowSetup(false);
  };

  const handleAddMeal = (meal: MealEntry) => {
    const updatedLog = addMealToLog(meal);
    setTodayLog(updatedLog);
    setShowAddMeal(false);
    setActiveTab('home');
  };

  const handleDeleteMeal = (mealId: string) => {
    const updatedLog = deleteMealFromLog(mealId);
    if (updatedLog) {
      setTodayLog(updatedLog);
    }
  };

  const handleAddWater = () => {
    if (!todayLog) return;
    const newCount = Math.min(todayLog.waterGlasses + 1, 12);
    updateWater(newCount);
    setTodayLog({ ...todayLog, waterGlasses: newCount });
  };

  const handleRemoveWater = () => {
    if (!todayLog) return;
    const newCount = Math.max(todayLog.waterGlasses - 1, 0);
    updateWater(newCount);
    setTodayLog({ ...todayLog, waterGlasses: newCount });
  };

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

  if (showSetup || !profile) {
    return (
      <ProfileSetup
        onComplete={handleProfileComplete}
        existingProfile={profile}
      />
    );
  }

  if (showAddMeal) {
    return (
      <AddMeal
        onSave={handleAddMeal}
        onClose={() => setShowAddMeal(false)}
      />
    );
  }

  const dayNumber = getDayNumber(profile.createdAt.split('T')[0], getTodayDate());

  return (
    <main className="app-shell relative min-h-dvh">
      {activeTab === 'home' && todayLog && targets && (
        <Dashboard
          profile={profile}
          todayLog={todayLog}
          targets={targets}
          dayNumber={dayNumber > 0 ? dayNumber : 1}
          onAddMeal={() => setShowAddMeal(true)}
          onDeleteMeal={handleDeleteMeal}
          onAddWater={handleAddWater}
          onRemoveWater={handleRemoveWater}
        />
      )}

      {activeTab === 'history' && targets && (
        <History
          logs={getRecentLogs(30)}
          targets={targets}
          startDate={profile.createdAt.split('T')[0]}
        />
      )}

      {activeTab === 'settings' && targets && (
        <Settings
          profile={profile}
          targets={targets}
          onEditProfile={() => setShowSetup(true)}
          totalDays={getAllLogs().length}
        />
      )}

      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAddMeal={() => setShowAddMeal(true)}
      />
    </main>
  );
}
