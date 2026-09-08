import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Utensils, Dumbbell, TrendingUp, Shield } from "lucide-react";
import { api } from "../services/api";

/**
 * BottomTaskbar
 *
 * Persistent, mobile-first floating navigation dock (VXS Trainer inspired).
 * Mounted once in the authenticated layout shell (App.jsx) so it survives
 * across every in-app view. It fetches the athlete's profile + today's log
 * independently so its pillar badges (remaining kcal, active split, macro
 * targets) stay meaningful wherever it is rendered, and degrades silently to
 * plain labels if that data is unavailable.
 */
export default function BottomTaskbar() {
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [log, setLog] = useState(null);

  const todayStr = new Date().toISOString().split("T")[0];

  // Pull live context for the pillar badges. Failures are non-fatal: the dock
  // simply falls back to its static subtext.
  useEffect(() => {
    let cancelled = false;

    const loadContext = async () => {
      try {
        const [profileData, logData] = await Promise.all([
          api.getProfile().catch(() => null),
          api.getDailyLog(todayStr).catch(() => null),
        ]);
        if (!cancelled) {
          if (profileData) setProfile(profileData);
          if (logData) setLog(logData);
        }
      } catch {
        /* keep static fallbacks */
      }
    };

    loadContext();
    return () => {
      cancelled = true;
    };
    // Refresh when navigating between pillars so badges reflect recent logging.
  }, [location.pathname, todayStr]);

  const remainingCalories = useMemo(() => {
    if (!profile) return null;
    const target = profile.target_calories || 0;
    const consumed = (log?.meals || []).reduce(
      (sum, meal) => sum + (meal.calories || 0),
      0
    );
    return Math.max(0, Math.round(target - consumed));
  }, [profile, log]);

  const activeSplit = useMemo(() => {
    const split = log?.workout_split;
    if (!split || split === "REST / RECOVERY") return "Rest / Fuel";
    // Title-case the stored split for a compact subtitle (e.g. "PUSH DAY").
    return split
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }, [log]);

  const proteinTarget = profile?.target_protein_g
    ? `${Math.round(profile.target_protein_g)}g P`
    : null;

  const pillars = [
    {
      to: "/food-log",
      // Also treat the /diet alias as this pillar being active.
      matches: ["/food-log", "/diet"],
      label: "Diet",
      Icon: Utensils,
      badge:
        remainingCalories != null ? `${remainingCalories} kcal left` : "Nutrition",
    },
    {
      to: "/workouts",
      matches: ["/workouts"],
      label: "Workout",
      Icon: Dumbbell,
      badge: activeSplit,
    },
    {
      to: "/progress",
      matches: ["/progress"],
      label: "Progress",
      Icon: TrendingUp,
      badge: "Overload",
    },
    {
      to: "/profile",
      matches: ["/profile"],
      label: "Profile",
      Icon: Shield,
      badge: proteinTarget || "Targets",
    },
  ];

  const currentPath = location.pathname;

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-lg"
    >
      <div className="bg-[#0D0E15]/95 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-full p-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.85)] flex items-center justify-around">
        {pillars.map(({ to, matches, label, Icon, badge }) => {
          const isActive = matches.some(
            (m) => currentPath === m || currentPath.startsWith(`${m}/`)
          );
          return (
            <NavLink
              key={to}
              to={to}
              aria-label={label}
              className={`group relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl sm:rounded-full px-2 py-2 transition-all duration-200 ${
                isActive
                  ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 scale-[1.04] shadow-[0_0_18px_rgba(0,240,255,0.18)]"
                  : "text-slate-400 border border-transparent hover:text-slate-100 hover:bg-white/5 active:scale-95"
              }`}
            >
              <Icon
                size={20}
                strokeWidth={isActive ? 2.4 : 2}
                className="shrink-0"
              />
              <span className="text-[10px] font-black uppercase tracking-wider leading-none">
                {label}
              </span>
              {badge && (
                <span
                  className={`mt-0.5 max-w-[70px] truncate text-[8px] font-mono uppercase tracking-tight leading-none ${
                    isActive ? "text-cyan-300/90" : "text-slate-500"
                  }`}
                  title={badge}
                >
                  {badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
