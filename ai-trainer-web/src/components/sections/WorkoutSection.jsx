import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { api } from "../../services/api";
import CustomSplitEditor from "../CustomSplitEditor";
import SectionHeader from "./SectionHeader";

const STANDARD_SPLITS = [
  { id: "PUSH DAY", label: "PUSH DAY", desc: "CHEST / DELTS / TRICEPS" },
  { id: "PULL DAY", label: "PULL DAY", desc: "BACK / LATS / BICEPS" },
  { id: "LEG DAY", label: "LEG DAY", desc: "QUADS / HAMS / CALVES" },
  { id: "REST / RECOVERY", label: "REST / FUEL", desc: "ACTIVE RECOVERY" },
];

export default function WorkoutSection() {
  const { date, log, setLog, checkBadgeUnlocks, handleToggleHabit } = useOutletContext();

  // Split selection & Exercises list (Module 2)
  const [selectedSplit, setSelectedSplit] = useState(
    log.workout_split && log.workout_split !== "REST / RECOVERY" ? log.workout_split : "PUSH DAY"
  );
  const [splitExercises, setSplitExercises] = useState([]);
  const [exercisesLoading, setExercisesLoading] = useState(false);
  const [progressionTargets, setProgressionTargets] = useState({});
  const [customSplits, setCustomSplits] = useState({});
  const [showSplitEditor, setShowSplitEditor] = useState(false);

  // Quick Add Exercise to Active Split
  const [showQuickAddEx, setShowQuickAddEx] = useState(false);
  const [quickExName, setQuickExName] = useState("");
  const [quickExSets, setQuickExSets] = useState(4);
  const [quickExReps, setQuickExReps] = useState("8-10");
  const [quickExWeight, setQuickExWeight] = useState("60kg");

  // Follow the day's stored split when the date (and so the log) changes.
  useEffect(() => {
    if (log.workout_split) setSelectedSplit(log.workout_split);
  }, [log.workout_split]);

  useEffect(() => {
    api.getCustomSplits().then((splits) => setCustomSplits(splits || {})).catch(() => {});
  }, []);

  // Load exercises and progressive overload targets when selectedSplit changes
  const loadExercisesForSplit = useCallback(async (splitToLoad) => {
    setExercisesLoading(true);
    try {
      const exercises = await api.getWorkoutsBySplit(splitToLoad);
      setSplitExercises(exercises || []);

      // Query Vector RAG for progressive overload targets for each exercise
      if (exercises && exercises.length > 0) {
        const targets = {};
        await Promise.all(
          exercises.map(async (ex) => {
            try {
              targets[ex.name] = await api.getProgressionTarget(ex.name);
            } catch {
              targets[ex.name] = {
                progression_target_text: "🎯 AI Goal: Progressive Overload",
                target_weight: ex.weight,
                target_reps: ex.reps,
              };
            }
          })
        );
        setProgressionTargets(targets);
      }
    } catch (err) {
      console.error("Failed to load workout split:", err);
      setSplitExercises([]);
    } finally {
      setExercisesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExercisesForSplit(selectedSplit);
  }, [selectedSplit, loadExercisesForSplit]);

  // --- SPLIT & EXERCISE INTERACTIONS ---
  const handleSelectSplit = async (splitName) => {
    setSelectedSplit(splitName);
    try {
      setLog((prev) => ({ ...prev, workout_split: splitName }));
      const res = await api.updateTrackers({
        date: date,
        workout_split: splitName,
      });
      checkBadgeUnlocks(res);
    } catch (err) {
      console.error("Failed to save workout split:", err);
    }
  };

  const handleToggleExercise = async (exerciseName) => {
    const currentCompleted = log.completed_exercises || [];
    let updatedCompleted;

    if (currentCompleted.includes(exerciseName)) {
      updatedCompleted = currentCompleted.filter((name) => name !== exerciseName);
    } else {
      updatedCompleted = [...currentCompleted, exerciseName];
      
      // Record milestone in Vector RAG Memory
      const exObj = splitExercises.find((e) => e.name === exerciseName);
      if (exObj) {
        api.recordWorkoutPerformance({
          exercise_name: exerciseName,
          sets: exObj.sets || 3,
          reps: String(exObj.reps || "10"),
          weight: exObj.weight || "Standard",
          date: date
        }).catch((e) => console.log("Vector memory record error:", e));
      }
    }

    // Auto-flag workout_completed if all exercises are done
    const allDone =
      splitExercises.length > 0 &&
      splitExercises.every((ex) => updatedCompleted.includes(ex.name));

    setLog((prev) => ({
      ...prev,
      completed_exercises: updatedCompleted,
      workout_completed: allDone ? true : prev.workout_completed,
    }));

    try {
      const res = await api.updateTrackers({
        date: date,
        completed_exercises: updatedCompleted,
        workout_completed: allDone ? true : log.workout_completed,
      });
      checkBadgeUnlocks(res);
    } catch (err) {
      console.error("Failed to update exercise completion:", err);
    }
  };

  const handleQuickAddExercise = async (e) => {
    e.preventDefault();
    if (!quickExName.trim()) return;

    const newEx = {
      name: quickExName.trim(),
      sets: parseInt(quickExSets) || 3,
      reps: String(quickExReps).trim() || "10",
      weight: quickExWeight.trim() || "Bodyweight",
    };

    const updatedList = [...(splitExercises || []), newEx];
    setSplitExercises(updatedList);

    const updatedSplits = {
      ...customSplits,
      [selectedSplit]: updatedList,
    };
    setCustomSplits(updatedSplits);

    try {
      await api.saveCustomSplits(updatedSplits);
      // Query progression target for new exercise
      api.getProgressionTarget(newEx.name).then((targetInfo) => {
        setProgressionTargets((prev) => ({ ...prev, [newEx.name]: targetInfo }));
      }).catch(() => {});

      setQuickExName("");
      setShowQuickAddEx(false);
    } catch (err) {
      console.error("Failed to save quick exercise:", err);
    }
  };

  const handleDeleteExerciseFromSplit = async (exIndex, e) => {
    e.stopPropagation();
    const updatedList = splitExercises.filter((_, idx) => idx !== exIndex);
    setSplitExercises(updatedList);
    const updatedSplits = {
      ...customSplits,
      [selectedSplit]: updatedList,
    };
    setCustomSplits(updatedSplits);
    try {
      await api.saveCustomSplits(updatedSplits);
    } catch (err) {
      console.error("Failed to update split:", err);
    }
  };

  const customKeys = Object.keys(customSplits || {}).filter(
    (k) => !["PUSH DAY", "PULL DAY", "LEG DAY", "REST / RECOVERY"].includes(k.toUpperCase().trim())
  );

  const allSplitOptions = [
    ...STANDARD_SPLITS,
    ...customKeys.map((k) => ({
      id: k,
      label: k,
      desc: `${(customSplits[k] || []).length} PROTOCOL EXERCISES`,
    })),
  ];

  const completedCount = (log.completed_exercises || []).filter((name) =>
    splitExercises.some((ex) => ex.name === name)
  ).length;
  const sessionPercent = splitExercises.length ? Math.round((completedCount / splitExercises.length) * 100) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
      <div className="lg:col-span-8">
        <section className="depth-card depth-elevated bg-slate-900/95 border border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-cyan-500/30">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-[#00F0FF]"></div>

          <SectionHeader eyebrow="TRAINING PROTOCOL // VECTOR RAG" title="TODAY'S WORKOUT SPLIT">
              <button
                onClick={() => setShowQuickAddEx(!showQuickAddEx)}
                className="px-3.5 py-1.5 bg-cyan-950/70 border border-cyan-500/40 hover:border-cyan-400 rounded-xl text-[10px] font-black tracking-widest text-cyan-300 uppercase transition cursor-pointer hover:scale-105 active:scale-95 shadow-[0_0_12px_rgba(0,240,255,0.15)]"
              >
                {showQuickAddEx ? "✕ CANCEL ADD" : "+ ADD EXERCISE"}
              </button>
              <button
                onClick={() => setShowSplitEditor(true)}
                className="px-3.5 py-1.5 bg-slate-900/90 border border-slate-800 hover:border-cyan-400 rounded-xl text-[10px] font-black tracking-widest text-cyan-400 uppercase transition cursor-pointer shadow-[0_0_12px_rgba(0,240,255,0.15)] hover:scale-105 active:scale-95"
              >
                ⚡ CUSTOM SPLIT ARCHITECT
              </button>
            </SectionHeader>

          {/* Quick Add Exercise Form on Active Split */}
          {showQuickAddEx && (
            <form onSubmit={handleQuickAddExercise} className="mb-6 p-4 bg-black/60 border border-cyan-500/40 rounded-2xl space-y-3 animate-fade-in shadow-[0_0_20px_rgba(0,240,255,0.15)]">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black tracking-widest text-cyan-400 uppercase">
                  + APPEND EXERCISE TO {selectedSplit}
                </span>
                <span className="text-[9px] font-bold text-slate-500 uppercase">
                  AUTO-UPDATES PROGRESSIVE OVERLOAD
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  required
                  autoFocus
                  value={quickExName}
                  onChange={(e) => setQuickExName(e.target.value)}
                  className="sm:col-span-2 px-3 py-2 bg-black border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-bold"
                  placeholder="EXERCISE NAME (E.G., INCLINE DB PRESS)"
                />
                <input
                  type="number"
                  value={quickExSets}
                  onChange={(e) => setQuickExSets(e.target.value)}
                  className="px-3 py-2 bg-black border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-stats"
                  placeholder="SETS (4)"
                />
                <input
                  type="text"
                  value={quickExReps}
                  onChange={(e) => setQuickExReps(e.target.value)}
                  className="px-3 py-2 bg-black border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-stats"
                  placeholder="REPS (8-10)"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={quickExWeight}
                  onChange={(e) => setQuickExWeight(e.target.value)}
                  className="flex-1 px-3 py-2 bg-black border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-medium"
                  placeholder="TARGET WEIGHT (E.G., 30KG EACH / 80KG)"
                />
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-400 text-black font-black text-xs uppercase tracking-wider rounded-xl hover:brightness-110 transition cursor-pointer hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                >
                  + ADD TO SPLIT
                </button>
              </div>
            </form>
          )}

          {/* Split Switcher Buttons - Dynamic with all custom splits */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {allSplitOptions.map((splitOption) => {
              const isSelected = selectedSplit === splitOption.id;
              return (
                <button
                  key={splitOption.id}
                  onClick={() => handleSelectSplit(splitOption.id)}
                  className={`py-3.5 px-4 rounded-2xl border text-center transition-all duration-200 cursor-pointer relative overflow-hidden flex-shrink-0 hover:scale-[1.02] active:scale-[0.98] ${
                    isSelected
                      ? "bg-gradient-to-b from-blue-950/70 to-cyan-950/50 border-cyan-400 shadow-[0_0_25px_rgba(0,240,255,0.25)] min-w-36"
                      : "bg-black/50 border-slate-900 hover:border-slate-800 min-w-32"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00F0FF]"></div>
                  )}
                  <div className={`text-xs font-black italic tracking-tight uppercase truncate ${
                    isSelected ? "text-cyan-400" : "text-slate-300"
                  }`}>
                    {splitOption.label}
                  </div>
                  <div className="text-[8px] font-bold text-slate-500 mt-0.5 uppercase tracking-wider truncate">
                    {splitOption.desc}
                  </div>
                </button>
              );
            })}
          </div>

          {/* SPLIT EXERCISE CHECKLIST WITH VECTOR PROGRESSIVE OVERLOAD (MODULE 2) */}
          <div className="mt-6 pt-6 border-t border-white/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black tracking-[0.2em] text-slate-400 uppercase">
                ACTIVE EXERCISE PROTOCOL ({splitExercises.length} EXERCISES)
              </h3>
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest font-stats">
                {log.completed_exercises?.length || 0} / {splitExercises.length} COMPLETED
              </span>
            </div>

            {exercisesLoading ? (
              <div className="py-6 text-center text-xs text-slate-500 font-bold uppercase animate-pulse">
                QUERYING VECTOR RAG OVERLOAD MEMORY...
              </div>
            ) : splitExercises.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {splitExercises.map((ex, index) => {
                  const isDone = log.completed_exercises?.includes(ex.name);
                  const target = progressionTargets[ex.name];
                  return (
                    <div
                      key={index}
                      onClick={() => handleToggleExercise(ex.name)}
                      className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between group hover:scale-[1.01] active:scale-[0.99] relative ${
                        isDone
                          ? "bg-cyan-950/30 border-cyan-500/60 shadow-[0_0_20px_rgba(0,240,255,0.15)]"
                          : "bg-black/60 border-slate-900 hover:border-slate-800 hover:border-cyan-500/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-lg flex items-center justify-center font-black text-[10px] border transition-all flex-shrink-0 ${
                            isDone
                              ? "bg-cyan-400 text-black border-cyan-400 shadow-[0_0_10px_#00F0FF]"
                              : "border-slate-800 text-transparent"
                          }`}>
                            ✓
                          </div>
                          <div>
                            <div className={`text-xs font-black uppercase tracking-tight ${
                              isDone ? "text-cyan-300 line-through" : "text-white"
                            }`}>
                              {ex.name}
                            </div>
                            <div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                              {ex.sets} SETS × {ex.reps} REPS • <span className="text-slate-300 font-semibold">{ex.weight}</span>
                            </div>
                          </div>
                        </div>

                        {/* Quick Remove Exercise Button on Hover */}
                        <button
                          onClick={(e) => handleDeleteExerciseFromSplit(index, e)}
                          className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 text-sm font-bold px-1.5 py-0.5 rounded transition cursor-pointer"
                          title="Remove from split"
                        >
                          ×
                        </button>
                      </div>

                      {/* Glowing Vector Progressive Overload Target Sub-label */}
                      {target && (
                        <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between">
                          <span className="text-[9px] font-black tracking-wider text-cyan-300 bg-cyan-950/60 border border-cyan-400/40 px-2 py-0.5 rounded-md shadow-[0_0_12px_rgba(0,240,255,0.2)]">
                            {target.progression_target_text || "🎯 AI Goal: Overload"}
                          </span>
                          {target.has_previous_log && (
                            <span className="text-[8px] font-bold text-slate-500 uppercase">
                              PREV: {target.previous_performance}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-slate-900 rounded-2xl bg-black/40">
                <p className="text-xs text-slate-500 font-black uppercase tracking-wider">
                  REST & RECOVERY PROTOCOL ACTIVE. REHYDRATE AND REBUILD MUSCLE TISSUE.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Session summary rail: narrower, offset column breaks the symmetric grid */}
      <aside className="lg:col-span-4 lg:pt-10 space-y-6">
        <section className="depth-card depth-elevated depth-tilt-right bg-slate-900/95 border border-white/[0.08] rounded-3xl p-6">
          <span className="text-[9px] font-black tracking-[0.25em] text-cyan-400 uppercase">SESSION LOAD</span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-5xl font-black tracking-tighter font-stats">{sessionPercent}</span>
            <span className="text-sm font-black text-slate-500">%</span>
          </div>
          <div className="text-[10px] font-bold text-slate-500 uppercase mt-1">
            {completedCount} OF {splitExercises.length} EXERCISES • {selectedSplit}
          </div>
          <div className="w-full h-2 bg-black/60 rounded-full mt-4 overflow-hidden">
            <div
              style={{ width: `${sessionPercent}%` }}
              className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-[#00F0FF] rounded-full transition-all duration-500"
            />
          </div>
          <button
            type="button"
            onClick={() => handleToggleHabit("workout_completed", log.workout_completed)}
            className={`mt-5 w-full py-3 rounded-xl border text-[10px] font-black tracking-[0.2em] uppercase transition cursor-pointer active:scale-95 ${
              log.workout_completed
                ? "bg-cyan-950/50 border-cyan-400 text-cyan-300 shadow-[0_0_18px_rgba(0,240,255,0.2)]"
                : "bg-black/60 border-slate-800 text-slate-400 hover:border-cyan-500/50 hover:text-white"
            }`}
          >
            {log.workout_completed ? "✓ WORKOUT LOGGED" : "MARK WORKOUT COMPLETE"}
          </button>
        </section>
      </aside>

      {/* --- CUSTOM SPLIT EDITOR MODAL (MODULE 2) --- */}
      <CustomSplitEditor
        isOpen={showSplitEditor}
        onClose={() => {
          setShowSplitEditor(false);
          loadExercisesForSplit(selectedSplit);
        }}
        customSplits={customSplits}
        onSaveSplits={(updated) => {
          setCustomSplits(updated);
          loadExercisesForSplit(selectedSplit);
        }}
        onSelectSplit={(splitKey) => {
          setSelectedSplit(splitKey);
          loadExercisesForSplit(splitKey);
        }}
      />
    </div>
  );
}
