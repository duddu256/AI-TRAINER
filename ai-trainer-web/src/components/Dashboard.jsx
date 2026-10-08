import React, { useState, useEffect, useCallback, Suspense } from "react";
import { Outlet } from "react-router-dom";
import { api } from "../services/api";
import AchievementsModal from "./AchievementsModal";
import BottomTaskbar from "./BottomTaskbar";

const EMPTY_LOG = {
  weight_today: null,
  steps: 0,
  water_intake_ml: 0,
  meals: [],
  completed_exercises: [],
  workout_split: "REST / RECOVERY",
  workout_completed: false,
  diet_met: false,
  water_met: false,
  steps_met: false,
};

function SectionFallback() {
  return (
    <div className="py-16 text-center text-xs text-slate-500 font-black uppercase tracking-[0.25em] animate-pulse">
      LOADING SECTION...
    </div>
  );
}

/**
 * Dashboard layout shell.
 *
 * Owns the state every section shares (selected date, profile, the day's log,
 * badges) plus the header, status bar and bottom dock. Each route section
 * (/dashboard/diet, /workouts, /trackers, /profile) is lazy-loaded into the
 * <Outlet /> and reads this shared state via useOutletContext().
 */
export default function Dashboard({ onLogout }) {
  // Today's Date in ISO format (YYYY-MM-DD)
  const todayStr = new Date().toISOString().split("T")[0];

  // --- SHARED STATE ---
  const [date, setDate] = useState(todayStr);
  const [profile, setProfile] = useState(null);
  const [log, setLog] = useState(EMPTY_LOG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Gamification & Badges (Module 3)
  const [badges, setBadges] = useState([]);
  const [showAchievements, setShowAchievements] = useState(false);
  const [newlyUnlockedBadge, setNewlyUnlockedBadge] = useState(null);

  // --- DATA LOADING & SYNCING ---
  const loadDashboardData = useCallback(async (targetDate) => {
    setLoading(true);
    setError("");
    try {
      const [profileData, logData] = await Promise.all([
        api.getProfile(),
        api.getDailyLog(targetDate),
      ]);
      setProfile(profileData);
      setLog({ ...EMPTY_LOG, ...logData });
      api.getBadges().then((b) => setBadges(b || [])).catch(() => {});
    } catch (err) {
      console.error("Dashboard sync error:", err);
      setError("FAILED TO SYNCHRONIZE ATHLETIC CONSOLE PORTAL.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData(date);
  }, [date, loadDashboardData]);

  const refresh = useCallback(() => loadDashboardData(date), [date, loadDashboardData]);

  const checkBadgeUnlocks = useCallback((response) => {
    if (response && response.newly_unlocked_badges && response.newly_unlocked_badges.length > 0) {
      const newBadge = response.newly_unlocked_badges[0];
      setNewlyUnlockedBadge(newBadge);
      setShowAchievements(true);
      api.getBadges().then((b) => setBadges(b || [])).catch(() => {});
    }
  }, []);

  // --- HABIT MUTATIONS (shared by Trackers + Workout sections) ---
  const handleToggleHabit = async (field, currentValue) => {
    const newValue = !currentValue;
    try {
      setLog((prev) => ({ ...prev, [field]: newValue }));
      const res = await api.updateTrackers({ date, [field]: newValue });
      checkBadgeUnlocks(res);
    } catch (err) {
      console.error(`Failed to update ${field}:`, err);
      setLog((prev) => ({ ...prev, [field]: currentValue }));
    }
  };

  // --- CALCULATIONS & STATS ---
  const targetCalories = profile?.target_calories || 2500;
  const targetProtein = profile?.target_protein_g || 180;
  const targetCarbs = profile?.target_carbs_g || 250;
  const targetFat = profile?.target_fat_g || 70;
  // Onboarding stores target_water_ml; target_water_l is honoured for older profiles.
  const targetWater = profile?.target_water_ml || (profile?.target_water_l ? profile.target_water_l * 1000 : 3500);
  const targetSteps = profile?.target_steps || 10000;

  const consumed = (log.meals || []).reduce(
    (acc, meal) => {
      acc.calories += meal.calories || 0;
      acc.protein += meal.protein_g || 0;
      acc.carbs += meal.carbs_g || 0;
      acc.fat += meal.fat_g || 0;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  consumed.protein = Math.round(consumed.protein * 10) / 10;
  consumed.carbs = Math.round(consumed.carbs * 10) / 10;
  consumed.fat = Math.round(consumed.fat * 10) / 10;

  const stats = {
    targetCalories, targetProtein, targetCarbs, targetFat, targetWater, targetSteps,
    consumed,
    remainingCalories: Math.max(0, targetCalories - consumed.calories),
    remainingProtein: Math.max(0, targetProtein - consumed.protein),
    remainingCarbs: Math.max(0, targetCarbs - consumed.carbs),
    remainingFat: Math.max(0, targetFat - consumed.fat),
    caloriePercent: Math.min(100, (consumed.calories / targetCalories) * 100),
    proteinPercent: Math.min(100, (consumed.protein / targetProtein) * 100),
    carbsPercent: Math.min(100, (consumed.carbs / targetCarbs) * 100),
    fatPercent: Math.min(100, (consumed.fat / targetFat) * 100),
    waterPercent: Math.min(100, ((log.water_intake_ml || 0) / targetWater) * 100),
    stepsPercent: Math.min(100, ((log.steps || 0) / targetSteps) * 100),
  };

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-14 h-14 border-4 border-slate-800 border-t-cyan-400 rounded-full animate-spin mb-4 shadow-[0_0_25px_rgba(0,240,255,0.35)]"></div>
        <div className="text-cyan-400 font-black tracking-[0.25em] text-xs uppercase animate-pulse">
          SYNCHRONIZING ATHLETIC COMBAT MATRIX...
        </div>
      </div>
    );
  }

  const unlockedBadgesCount = badges.filter((b) => b.unlocked).length;

  const outletContext = {
    date,
    profile,
    setProfile,
    log,
    setLog,
    loading,
    setError,
    refresh,
    checkBadgeUnlocks,
    handleToggleHabit,
    stats,
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white relative overflow-x-hidden font-sans pb-dock">

      {/* Mechanical charcoal canvas: a single fixed hairline grid instead of
          floating blurred glow orbs (strips the generic "AI-generated" look). */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      {/* HEADER SECTION */}
      <header className="border-b border-white/5 bg-slate-950/85 backdrop-blur-2xl sticky top-0 z-40 px-3.5 sm:px-6 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center font-black text-black text-lg sm:text-xl italic tracking-tighter shadow-[0_0_25px_rgba(0,240,255,0.35)] flex-shrink-0">
              AT
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[8px] sm:text-[9px] font-black tracking-[0.25em] text-cyan-400 uppercase">
                  AURATRAINER // PERFORMANCE OS
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black italic tracking-tighter uppercase leading-none mt-0.5 sm:mt-1">
                WELCOME, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-cyan-400 to-[#00F0FF]">{profile?.name || "ATHLETE"}</span>
              </h1>
            </div>
          </div>

          {/* Header Action Controls with Explicit LOG OUT Option */}
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
            {/* Gamification Achievements Button */}
            <button
              onClick={() => setShowAchievements(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 bg-white/5 backdrop-blur-xl border border-white/10 hover:border-cyan-400 rounded-2xl text-[11px] sm:text-xs font-black uppercase tracking-wider text-cyan-300 transition shadow-[0_0_15px_rgba(0,240,255,0.15)] cursor-pointer hover:scale-105 active:scale-95"
            >
              <span>🏆</span>
              <span className="inline">BADGES</span>
              <span className="px-1.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-[9px] text-cyan-400 font-stats">
                {unlockedBadgesCount}/{badges.length || 5}
              </span>
            </button>

            {/* Date Selector Navigation */}
            <div className="flex items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-2 sm:px-3 py-1 shadow-inner">
              <button
                onClick={() => {
                  const prev = new Date(date);
                  prev.setDate(prev.getDate() - 1);
                  setDate(prev.toISOString().split("T")[0]);
                }}
                className="px-1.5 py-0.5 text-slate-400 hover:text-cyan-400 font-bold transition text-sm cursor-pointer hover:scale-110 active:scale-90"
                title="Previous Day"
              >
                ←
              </button>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent text-[11px] sm:text-xs font-black tracking-wider text-slate-100 focus:outline-none uppercase px-1.5 sm:px-3 cursor-pointer text-center max-w-[125px] sm:max-w-none"
              />
              <button
                onClick={() => {
                  const next = new Date(date);
                  next.setDate(next.getDate() + 1);
                  setDate(next.toISOString().split("T")[0]);
                }}
                className="px-1.5 py-0.5 text-slate-400 hover:text-cyan-400 font-bold transition text-sm cursor-pointer hover:scale-110 active:scale-90"
                title="Next Day"
              >
                →
              </button>
            </div>

            {/* Prominent Header LOG OUT Button */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="px-2.5 sm:px-3.5 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 hover:border-red-500 text-red-300 hover:text-white rounded-2xl text-[10px] font-black tracking-wider uppercase transition duration-200 cursor-pointer shadow-[0_0_12px_rgba(255,59,48,0.15)] hover:scale-105 active:scale-95 flex items-center gap-1"
                title="Sign out of your athlete session"
              >
                <span>LOG OUT</span>
                <span className="text-xs">⏻</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* COMPACT ATHLETIC STATUS BAR — streak / daily completion / sync */}
      {(() => {
        const habitFlags = [
          log.workout_completed,
          log.diet_met,
          log.water_met,
          log.steps_met,
        ];
        const metCount = habitFlags.filter(Boolean).length;
        const dailyCompletion = Math.round((metCount / habitFlags.length) * 100);
        const streak =
          profile?.current_streak ?? profile?.streak_days ?? metCount;
        const synced = !loading && !error;
        return (
          <div className="relative z-30 max-w-7xl mx-auto px-4 sm:px-6 mt-4">
            <div className="flex items-center justify-between gap-3 bg-slate-900/95 border border-white/[0.08] rounded-2xl px-3.5 sm:px-5 py-2.5 shadow-lg">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-base leading-none">🔥</span>
                <div className="leading-none">
                  <div className="text-[8px] font-black tracking-[0.2em] text-slate-500 uppercase">
                    Streak
                  </div>
                  <div className="text-sm font-black text-[#CCFF00] font-stats tabular-nums">
                    {streak}
                    <span className="text-[9px] text-slate-500 ml-1 font-black uppercase tracking-wider">
                      {streak === 1 ? "day" : "days"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex items-center gap-2 sm:gap-3 max-w-[220px] sm:max-w-xs">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[8px] font-black tracking-[0.2em] text-slate-500 uppercase">
                      Daily Goals
                    </span>
                    <span className="text-[10px] font-black text-cyan-400 font-stats tabular-nums">
                      {dailyCompletion}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-[#00F0FF] transition-all duration-500"
                      style={{ width: `${dailyCompletion}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    synced
                      ? "bg-[#10B981] animate-pulse"
                      : error
                        ? "bg-red-500"
                        : "bg-amber-400 animate-pulse"
                  }`}
                />
                <span
                  className={`text-[9px] font-black tracking-[0.18em] uppercase ${
                    synced
                      ? "text-[#10B981]"
                      : error
                        ? "text-red-400"
                        : "text-amber-400"
                  }`}
                >
                  {synced ? "Synced" : error ? "Offline" : "Syncing"}
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4">
          <div className="p-3.5 sm:p-4 bg-red-950/40 border-l-4 border-red-500 text-red-200 text-xs font-bold rounded-r-xl uppercase tracking-wider backdrop-blur-md">
            {error}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 sm:mt-8 relative z-10">
        <Suspense fallback={<SectionFallback />}>
          <Outlet context={outletContext} />
        </Suspense>
      </main>

      {/* --- ACHIEVEMENTS MODAL (MODULE 3) --- */}
      <AchievementsModal
        isOpen={showAchievements}
        onClose={() => {
          setShowAchievements(false);
          setNewlyUnlockedBadge(null);
        }}
        badges={badges}
        newlyUnlockedBadge={newlyUnlockedBadge}
      />

      <BottomTaskbar profile={profile} log={log} remainingCalories={stats.remainingCalories} />
    </div>
  );
}
