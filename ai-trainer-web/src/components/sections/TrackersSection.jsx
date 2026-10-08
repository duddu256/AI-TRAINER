import React from "react";
import { useOutletContext } from "react-router-dom";
import { api } from "../../services/api";
import SectionHeader from "./SectionHeader";

/**
 * Quick-log widgets: hydration + steps, plus the daily streak habits.
 */
export default function TrackersSection() {
  const { date, log, setLog, checkBadgeUnlocks, handleToggleHabit, stats } = useOutletContext();
  const { targetWater, targetSteps, waterPercent, stepsPercent } = stats;

  // --- TRACKER INCREMENTS ---
  const handleWaterIncrement = async (amount) => {
    const newWater = Math.max(0, (log.water_intake_ml || 0) + amount);
    const isWaterMet = newWater >= targetWater;

    setLog((prev) => ({ ...prev, water_intake_ml: newWater, water_met: isWaterMet }));
    try {
      const res = await api.updateTrackers({
        date: date,
        water_intake_ml: newWater,
        water_met: isWaterMet,
      });
      checkBadgeUnlocks(res);
    } catch (err) {
      console.error("Failed to update water:", err);
    }
  };

  const handleStepsUpdate = async (delta) => {
    const newSteps = Math.max(0, (log.steps || 0) + delta);
    const isStepsMet = newSteps >= targetSteps;

    setLog((prev) => ({ ...prev, steps: newSteps, steps_met: isStepsMet }));
    try {
      const res = await api.updateTrackers({
        date: date,
        steps: newSteps,
        steps_met: isStepsMet,
      });
      checkBadgeUnlocks(res);
    } catch (err) {
      console.error("Failed to update steps:", err);
    }
  };

  return (
    <div className="space-y-8">
      <SectionHeader eyebrow="QUICK LOG // HYDRATION & MOVEMENT" title="TRACKERS" accent="// DAILY INPUTS" />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-start">
        <div className="md:col-span-7">
          <section className="depth-card depth-elevated bg-slate-900/95 border border-white/[0.08] rounded-3xl p-6 shadow-2xl text-center hover:border-cyan-500/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[9px] font-black tracking-[0.25em] text-cyan-400 uppercase">
                HYDRATION STATION
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase font-stats">
                {Math.round(waterPercent)}%
              </span>
            </div>

            <div className="text-5xl sm:text-6xl font-black tracking-tighter text-white leading-none font-stats">
              {log.water_intake_ml || 0} <span className="text-sm font-bold text-slate-500 font-sans">ML</span>
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase mt-2">
              TARGET: <span className="font-stats text-slate-400">{targetWater}</span> ML
            </div>

            <div className="w-full h-3 bg-black/60 border border-slate-800 rounded-full mt-4 overflow-hidden p-0.5">
              <div
                style={{ width: `${waterPercent}%` }}
                className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-[#00F0FF] rounded-full transition-all duration-500 shadow-[0_0_12px_#00F0FF]"
              ></div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={() => handleWaterIncrement(250)}
                className="py-3 bg-black/60 border border-slate-800 hover:border-cyan-400 rounded-xl font-black text-[11px] tracking-widest text-slate-200 transition cursor-pointer hover:scale-105 active:scale-95"
              >
                +250 ML
              </button>
              <button
                onClick={() => handleWaterIncrement(500)}
                className="py-3 bg-black/60 border border-slate-800 hover:border-cyan-400 rounded-xl font-black text-[11px] tracking-widest text-slate-200 transition cursor-pointer hover:scale-105 active:scale-95"
              >
                +500 ML
              </button>
            </div>
          </section>
        </div>
        <div className="md:col-span-5 md:mt-10">
          <section className="depth-card depth-elevated depth-tilt-right bg-slate-900/95 border border-white/[0.08] rounded-3xl p-6 shadow-2xl text-center hover:border-blue-500/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[9px] font-black tracking-[0.25em] text-cyan-400 uppercase">
                STEPS REGISTER
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase font-stats">
                {Math.round(stepsPercent)}%
              </span>
            </div>

            <div className="text-5xl sm:text-6xl font-black tracking-tighter text-white leading-none font-stats">
              {log.steps || 0} <span className="text-sm font-bold text-slate-500 font-sans">STEPS</span>
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase mt-2">
              HABIT TARGET: <span className="font-stats text-slate-400">{targetSteps}</span> STEPS
            </div>

            <div className="w-full h-3 bg-black/60 border border-slate-800 rounded-full mt-4 overflow-hidden p-0.5">
              <div
                style={{ width: `${stepsPercent}%` }}
                className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-[#00F0FF] rounded-full transition-all duration-500 shadow-[0_0_12px_#00F0FF]"
              ></div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={() => handleStepsUpdate(1000)}
                className="py-3 bg-black/60 border border-slate-800 hover:border-cyan-400 rounded-xl font-black text-[11px] tracking-widest text-slate-200 transition cursor-pointer hover:scale-105 active:scale-95"
              >
                +1,000
              </button>
              <button
                onClick={() => handleStepsUpdate(-1000)}
                className="py-3 bg-black/60 border border-slate-800 hover:border-red-500 rounded-xl font-black text-[11px] tracking-widest text-slate-400 transition cursor-pointer hover:scale-105 active:scale-95"
              >
                -1,000
              </button>
            </div>
          </section>
        </div>
      </div>

      <div>
        <SectionHeader eyebrow="STREAK PROTOCOL // TAP TO TOGGLE" title="DAILY HABITS" />
        <section className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">

            {/* Habit 01: Workout */}
            <button
              onClick={() => handleToggleHabit("workout_completed", log.workout_completed)}
              className={`depth-card depth-elevated p-5 rounded-3xl border text-left relative overflow-hidden cursor-pointer active:scale-[0.98] ${
                log.workout_completed
                  ? "bg-gradient-to-b from-blue-950/40 to-cyan-950/40 border-cyan-400 shadow-[0_0_25px_rgba(0,240,255,0.25)]"
                  : "bg-slate-900/60 border-white/5 hover:border-white/20"
              }`}
            >
              <span className={`absolute top-4 right-4 w-2.5 h-2.5 rounded-full ${
                log.workout_completed ? "bg-cyan-400 animate-ping shadow-[0_0_10px_#00F0FF]" : "bg-slate-800"
              }`}></span>
              <div className="text-[10px] font-black tracking-widest text-slate-500 uppercase">HABIT 01</div>
              <div className="text-sm font-black italic tracking-tight text-white mt-1 uppercase">WORKOUT</div>
              <div className={`text-[10px] font-bold mt-4 tracking-wider ${
                log.workout_completed ? "text-cyan-400 font-black" : "text-slate-600"
              }`}>
                {log.workout_completed ? "COMPLETED [ON]" : "PENDING [OFF]"}
              </div>
            </button>

            {/* Habit 02: Steps */}
            <button
              onClick={() => handleToggleHabit("steps_met", log.steps_met)}
              className={`depth-card depth-elevated p-5 rounded-3xl border text-left relative overflow-hidden cursor-pointer active:scale-[0.98] ${
                log.steps_met
                  ? "bg-gradient-to-b from-blue-950/40 to-cyan-950/40 border-cyan-400 shadow-[0_0_25px_rgba(0,240,255,0.25)]"
                  : "bg-slate-900/60 border-white/5 hover:border-white/20"
              }`}
            >
              <span className={`absolute top-4 right-4 w-2.5 h-2.5 rounded-full ${
                log.steps_met ? "bg-cyan-400 animate-ping shadow-[0_0_10px_#00F0FF]" : "bg-slate-800"
              }`}></span>
              <div className="text-[10px] font-black tracking-widest text-slate-500 uppercase">HABIT 02</div>
              <div className="text-sm font-black italic tracking-tight text-white mt-1 uppercase">DAILY STEPS</div>
              <div className={`text-[10px] font-bold mt-4 tracking-wider ${
                log.steps_met ? "text-cyan-400 font-black" : "text-slate-600"
              }`}>
                {log.steps_met ? "TARGET MET [ON]" : "PENDING [OFF]"}
              </div>
            </button>

            {/* Habit 03: Hydration */}
            <button
              onClick={() => handleToggleHabit("water_met", log.water_met)}
              className={`depth-card depth-elevated p-5 rounded-3xl border text-left relative overflow-hidden cursor-pointer active:scale-[0.98] ${
                log.water_met
                  ? "bg-gradient-to-b from-blue-950/40 to-cyan-950/40 border-cyan-400 shadow-[0_0_25px_rgba(0,240,255,0.25)]"
                  : "bg-slate-900/60 border-white/5 hover:border-white/20"
              }`}
            >
              <span className={`absolute top-4 right-4 w-2.5 h-2.5 rounded-full ${
                log.water_met ? "bg-cyan-400 animate-ping shadow-[0_0_10px_#00F0FF]" : "bg-slate-800"
              }`}></span>
              <div className="text-[10px] font-black tracking-widest text-slate-500 uppercase">HABIT 03</div>
              <div className="text-sm font-black italic tracking-tight text-white mt-1 uppercase">HYDRATION</div>
              <div className={`text-[10px] font-bold mt-4 tracking-wider ${
                log.water_met ? "text-cyan-400 font-black" : "text-slate-600"
              }`}>
                {log.water_met ? "TARGET MET [ON]" : "PENDING [OFF]"}
              </div>
            </button>

            {/* Habit 04: Diet */}
            <button
              onClick={() => handleToggleHabit("diet_met", log.diet_met)}
              className={`depth-card depth-elevated p-5 rounded-3xl border text-left relative overflow-hidden cursor-pointer active:scale-[0.98] ${
                log.diet_met
                  ? "bg-gradient-to-b from-blue-950/40 to-cyan-950/40 border-cyan-400 shadow-[0_0_25px_rgba(0,240,255,0.25)]"
                  : "bg-slate-900/60 border-white/5 hover:border-white/20"
              }`}
            >
              <span className={`absolute top-4 right-4 w-2.5 h-2.5 rounded-full ${
                log.diet_met ? "bg-cyan-400 animate-ping shadow-[0_0_10px_#00F0FF]" : "bg-slate-800"
              }`}></span>
              <div className="text-[10px] font-black tracking-widest text-slate-500 uppercase">HABIT 04</div>
              <div className="text-sm font-black italic tracking-tight text-white mt-1 uppercase">DIET PLAN</div>
              <div className={`text-[10px] font-bold mt-4 tracking-wider ${
                log.diet_met ? "text-cyan-400 font-black" : "text-slate-600"
              }`}>
                {log.diet_met ? "TARGET MET [ON]" : "PENDING [OFF]"}
              </div>
            </button>

          </div>
        </section>
      </div>
    </div>
  );
}
