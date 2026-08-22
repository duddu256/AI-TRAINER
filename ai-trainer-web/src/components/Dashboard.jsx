import React, { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";

export default function Dashboard() {
  // Today's Date in ISO format (YYYY-MM-DD)
  const todayStr = new Date().toISOString().split("T")[0];

  // --- STATE SYSTEM ---
  const [date, setDate] = useState(todayStr);
  const [profile, setProfile] = useState(null);
  const [log, setLog] = useState({
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
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Split selection & Exercises list
  const [selectedSplit, setSelectedSplit] = useState("PUSH DAY");
  const [splitExercises, setSplitExercises] = useState([]);
  const [exercisesLoading, setExercisesLoading] = useState(false);

  // Meal modal & form state
  const [showMealModal, setShowMealModal] = useState(false);
  const [mealName, setMealName] = useState("");
  const [mealCalories, setMealCalories] = useState("");
  const [mealProtein, setMealProtein] = useState("");
  const [mealCarbs, setMealCarbs] = useState("");
  const [mealFat, setMealFat] = useState("");
  const [mealSubmitting, setMealSubmitting] = useState(false);

  // AI Tactical Assistant state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // --- DATA LOADING & SYNCING ---
  const loadDashboardData = useCallback(async (targetDate) => {
    setLoading(true);
    setError("");
    try {
      // 1. Fetch user targets and physical profile variables
      const profileData = await api.getProfile();
      setProfile(profileData);

      // 2. Fetch or auto-initialize database logs for selected date
      const logData = await api.getDailyLog(targetDate);
      setLog(logData);
      
      if (logData.workout_split) {
        setSelectedSplit(logData.workout_split);
      }
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

  // Load exercises when selectedSplit changes
  useEffect(() => {
    const loadExercises = async () => {
      setExercisesLoading(true);
      try {
        const exercises = await api.getWorkoutsBySplit(selectedSplit);
        setSplitExercises(exercises || []);
      } catch (err) {
        console.error("Failed to load workout split:", err);
        setSplitExercises([]);
      } finally {
        setExercisesLoading(false);
      }
    };

    loadExercises();
  }, [selectedSplit]);

  // --- SPLIT & EXERCISE INTERACTIONS ---
  const handleSelectSplit = async (splitName) => {
    setSelectedSplit(splitName);
    try {
      setLog((prev) => ({ ...prev, workout_split: splitName }));
      await api.updateTrackers({
        date: date,
        workout_split: splitName,
      });
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
      await api.updateTrackers({
        date: date,
        completed_exercises: updatedCompleted,
        workout_completed: allDone ? true : log.workout_completed,
      });
    } catch (err) {
      console.error("Failed to update exercise completion:", err);
    }
  };

  // --- HABIT MUTATIONS ---
  const handleToggleHabit = async (field, currentValue) => {
    const newValue = !currentValue;
    try {
      setLog((prev) => ({ ...prev, [field]: newValue }));
      
      await api.updateTrackers({
        date: date,
        [field]: newValue,
      });
    } catch (err) {
      console.error("Failed to toggle metric:", err);
      setLog((prev) => ({ ...prev, [field]: currentValue })); // Rollback on error
    }
  };

  // Quick incremental hydration update
  const handleWaterIncrement = async (amount) => {
    const currentWater = log.water_intake_ml || 0;
    const newWater = Math.max(0, currentWater + amount);
    const targetWater = profile?.target_water_ml || 3000;
    const isMet = newWater >= targetWater;

    try {
      setLog((prev) => ({ 
        ...prev, 
        water_intake_ml: newWater,
        water_met: isMet
      }));

      await api.updateTrackers({
        date: date,
        water_intake_ml: newWater,
        water_met: isMet,
      });
    } catch (err) {
      console.error("Water tracker failed to save:", err);
      loadDashboardData(date);
    }
  };

  // Step metric adjustment
  const handleStepsUpdate = async (amount) => {
    const currentSteps = log.steps || 0;
    const newSteps = Math.max(0, currentSteps + amount);
    const targetSteps = profile?.target_steps || 10000;
    const isMet = newSteps >= targetSteps;

    try {
      setLog((prev) => ({ 
        ...prev, 
        steps: newSteps,
        steps_met: isMet
      }));

      await api.updateTrackers({
        date: date,
        steps: newSteps,
        steps_met: isMet,
      });
    } catch (err) {
      console.error("Steps tracker failed to save:", err);
      loadDashboardData(date);
    }
  };

  // Log a Meal (Manual payload submission)
  const handleLogMeal = async (e) => {
    e.preventDefault();
    if (!mealName || !mealCalories) return;

    setMealSubmitting(true);
    const loggedAtTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const mealData = {
      date: date,
      name: mealName.trim().toUpperCase(),
      calories: parseInt(mealCalories),
      protein_g: parseFloat(mealProtein) || 0,
      carbs_g: parseFloat(mealCarbs) || 0,
      fat_g: parseFloat(mealFat) || 0,
      logged_at: loggedAtTime,
    };

    try {
      await api.logMeal(mealData);
      
      // Close modal, clean state, and reload
      setShowMealModal(false);
      setMealName("");
      setMealCalories("");
      setMealProtein("");
      setMealCarbs("");
      setMealFat("");
      
      await loadDashboardData(date);
    } catch (err) {
      console.error("Meal logging error:", err);
      setError("FAILED TO LOG DIETARY PARAMETERS TO SQL.");
    } finally {
      setMealSubmitting(false);
    }
  };

  // --- MACRO ARITHMETIC ---
  const calculateConsumed = () => {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    if (log && log.meals) {
      log.meals.forEach((meal) => {
        totalCalories += Number(meal.calories) || 0;
        totalProtein += Number(meal.protein_g) || 0;
        totalCarbs += Number(meal.carbs_g) || 0;
        totalFat += Number(meal.fat_g) || 0;
      });
    }

    return {
      calories: Math.round(totalCalories),
      protein: parseFloat(totalProtein.toFixed(1)),
      carbs: parseFloat(totalCarbs.toFixed(1)),
      fat: parseFloat(totalFat.toFixed(1)),
    };
  };

  const consumed = calculateConsumed();

  // Target values derived from profiles
  const targetCalories = profile?.target_calories || 2000;
  const targetProtein = profile?.target_protein_g || 150;
  const targetCarbs = profile?.target_carbs_g || 200;
  const targetFat = profile?.target_fat_g || 65;
  const targetWater = profile?.target_water_ml || 3000;
  const targetSteps = profile?.target_steps || 10000;

  // Remaining macros
  const remainingCalories = Math.max(0, targetCalories - consumed.calories);
  const remainingProtein = Math.max(0, targetProtein - consumed.protein);
  const remainingCarbs = Math.max(0, targetCarbs - consumed.carbs);
  const remainingFat = Math.max(0, targetFat - consumed.fat);

  // Percentage mappings
  const caloriePercent = Math.min(100, (consumed.calories / targetCalories) * 100);
  const proteinPercent = Math.min(100, (consumed.protein / targetProtein) * 100);
  const carbsPercent = Math.min(100, (consumed.carbs / targetCarbs) * 100);
  const fatPercent = Math.min(100, (consumed.fat / targetFat) * 100);
  const waterPercent = Math.min(100, ((log.water_intake_ml || 0) / targetWater) * 100);
  const stepsPercent = Math.min(100, ((log.steps || 0) / targetSteps) * 100);

  // AI Diet Recommendation inquiry connected to FastAPI backend
  const handleAiInquiry = async (e) => {
    e.preventDefault();
    setAiLoading(true);
    setAiResponse(null);

    try {
      const suggestion = await api.getAiMealSuggestion({
        calories: remainingCalories > 0 ? remainingCalories : 500,
        protein_g: remainingProtein > 0 ? remainingProtein : 35,
        carbs_g: remainingCarbs > 0 ? remainingCarbs : 45,
        fat_g: remainingFat > 0 ? remainingFat : 12,
        fitness_goals: profile?.fitness_goals || "Hypertrophy",
      });
      setAiResponse(suggestion);
    } catch (err) {
      console.error("AI service error:", err);
      setError("AI SERVICE COMPILATION ENCOUNTERED AN ISSUE.");
    } finally {
      setAiLoading(false);
    }
  };

  // Direct append of AI suggestion into daily logs
  const handleAddAiMealToLog = async () => {
    if (!aiResponse) return;
    const loggedAtTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const mealPayload = {
      date: date,
      name: `AI REC: ${aiResponse.name.toUpperCase()}`,
      calories: aiResponse.calories,
      protein_g: aiResponse.protein,
      carbs_g: aiResponse.carbs,
      fat_g: aiResponse.fat,
      logged_at: loggedAtTime,
    };

    try {
      await api.logMeal(mealPayload);
      setAiResponse(null);
      setAiPrompt("");
      await loadDashboardData(date);
    } catch (err) {
      console.error("Failed to append AI meal:", err);
      setError("FAILED TO COMMIT AI MEAL TO DAILY LOG.");
    }
  };

  // Helper component to render 20-segment mechanical tick indicators
  const renderMechanicalTickMeter = (percentage, activeGradient = "from-[#0052FF] to-[#00F0FF]", glowColor = "rgba(0,240,255,0.4)") => {
    const totalTicks = 20;
    const activeTicks = Math.min(totalTicks, Math.round((percentage / 100) * totalTicks));

    return (
      <div className="flex items-center gap-1 w-full h-4 py-0.5">
        {Array.from({ length: totalTicks }).map((_, idx) => {
          const isActive = idx < activeTicks;
          return (
            <div
              key={idx}
              className={`flex-1 rounded-sm transition-all duration-300 ${
                isActive
                  ? `h-full bg-gradient-to-t ${activeGradient} shadow-[0_0_6px_${glowColor}]`
                  : "h-2 bg-[#121218] border-t border-slate-900"
              }`}
            ></div>
          );
        })}
      </div>
    );
  };

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 border-4 border-slate-800 border-t-cyan-400 rounded-full animate-spin mb-4 shadow-[0_0_20px_rgba(0,240,255,0.3)]"></div>
        <div className="text-cyan-400 font-black tracking-[0.25em] text-xs uppercase animate-pulse">
          SYNCHRONIZING ATHLETIC COMBAT MATRIX...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-black text-white relative overflow-x-hidden font-sans pb-20 select-none">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/5 blur-[160px] rounded-full pointer-events-none z-0"></div>
      <div className="absolute bottom-20 left-0 w-[600px] h-[600px] bg-cyan-400/5 blur-[160px] rounded-full pointer-events-none z-0"></div>

      {/* HEADER SECTION */}
      <header className="border-b border-[#14141c] bg-black/80 backdrop-blur-xl sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#0052FF] to-[#00F0FF] flex items-center justify-center font-black text-black text-xl italic tracking-tighter shadow-[0_0_20px_rgba(0,240,255,0.3)]">
              AT
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black tracking-[0.25em] text-cyan-400 uppercase">
                  AURATRAINER // MVP CONSOLE
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
              </div>
              <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none mt-1">
                WELCOME, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0052FF] via-cyan-400 to-[#00F0FF]">{profile?.name || "ATHLETE"}</span>
              </h1>
            </div>
          </div>

          {/* Date Selector Navigation */}
          <div className="flex items-center bg-[#0a0a0c] border border-[#1a1a24] rounded-2xl px-3 py-2 self-start sm:self-auto shadow-inner">
            <button
              onClick={() => {
                const prev = new Date(date);
                prev.setDate(prev.getDate() - 1);
                setDate(prev.toISOString().split("T")[0]);
              }}
              className="px-2 py-1 text-slate-400 hover:text-cyan-400 font-bold transition text-base cursor-pointer"
              title="Previous Day"
            >
              ←
            </button>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-xs font-black tracking-widest text-slate-100 focus:outline-none uppercase px-3 cursor-pointer text-center"
            />
            <button
              onClick={() => {
                const next = new Date(date);
                next.setDate(next.getDate() + 1);
                setDate(next.toISOString().split("T")[0]);
              }}
              className="px-2 py-1 text-slate-400 hover:text-cyan-400 font-bold transition text-base cursor-pointer"
              title="Next Day"
            >
              →
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto px-6 mt-4">
          <div className="p-4 bg-red-950/40 border-l-4 border-red-500 text-red-200 text-xs font-bold rounded-r-xl uppercase tracking-wider">
            {error}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 mt-8 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: TRAINERS, HABITS & DIET PROGRESS (8 COLS) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* 1. DAILY FOCUS SPLIT SELECTOR */}
          <section className="bg-[#0a0a0c] border border-[#1a1a24] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#0052FF] via-cyan-400 to-[#00F0FF]"></div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-2">
              <div>
                <span className="text-[9px] font-black tracking-[0.25em] text-cyan-400 uppercase">
                  TRAINING PROTOCOL
                </span>
                <h2 className="text-xl font-black italic tracking-tighter uppercase mt-0.5">
                  TODAY'S WORKOUT SPLIT
                </h2>
              </div>
              <span className="text-xs font-black tracking-widest text-slate-500 uppercase">
                GOAL: {profile?.fitness_goals?.toUpperCase() || "HYPERTROPHY"}
              </span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: "PUSH DAY", label: "PUSH DAY", desc: "CHEST / DELTS / TRICEPS" },
                { id: "PULL DAY", label: "PULL DAY", desc: "BACK / LATS / BICEPS" },
                { id: "LEG DAY", label: "LEG DAY", desc: "QUADS / HAMS / CALVES" },
                { id: "REST / RECOVERY", label: "REST / FUEL", desc: "ACTIVE RECOVERY" }
              ].map((splitOption) => {
                const isSelected = selectedSplit === splitOption.id;
                return (
                  <button
                    key={splitOption.id}
                    onClick={() => handleSelectSplit(splitOption.id)}
                    className={`py-4 px-3 rounded-2xl border text-center transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? "bg-gradient-to-b from-blue-950/60 to-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.2)]"
                        : "bg-black border-slate-900 hover:border-slate-800"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#00F0FF]"></div>
                    )}
                    <div className={`text-xs font-black italic tracking-tight uppercase ${
                      isSelected ? "text-cyan-400" : "text-slate-300"
                    }`}>
                      {splitOption.label}
                    </div>
                    <div className="text-[8px] font-bold text-slate-500 mt-1 uppercase tracking-wider">
                      {splitOption.desc}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* SPLIT EXERCISE CHECKLIST */}
            <div className="mt-6 pt-6 border-t border-[#14141c]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black tracking-[0.2em] text-slate-400 uppercase">
                  ACTIVE EXERCISE PROTOCOL ({splitExercises.length} EXERCISES)
                </h3>
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
                  {log.completed_exercises?.length || 0} / {splitExercises.length} COMPLETED
                </span>
              </div>

              {exercisesLoading ? (
                <div className="py-6 text-center text-xs text-slate-600 font-bold uppercase animate-pulse">
                  LOADING EXERCISE METRICS...
                </div>
              ) : splitExercises.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {splitExercises.map((ex, index) => {
                    const isDone = log.completed_exercises?.includes(ex.name);
                    return (
                      <div
                        key={index}
                        onClick={() => handleToggleExercise(ex.name)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isDone
                            ? "bg-cyan-950/20 border-cyan-500/50 shadow-[0_0_12px_rgba(0,240,255,0.1)]"
                            : "bg-black border-slate-900 hover:border-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-lg flex items-center justify-center font-black text-[10px] border transition-all ${
                            isDone
                              ? "bg-cyan-400 text-black border-cyan-400 shadow-[0_0_8px_#00F0FF]"
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
                            <div className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">
                              {ex.sets} SETS × {ex.reps} REPS • <span className="text-slate-400">{ex.weight}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-slate-900 rounded-2xl bg-black">
                  <p className="text-xs text-slate-600 font-black uppercase tracking-wider">
                    REST & RECOVERY PROTOCOL ACTIVE. REHYDRATE AND REBUILD MUSCLE TISSUE.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* 2. STREAK CHECKLIST PROTOCOL */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black italic tracking-tighter uppercase">
                STREAK PROTOCOL <span className="text-cyan-400">// DAILY HABITS</span>
              </h2>
              <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
                CLICK TO TOGGLE HABITS
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              
              {/* Habit: Workout */}
              <button
                onClick={() => handleToggleHabit("workout_completed", log.workout_completed)}
                className={`p-5 rounded-3xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                  log.workout_completed
                    ? "bg-gradient-to-b from-blue-950/30 to-cyan-950/30 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.2)]"
                    : "bg-[#0a0a0c] border-[#1a1a24] hover:border-slate-800"
                }`}
              >
                <span className={`absolute top-4 right-4 w-2.5 h-2.5 rounded-full ${
                  log.workout_completed ? "bg-cyan-400 animate-ping shadow-[0_0_10px_#00F0FF]" : "bg-slate-800"
                }`}></span>
                <div className="text-[10px] font-black tracking-widest text-slate-500 uppercase">HABIT 01</div>
                <div className="text-sm font-black italic tracking-tight text-white mt-1 uppercase">WORKOUT</div>
                <div className={`text-[10px] font-bold mt-4 tracking-wider ${
                  log.workout_completed ? "text-cyan-400" : "text-slate-600"
                }`}>
                  {log.workout_completed ? "COMPLETED [ON]" : "PENDING [OFF]"}
                </div>
              </button>

              {/* Habit: Steps */}
              <button
                onClick={() => handleToggleHabit("steps_met", log.steps_met)}
                className={`p-5 rounded-3xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                  log.steps_met
                    ? "bg-gradient-to-b from-blue-950/30 to-cyan-950/30 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.2)]"
                    : "bg-[#0a0a0c] border-[#1a1a24] hover:border-slate-800"
                }`}
              >
                <span className={`absolute top-4 right-4 w-2.5 h-2.5 rounded-full ${
                  log.steps_met ? "bg-cyan-400 animate-ping shadow-[0_0_10px_#00F0FF]" : "bg-slate-800"
                }`}></span>
                <div className="text-[10px] font-black tracking-widest text-slate-500 uppercase">HABIT 02</div>
                <div className="text-sm font-black italic tracking-tight text-white mt-1 uppercase">DAILY STEPS</div>
                <div className={`text-[10px] font-bold mt-4 tracking-wider ${
                  log.steps_met ? "text-cyan-400" : "text-slate-600"
                }`}>
                  {log.steps_met ? "TARGET MET [ON]" : "PENDING [OFF]"}
                </div>
              </button>

              {/* Habit: Hydration */}
              <button
                onClick={() => handleToggleHabit("water_met", log.water_met)}
                className={`p-5 rounded-3xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                  log.water_met
                    ? "bg-gradient-to-b from-blue-950/30 to-cyan-950/30 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.2)]"
                    : "bg-[#0a0a0c] border-[#1a1a24] hover:border-slate-800"
                }`}
              >
                <span className={`absolute top-4 right-4 w-2.5 h-2.5 rounded-full ${
                  log.water_met ? "bg-cyan-400 animate-ping shadow-[0_0_10px_#00F0FF]" : "bg-slate-800"
                }`}></span>
                <div className="text-[10px] font-black tracking-widest text-slate-500 uppercase">HABIT 03</div>
                <div className="text-sm font-black italic tracking-tight text-white mt-1 uppercase">HYDRATION</div>
                <div className={`text-[10px] font-bold mt-4 tracking-wider ${
                  log.water_met ? "text-cyan-400" : "text-slate-600"
                }`}>
                  {log.water_met ? "TARGET MET [ON]" : "PENDING [OFF]"}
                </div>
              </button>

              {/* Habit: Diet */}
              <button
                onClick={() => handleToggleHabit("diet_met", log.diet_met)}
                className={`p-5 rounded-3xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                  log.diet_met
                    ? "bg-gradient-to-b from-blue-950/30 to-cyan-950/30 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.2)]"
                    : "bg-[#0a0a0c] border-[#1a1a24] hover:border-slate-800"
                }`}
              >
                <span className={`absolute top-4 right-4 w-2.5 h-2.5 rounded-full ${
                  log.diet_met ? "bg-cyan-400 animate-ping shadow-[0_0_10px_#00F0FF]" : "bg-slate-800"
                }`}></span>
                <div className="text-[10px] font-black tracking-widest text-slate-500 uppercase">HABIT 04</div>
                <div className="text-sm font-black italic tracking-tight text-white mt-1 uppercase">DIET PLAN</div>
                <div className={`text-[10px] font-bold mt-4 tracking-wider ${
                  log.diet_met ? "text-cyan-400" : "text-slate-600"
                }`}>
                  {log.diet_met ? "TARGET MET [ON]" : "PENDING [OFF]"}
                </div>
              </button>

            </div>
          </section>

          {/* 3. NUTRIENTS BALANCE CENTER */}
          <section className="bg-[#0a0a0c] border border-[#1a1a24] rounded-3xl p-6 sm:p-8 shadow-2xl">
            <h2 className="text-xl font-black italic tracking-tighter uppercase mb-6">
              DIET BALANCES <span className="text-cyan-400">// MACRO MATRIX</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              
              {/* Circular Calorie Gauge */}
              <div className="md:col-span-5 flex flex-col items-center justify-center relative">
                <div className="relative w-48 h-48 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      className="stroke-[#121218] fill-transparent"
                      strokeWidth="12"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      className="stroke-cyan-400 fill-transparent transition-all duration-500"
                      strokeWidth="12"
                      strokeDasharray="502.4"
                      strokeDashoffset={502.4 - (502.4 * caloriePercent) / 100}
                      strokeLinecap="round"
                      style={{ filter: "drop-shadow(0 0 8px #00F0FF)" }}
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-4xl font-black tracking-tighter text-white">{remainingCalories}</span>
                    <div className="text-[9px] font-black tracking-[0.2em] text-slate-500 uppercase mt-1">KCAL REMAINING</div>
                  </div>
                </div>
                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-4 text-center">
                  CONSUMED: <span className="text-cyan-400">{consumed.calories}</span> / {targetCalories} KCAL
                </div>
              </div>

              {/* MECHANICAL 20-TICK PROGRESS METERS */}
              <div className="md:col-span-7 space-y-6">
                
                {/* Protein Tick Progress */}
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-black tracking-wider text-slate-200 uppercase">PROTEIN MATRIX</span>
                    <span className="text-xs font-bold text-slate-300">
                      <span className="text-cyan-400 font-black">{consumed.protein}G</span> / <span className="text-slate-500">{targetProtein}G</span>
                    </span>
                  </div>
                  {renderMechanicalTickMeter(proteinPercent, "from-[#0052FF] to-[#00F0FF]", "rgba(0,240,255,0.4)")}
                </div>

                {/* Carbohydrates Tick Progress */}
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-black tracking-wider text-slate-200 uppercase">CARBOHYDRATES</span>
                    <span className="text-xs font-bold text-slate-300">
                      <span className="text-blue-400 font-black">{consumed.carbs}G</span> / <span className="text-slate-500">{targetCarbs}G</span>
                    </span>
                  </div>
                  {renderMechanicalTickMeter(carbsPercent, "from-blue-600 to-cyan-400", "rgba(0,82,255,0.4)")}
                </div>

                {/* Fats Tick Progress */}
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-black tracking-wider text-slate-200 uppercase">DIETARY FATS</span>
                    <span className="text-xs font-bold text-slate-300">
                      <span className="text-indigo-400 font-black">{consumed.fat}G</span> / <span className="text-slate-500">{targetFat}G</span>
                    </span>
                  </div>
                  {renderMechanicalTickMeter(fatPercent, "from-indigo-600 to-blue-400", "rgba(99,102,241,0.4)")}
                </div>

              </div>

            </div>
          </section>

          {/* 4. DIET MEAL LOGS */}
          <section className="bg-[#0a0a0c] border border-[#1a1a24] rounded-3xl p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-[9px] font-black tracking-[0.25em] text-cyan-400 uppercase">
                  DIETARY FUEL PIPELINE
                </span>
                <h2 className="text-xl font-black italic tracking-tighter uppercase mt-0.5">
                  TODAY'S FUEL LOGS
                </h2>
              </div>
              <button
                onClick={() => setShowMealModal(true)}
                className="px-5 py-3 bg-gradient-to-r from-[#0052FF] to-[#00F0FF] text-black text-[10px] font-black tracking-[0.2em] uppercase rounded-xl transition hover:opacity-95 transform active:scale-95 shadow-[0_0_15px_rgba(0,240,255,0.3)] cursor-pointer"
              >
                + LOG FUEL INTAKE
              </button>
            </div>

            {log.meals && log.meals.length > 0 ? (
              <div className="divide-y divide-[#14141c]">
                {log.meals.map((meal, idx) => (
                  <div key={meal.id || idx} className="py-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-sm text-white uppercase tracking-tight">{meal.name}</h4>
                      <div className="flex gap-4 text-[10px] text-slate-400 font-bold uppercase mt-1">
                        <span>P: <span className="text-cyan-400">{meal.protein_g}G</span></span>
                        <span>C: <span className="text-blue-400">{meal.carbs_g}G</span></span>
                        <span>F: <span className="text-indigo-400">{meal.fat_g}G</span></span>
                        <span className="text-slate-500 font-semibold">{meal.logged_at}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black tracking-tight text-white">{meal.calories}</span>
                      <span className="text-[9px] font-black tracking-widest text-slate-500 block uppercase">KCAL</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 border border-dashed border-slate-900 rounded-2xl bg-black">
                <p className="text-xs text-slate-600 font-black uppercase tracking-wider">
                  NO FOOD INTAKE REGISTERED TODAY. LOG A MEAL OR QUERY AI TO POPULATE STATS.
                </p>
              </div>
            )}
          </section>

        </div>

        {/* RIGHT COLUMN: WATER, STEPS, AND AI TRACKER LOGS (4 COLS) */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* 1. HYDRATION STATION */}
          <section className="bg-[#0a0a0c] border border-[#1a1a24] rounded-3xl p-6 shadow-2xl text-center">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[9px] font-black tracking-[0.25em] text-cyan-400 uppercase">
                HYDRATION STATION
              </span>
              <span className="text-[9px] font-bold text-slate-500 uppercase">
                {Math.round(waterPercent)}%
              </span>
            </div>
            
            <div className="text-5xl sm:text-6xl font-black tracking-tighter text-white leading-none">
              {log.water_intake_ml || 0} <span className="text-sm font-bold text-slate-500">ML</span>
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase mt-2">
              TARGET: {targetWater} ML
            </div>

            {/* Hydration 20-Tick Meter */}
            <div className="mt-6">
              {renderMechanicalTickMeter(waterPercent, "from-blue-600 to-cyan-400", "rgba(0,240,255,0.4)")}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={() => handleWaterIncrement(250)}
                className="py-3 bg-black border border-slate-900 hover:border-cyan-400 rounded-xl font-black text-[11px] tracking-widest text-slate-200 transition cursor-pointer"
              >
                +250 ML
              </button>
              <button
                onClick={() => handleWaterIncrement(500)}
                className="py-3 bg-black border border-slate-900 hover:border-cyan-400 rounded-xl font-black text-[11px] tracking-widest text-slate-200 transition cursor-pointer"
              >
                +500 ML
              </button>
            </div>
          </section>

          {/* 2. STEPS TRACKER */}
          <section className="bg-[#0a0a0c] border border-[#1a1a24] rounded-3xl p-6 shadow-2xl text-center">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[9px] font-black tracking-[0.25em] text-cyan-400 uppercase">
                STEPS REGISTER
              </span>
              <span className="text-[9px] font-bold text-slate-500 uppercase">
                {Math.round(stepsPercent)}%
              </span>
            </div>
            
            <div className="text-5xl sm:text-6xl font-black tracking-tighter text-white leading-none">
              {log.steps || 0} <span className="text-sm font-bold text-slate-500">STEPS</span>
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase mt-2">
              HABIT TARGET: {targetSteps} STEPS
            </div>

            {/* Steps 20-Tick Meter */}
            <div className="mt-6">
              {renderMechanicalTickMeter(stepsPercent, "from-[#0052FF] to-[#00F0FF]", "rgba(0,240,255,0.4)")}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={() => handleStepsUpdate(1000)}
                className="py-3 bg-black border border-slate-900 hover:border-cyan-400 rounded-xl font-black text-[11px] tracking-widest text-slate-200 transition cursor-pointer"
              >
                +1,000
              </button>
              <button
                onClick={() => handleStepsUpdate(-1000)}
                className="py-3 bg-black border border-slate-900 hover:border-red-500 rounded-xl font-black text-[11px] tracking-widest text-slate-400 transition cursor-pointer"
              >
                -1,000
              </button>
            </div>
          </section>

          {/* 3. AI STRATEGIST CONSOLE */}
          <section className="bg-[#0a0a0c] border border-[#1a1a24] rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#0052FF] via-cyan-400 to-[#00F0FF]"></div>
            
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[9px] font-black tracking-[0.25em] text-cyan-400 uppercase">
                AI DIET STRATEGIST
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
            </div>

            <form onSubmit={handleAiInquiry} className="space-y-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed">
                SYNTHESIZE MEAL PROTOCOLS TARGETED TO YOUR REMAINING {remainingProtein.toFixed(0)}G PROTEIN GOAL:
              </p>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows="2"
                className="w-full p-4 bg-black border border-slate-900 rounded-2xl text-xs text-slate-200 focus:outline-none focus:border-cyan-400 placeholder-slate-700 font-medium"
                placeholder="E.G., 'QUICK POST-WORKOUT MEAL WITH HIGH PROTEIN'..."
              />
              <button
                type="submit"
                disabled={aiLoading}
                className="w-full py-3.5 bg-white text-black font-black text-[10px] tracking-[0.25em] uppercase rounded-2xl transition hover:bg-slate-200 cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.15)] disabled:opacity-50"
              >
                {aiLoading ? "SYNTHESIZING PROTOCOL..." : "EXECUTE AI QUERY →"}
              </button>
            </form>

            {aiResponse && (
              <div className="mt-6 p-5 bg-black border border-cyan-500/40 rounded-2xl space-y-4 shadow-[0_0_20px_rgba(0,240,255,0.1)] relative">
                <div>
                  <span className="text-[8px] font-black tracking-[0.2em] text-cyan-400 uppercase bg-cyan-950/40 border border-cyan-500/30 px-2 py-1 rounded-md">
                    SYNTHESIZED RECIPE
                  </span>
                  <h4 className="font-black text-sm uppercase text-white mt-2.5">{aiResponse.name}</h4>
                  <div className="flex gap-4 text-[10px] text-slate-400 font-bold uppercase mt-1">
                    <span>P: <span className="text-cyan-400">{aiResponse.protein}G</span></span>
                    <span>C: <span className="text-blue-400">{aiResponse.carbs}G</span></span>
                    <span>F: <span className="text-indigo-400">{aiResponse.fat}G</span></span>
                    <span className="text-white font-black">{aiResponse.calories} KCAL</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-300 leading-relaxed border-t border-[#14141c] pt-3">
                  {aiResponse.instructions}
                </div>

                <button
                  type="button"
                  onClick={handleAddAiMealToLog}
                  className="w-full py-3 bg-gradient-to-r from-[#0052FF] to-[#00F0FF] text-black font-black text-[10px] tracking-[0.2em] uppercase rounded-xl transition shadow-[0_0_15px_rgba(0,240,255,0.3)] cursor-pointer"
                >
                  APPEND TO DIET LOG
                </button>
              </div>
            )}
          </section>

        </div>

      </main>

      {/* --- ADD MEAL MODAL (MANUAL INPUT FORM) --- */}
      {showMealModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-[#0a0a0c] border border-[#1a1a24] rounded-3xl p-8 relative shadow-[0_0_50px_rgba(0,82,255,0.2)]">
            <h3 className="text-2xl font-black italic tracking-tighter text-white uppercase mb-6 leading-none">
              LOG ATHLETE <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0052FF] to-[#00F0FF]">FUEL</span>
            </h3>

            <form onSubmit={handleLogMeal} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">
                  MEAL DESCRIPTION
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={mealName}
                  onChange={(e) => setMealName(e.target.value)}
                  className="w-full px-4 py-3 bg-black border border-slate-900 rounded-xl text-xs text-white placeholder-slate-700 focus:outline-none focus:border-cyan-400 uppercase"
                  placeholder="E.G., GRILLED CHICKEN BREAST & RICE"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">
                    CALORIES (KCAL)
                  </label>
                  <input
                    type="number"
                    required
                    value={mealCalories}
                    onChange={(e) => setMealCalories(e.target.value)}
                    className="w-full px-4 py-3 bg-black border border-slate-900 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
                    placeholder="450"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">
                    PROTEIN (G)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={mealProtein}
                    onChange={(e) => setMealProtein(e.target.value)}
                    className="w-full px-4 py-3 bg-black border border-slate-900 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
                    placeholder="35"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">
                    CARBOHYDRATES (G)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={mealCarbs}
                    onChange={(e) => setMealCarbs(e.target.value)}
                    className="w-full px-4 py-3 bg-black border border-slate-900 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
                    placeholder="45"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">
                    FAT INTAKE (G)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={mealFat}
                    onChange={(e) => setMealFat(e.target.value)}
                    className="w-full px-4 py-3 bg-black border border-slate-900 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
                    placeholder="12"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowMealModal(false)}
                  className="flex-1 py-3.5 bg-black border border-slate-800 hover:border-slate-700 text-slate-400 font-bold text-xs uppercase rounded-xl tracking-wider cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={mealSubmitting}
                  className="flex-1 py-3.5 bg-gradient-to-r from-[#0052FF] to-[#00F0FF] text-black font-black text-xs uppercase rounded-xl tracking-widest shadow-[0_0_20px_rgba(0,240,255,0.3)] cursor-pointer disabled:opacity-50"
                >
                  {mealSubmitting ? "COMMITTING..." : "COMMIT FUEL"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}