import React, { useMemo } from "react";
import { NavLink } from "react-router-dom";
import { Utensils, Dumbbell, Activity, Shield } from "lucide-react";

/**
 * BottomTaskbar
 *
 * Fixed bottom navigation and the dashboard's route switcher: one NavLink per
 * section (/dashboard/diet, /workouts, /trackers, /profile), with the active
 * route highlighted. Rendered by the Dashboard layout shell, which passes in
 * the profile and day's log it already holds (no duplicate fetches here).
 * Bottom padding follows env(safe-area-inset-bottom) so the dock clears the
 * iOS home indicator / Android gesture bar.
 */
export default function BottomTaskbar({ profile, log, remainingCalories }) {
  const activeSplit = useMemo(() => {
    const split = log?.workout_split;
    if (!split || split === "REST / RECOVERY") return "Rest / Fuel";
    return split.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }, [log]);

  const waterLitres = log?.water_intake_ml ? `${(log.water_intake_ml / 1000).toFixed(1)}L water` : "Water / Steps";

  const pillars = [
    {
      to: "/dashboard/diet",
      label: "Diet",
      Icon: Utensils,
      badge: remainingCalories != null && profile ? `${Math.round(remainingCalories)} kcal left` : "Nutrition",
    },
    { to: "/dashboard/workouts", label: "Workout", Icon: Dumbbell, badge: activeSplit },
    { to: "/dashboard/trackers", label: "Trackers", Icon: Activity, badge: waterLitres },
    {
      to: "/dashboard/profile",
      label: "Profile",
      Icon: Shield,
      badge: profile?.weight_kg ? `${profile.weight_kg} kg` : "Targets",
    },
  ];

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 inset-x-0 z-50 px-3 pt-2 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent"
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="mx-auto max-w-lg bg-[#0D0E15]/95 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-full p-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.85)] flex items-center justify-around">
        {pillars.map(({ to, label, Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            aria-label={label}
            className={({ isActive }) =>
              `group relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl sm:rounded-full px-2 py-2 min-h-[52px] transition-all duration-200 ${
                isActive
                  ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 scale-[1.04] shadow-[0_0_18px_rgba(0,240,255,0.18)]"
                  : "text-slate-400 border border-transparent hover:text-slate-100 hover:bg-white/5 active:scale-95"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.4 : 2} className="shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-wider leading-none">{label}</span>
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
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
