'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserProfile, DayLog, DailyTargets } from '@/lib/types';
import { calculateDailyTargets, getDayNumber, getTodayDate } from '@/lib/nutrition';
import { getProfile, getTodayLog, addMealToLog, deleteMealFromLog, updateWater, getRecentLogs, getAllLogs } from '@/lib/storage';
import ProfileSetup from '@/components/ProfileSetup';
import Dashboard from '@/components/Dashboard';
import AddMeal from '@/components/AddMeal';
import History from '@/components/History';
import Settings from '@/components/Settings';
import BottomNav from '@/components/BottomNav';
import { MealEntry } from '@/lib/types';

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
    const savedProfile = getProfile();
    if (savedProfile) {
      setProfile(savedProfile);
      setTargets(calculateDailyTargets(savedProfile));
      refreshTodayLog();
    } else {
      setShowSetup(true);
    }
    setIsLoading(false);
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

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">🥗</div>
          <p className="gradient-text text-xl font-bold">NutriTrack</p>
          <p className="text-text-muted text-sm mt-1">Loading...</p>
        </div>
      </div>
    );
  }

  // Setup flow
  if (showSetup || !profile) {
    return (
      <ProfileSetup
        onComplete={handleProfileComplete}
        existingProfile={profile}
      />
    );
  }

  // Add Meal modal
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
    <main className="min-h-dvh relative">
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

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </main>
  );
}
