import React, { useState, useEffect } from "react";
import { api } from "../services/api";

export default function Dashboard() {
  // Today's Date in local timezone
  const todayStr = new Date().toISOString().split("T");

  // --- STATE SYSTEM ---
  const [date, setDate] = useState(todayStr);
  const [profile, setProfile] = useState(null);
  const [log, setLog] = useState({
    weight_today: null,
    steps: 0,
    water_intake_ml: 0,
    meals: [],
    workout_completed: false,
    diet_met: false,
    water_met: false,
    steps_met: false,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Split selection (Matches chosen daily training protocol)
  const [selectedSplit, setSelectedSplit] = useState("REST / RECOVERY");

  // Meal modal & form state
  const [showMealModal, setShowMealModal] = useState(false);
  const [mealName, setMealName] = useState("");
  const [mealCalories, setMealCalories] = useState("");
  const [mealProtein, setMealProtein] = useState("");
  const [mealCarbs, setMealCarbs] = useState("");
  const [mealFat, setMealFat] = useState("");

  // AI Tactical Assistant state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // --- DATA LOADING & SYNCING ---
  const loadDashboardData = async (targetDate) => {
    setLoading(true);
    setError("");
    try {
      // 1. Fetch user targets and physical profile variables
      const profileData = await api.getProfile();
      setProfile(profileData);

      // 2. Fetch or auto-initialize database logs for selected date
      const logData = await api.getDailyLog(targetDate);
      setLog(logData);
    } catch (err) {
      console.error("Dashboard sync error:", err);
      setError("FAILED TO SYNCHRONIZE ATHLETIC CONSOLE PORTAL.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData(date);
  }, [date]);

  // --- INTERACTION MUTATIONS ---

  // Toggle habit checkbox (Optimistic updates to keep interface fast)
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
    const newWater = Math.max(0, log.water_intake_ml + amount);
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
    const newSteps = Math.max(0, log.steps + amount);
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

    const loggedAtTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const mealData = {
      date: date,
      name: mealName.toUpperCase(),
      calories: parseInt(mealCalories),
      protein_g: parseFloat(mealProtein) || 0,
      carbs_g: parseFloat(mealCarbs) || 0,
      fat_g: parseFloat(mealFat) || 0,
      logged_at: loggedAtTime,
    };

    try {
      await api.logMeal(mealData);
      
      // Close, clean state, and reload
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
    }
  };

  // AI Diet Recommendation inquiry
  const handleAiInquiry = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    setAiLoading(true);
    setAiResponse(null);

    try {
      const consumed = calculateConsumed();
      const remainingProt = Math.max(0, (profile?.target_protein_g || 150) - consumed.protein);

      // AI Logic: Returns macro targets calculated from database profile baselines
      setTimeout(() => {
        let recommendation = {};
        const lowercasePrompt = aiPrompt.toLowerCase();

        if (lowercasePrompt.includes("snack") || lowercasePrompt.includes("quick") || lowercasePrompt.includes("easy")) {
          recommendation = {
            name: "High-Protein Greek Yogurt Cup",
            calories: 180,
            protein: 22,
            carbs: 12,
            fat: 3,
            instructions: "Combine 200g of non-fat Greek yogurt with 15g whey isolate. Top with blueberries. Fast absorption casein to active fibers."
          };
        } else if (lowercasePrompt.includes("lunch") || lowercasePrompt.includes("dinner") || lowercasePrompt.includes("meal")) {
          recommendation = {
            name: "Flame-Grilled Basil Chicken Bowl",
            calories: 450,
            protein: 42,
            carbs: 45,
            fat: 8,
            instructions: "Seared chicken breast over steamed brown rice and fresh broccoli florets. Drizzle with sesame oil."
          };
        } else {
          recommendation = {
            name: "Anabolic Berry Hydrolate Shake",
            calories: 290,
            protein: 30,
            carbs: 35,
            fat: 4,
            instructions: `Specifically targets your remaining protein thresholds. Blend 1 scoop whey, 100g mixed berries, and 250ml skim milk.`
          };
        }

        setAiResponse(recommendation);
        setAiLoading(false);
      }, 1200);
    } catch (err) {
      console.error("AI service error:", err);
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
      setError("FAILED TO COMMUNE AI MEAL SPLIT PROTOCOL.");
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
        totalCalories += meal.calories || 0;
        totalProtein += meal.protein_g || 0;
        totalCarbs += meal.carbs_g || 0;
        totalFat += meal.fat_g || 0;
      });
    }

    return {
      calories: totalCalories,
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

  // Percentage mappings
  const caloriePercent = Math.min(100, (consumed.calories / targetCalories) * 100);
  const proteinPercent = Math.min(100, (consumed.protein / targetProtein) * 100);
  const carbsPercent = Math.min(100, (consumed.carbs / targetCarbs) * 100);
  const fatPercent = Math.min(100, (consumed.fat / targetFat) * 100);
  const waterPercent = Math.min(100, (log.water_intake_ml / targetWater) * 100);
  const stepsPercent = Math.min(100, (log.steps / targetSteps) * 100);

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 border-t-4 border-b-4 border-cyan-400 rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(0,240,255,0.2)]"></div>
        <div className="text-cyan-400 font-black tracking-widest text-xs uppercase animate-pulse">
          RECONSTRUCTING DAILY COMBAT GRAPH...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-black text-white relative overflow-x-hidden font-sans pb-16">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[150px] rounded-full pointer-events-none z-0"></div>
      <div className="absolute bottom-10 left-0 w-[500px] h-[500px] bg-cyan-400/5 blur-[150px] rounded-full pointer-events-none z-0"></div>

      {/* HEADER SECTION */}
      <header className="border-b border-slate-900 bg-black/60 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center font-black text-black text-xl italic tracking-tighter">
              AT
            </div>
            <div>
              <span className="text-[9px] font-black tracking-[0.25em] text-cyan-400 uppercase">
                AuraTrainer Home Console
              </span>
              <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none mt-0.5">
                WELCOME BACK, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">{profile?.name || "RECRUIT"}</span>
              </h1>
            </div>
          </div>

          {/* Date Selector Navigation */}
          <div className="flex items-center bg-[#0a0a0c] border border-slate-900 rounded-xl px-2 py-1.5 self-start">
            <button
              onClick={() => {
                const prev = new Date(date);
                prev.setDate(prev.getDate() - 1);
                setDate(prev.toISOString().split("T"));
              }}
              className="px-2.5 py-1 text-slate-500 hover:text-white font-bold transition text-sm"
            >
              ←
            </button>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-xs font-black tracking-widest text-slate-200 focus:outline-none uppercase px-3 cursor-pointer text-center"
            />
            <button
              onClick={() => {
                const next = new Date(date);
                next.setDate(next.getDate() + 1);
                setDate(next.toISOString().split("T"));
              }}
              className="px-2.5 py-1 text-slate-500 hover:text-white font-bold transition text-sm"
            >
              →
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: TRAINERS, HABITS & DIET PROGRESS (8 COLS) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* 1. DAILY FOCUS SPLIT SELECTOR */}
          <section className="bg-[#0a0a0c] border border-slate-900 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-cyan-400"></div>
            
            <h2 className="text-xs font-black tracking-[0.2em] text-slate-500 uppercase mb-4">
              CHOOSE TODAY'S SPLIT PROTOCOL
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {["PUSH DAY", "PULL DAY", "LEG DAY", "REST / RECOVERY"].map((splitOption) => (
                <button
                  key={splitOption}
                  onClick={() => setSelectedSplit(splitOption)}
                  className={`py-4 px-3 rounded-2xl border text-center transition-all ${
                    selectedSplit === splitOption
                      ? "bg-gradient-to-b from-blue-950/40 to-cyan-950/40 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.15)]"
                      : "bg-black border-slate-900 hover:border-slate-800"
                  }`}
                >
                  <div className={`text-xs font-black tracking-tight ${
                    selectedSplit === splitOption ? "text-cyan-400" : "text-slate-400"
                  }`}>
                    {splitOption}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* 2. STREAK CHECKLIST PROTOCOL */}
          <section className="space-y-4">
            <h2 className="text-xl font-black italic tracking-tighter uppercase">
              STREAK CHECKLIST <span className="text-cyan-400">// PROTOCOLS</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              
              {/* Habit: Workout */}
              <button
                onClick={() => handleToggleHabit("workout_completed", log.workout_completed)}
                className={`p-5 rounded-3xl border text-left transition-all relative overflow-hidden ${
                  log.workout_completed
                    ? "bg-gradient-to-b from-blue-950/20 to-cyan-950/20 border-blue-500 shadow-[0_0_20px_rgba(0,82,255,0.15)]"
                    : "bg-[#0a0a0c] border-slate-900 hover:border-slate-800"
                }`}
              >
                <span className={`absolute top-4 right-4 w-2 h-2 rounded-full ${
                  log.workout_completed ? "bg-cyan-400 animate-ping shadow-[0_0_10px_rgba(0,240,255,1)]" : "bg-slate-800"
                }`}></span>
                <div className="text-[10px] font-black tracking-widest text-slate-500 uppercase">HABIT 01</div>
                <div className="text-sm font-black italic tracking-tight text-white mt-1 uppercase">WORKOUT</div>
                <div className={`text-[10px] font-bold mt-4 ${
                  log.workout_completed ? "text-cyan-400" : "text-slate-600"
                }`}>
                  {log.workout_completed ? "STREAK ACTIVE [ON]" : "PENDING LOG [OFF]"}
                </div>
              </button>

              {/* Habit: Steps */}
              <button
                onClick={() => handleToggleHabit("steps_met", log.steps_met)}
                className={`p-5 rounded-3xl border text-left transition-all relative overflow-hidden ${
                  log.steps_met
                    ? "bg-gradient-to-b from-blue-950/20 to-cyan-950/20 border-blue-500 shadow-[0_0_20px_rgba(0,82,255,0.15)]"
                    : "bg-[#0a0a0c] border-slate-900 hover:border-slate-800"
                }`}
              >
                <span className={`absolute top-4 right-4 w-2 h-2 rounded-full ${
                  log.steps_met ? "bg-cyan-400 animate-ping" : "bg-slate-800"
                }`}></span>
                <div className="text-[10px] font-black tracking-widest text-slate-500 uppercase">HABIT 02</div>
                <div className="text-sm font-black italic tracking-tight text-white mt-1 uppercase">DAILY STEPS</div>
                <div className={`text-[10px] font-bold mt-4 ${
                  log.steps_met ? "text-cyan-400" : "text-slate-600"
                }`}>
                  {log.steps_met ? "STREAK ACTIVE [ON]" : "PENDING LOG [OFF]"}
                </div>
              </button>

              {/* Habit: Hydration */}
              <button
                onClick={() => handleToggleHabit("water_met", log.water_met)}
                className={`p-5 rounded-3xl border text-left transition-all relative overflow-hidden ${
                  log.water_met
                    ? "bg-gradient-to-b from-blue-950/20 to-cyan-950/20 border-blue-500 shadow-[0_0_20px_rgba(0,82,255,0.15)]"
                    : "bg-[#0a0a0c] border-slate-900 hover:border-slate-800"
                }`}
              >
                <span className={`absolute top-4 right-4 w-2 h-2 rounded-full ${
                  log.water_met ? "bg-cyan-400 animate-ping" : "bg-slate-800"
                }`}></span>
                <div className="text-[10px] font-black tracking-widest text-slate-500 uppercase">HABIT 03</div>
                <div className="text-sm font-black italic tracking-tight text-white mt-1 uppercase">HYDRATION</div>
                <div className={`text-[10px] font-bold mt-4 ${
                  log.water_met ? "text-cyan-400" : "text-slate-600"
                }`}>
                  {log.water_met ? "STREAK ACTIVE [ON]" : "PENDING LOG [OFF]"}
                </div>
              </button>

              {/* Habit: Diet */}
              <button
                onClick={() => handleToggleHabit("diet_met", log.diet_met)}
                className={`p-5 rounded-3xl border text-left transition-all relative overflow-hidden ${
                  log.diet_met
                    ? "bg-gradient-to-b from-blue-950/20 to-cyan-950/20 border-blue-500 shadow-[0_0_20px_rgba(0,82,255,0.15)]"
                    : "bg-[#0a0a0c] border-slate-900 hover:border-slate-800"
                }`}
              >
                <span className={`absolute top-4 right-4 w-2 h-2 rounded-full ${
                  log.diet_met ? "bg-cyan-400 animate-ping" : "bg-slate-800"
                }`}></span>
                <div className="text-[10px] font-black tracking-widest text-slate-500 uppercase">HABIT 04</div>
                <div className="text-sm font-black italic tracking-tight text-white mt-1 uppercase">DIET PLAN</div>
                <div className={`text-[10px] font-bold mt-4 ${
                  log.diet_met ? "text-cyan-400" : "text-slate-600"
                }`}>
                  {log.diet_met ? "STREAK ACTIVE [ON]" : "PENDING LOG [OFF]"}
                </div>
              </button>

            </div>
          </section>

          {/* 3. NUTRIENTS BALANCE CENTER */}
          <section className="bg-[#0a0a0c] border border-slate-900 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-xl font-black italic tracking-tighter uppercase mb-6">
              DIET BALANCES <span className="text-cyan-400">// MACRO TRACKER</span>
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
                      className="stroke-[#121216] fill-transparent"
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
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-4xl font-black tracking-tighter text-white">{remainingCalories}</span>
                    <div className="text-[9px] font-black tracking-widest text-slate-500 uppercase mt-1">KCAL REMAINING</div>
                  </div>
                </div>
                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-4">
                  CONSUMED: {consumed.calories} / {targetCalories} KCAL
                </div>
              </div>

              {/* RULER TICK-MARK PROGRESS METERS */}
              <div className="md:col-span-7 space-y-6">
                
                {/* Protein Tick Progress */}
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-black tracking-wider text-slate-300">PROTEIN METRICS</span>
                    <span className="text-xs font-bold text-slate-400">
                      {consumed.protein}G / <span className="text-slate-500">{targetProtein}G</span>
                    </span>
                  </div>
                  
                  {/* Tick Marks Array simulation */}
                  <div className="flex gap-0.5 h-3 items-end">
                    {Array.from({ length: 20 }).map((_, idx) => {
                      const active = idx < Math.round(proteinPercent / 5);
                      return (
                        <div
                          key={idx}
                          className={`w-1 rounded-full transition-all duration-300 ${
                            active 
                              ? "h-full bg-gradient-to-t from-blue-600 to-cyan-400" 
                              : "h-2 bg-slate-900"
                          }`}
                        ></div>
                      );
                    })}
                  </div>
                </div>

                {/* Carbohydrates Tick Progress */}
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-black tracking-wider text-slate-300">CARBOHYDRATES</span>
                    <span className="text-xs font-bold text-slate-400">
                      {consumed.carbs}G / <span className="text-slate-500">{targetCarbs}G</span>
                    </span>
                  </div>
                  
                  {/* Tick Marks Array simulation */}
                  <div className="flex gap-0.5 h-3 items-end">
                    {Array.from({ length: 20 }).map((_, idx) => {
                      const active = idx < Math.round(carbsPercent / 5);
                      return (
                        <div
                          key={idx}
                          className={`w-1 rounded-full transition-all duration-300 ${
                            active 
                              ? "h-full bg-gradient-to-t from-blue-600 to-cyan-400" 
                              : "h-2 bg-slate-900"
                          }`}
                        ></div>
                      );
                    })}
                  </div>
                </div>

                {/* Fats Tick Progress */}
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-black tracking-wider text-slate-300">DIETARY FATS</span>
                    <span className="text-xs font-bold text-slate-400">
                      {consumed.fat}G / <span className="text-slate-500">{targetFat}G</span>
                    </span>
                  </div>
                  
                  {/* Tick Marks Array simulation */}
                  <div className="flex gap-0.5 h-3 items-end">
                    {Array.from({ length: 20 }).map((_, idx) => {
                      const active = idx < Math.round(fatPercent / 5);
                      return (
                        <div
                          key={idx}
                          className={`w-1 rounded-full transition-all duration-300 ${
                            active 
                              ? "h-full bg-gradient-to-t from-blue-600 to-cyan-400" 
                              : "h-2 bg-slate-900"
                          }`}
                        ></div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>
          </section>

          {/* 4. DIET MEAL LOGS */}
          <section className="bg-[#0a0a0c] border border-slate-900 rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black italic tracking-tighter uppercase">
                DIET LOGS <span className="text-cyan-400">// TODAY'S FUEL</span>
              </h2>
              <button
                onClick={() => setShowMealModal(true)}
                className="px-5 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-black text-[10px] font-black tracking-widest uppercase rounded-xl transition hover:opacity-95 transform active:scale-95 shadow-[0_2px_15px_rgba(0,240,255,0.2)]"
              >
                + LOG NEW MEAL
              </button>
            </div>

            {log.meals && log.meals.length > 0 ? (
              <div className="divide-y divide-slate-900">
                {log.meals.map((meal) => (
                  <div key={meal.id} className="py-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-white uppercase tracking-tight">{meal.name}</h4>
                      <div className="flex gap-4 text-[10px] text-slate-500 font-bold uppercase mt-1">
                        <span>P: {meal.protein_g}G</span>
                        <span>C: {meal.carbs_g}G</span>
                        <span>F: {meal.fat_g}G</span>
                        <span className="text-cyan-500">{meal.logged_at}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black tracking-tight text-white">{meal.calories}</span>
                      <span className="text-[10px] font-bold text-slate-500 block">KCAL</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 border border-dashed border-slate-900 rounded-2xl bg-black">
                <p className="text-xs text-slate-600 font-black uppercase tracking-wider">
                  NO FOOD INTAKE REGISTERED TODAY. LOG A MEAL TO START STATS.
                </p>
              </div>
            )}
          </section>

        </div>

        {/* RIGHT COLUMN: WATER, STEPS, AND AI TRACKER LOGS (4 COLS) */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* 1. HYDRATION STATION */}
          <section className="bg-[#0a0a0c] border border-slate-900 rounded-3xl p-6 shadow-2xl text-center">
            <h3 className="text-xs font-black tracking-[0.2em] text-slate-500 uppercase mb-4 text-left">
              HYDRATION STATION
            </h3>
            
            <div className="text-6xl font-black tracking-tighter text-white leading-none">
              {log.water_intake_ml} <span className="text-sm font-bold text-slate-500">ML</span>
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase mt-1">
              HYDRATION TARGET: {targetWater}ML
            </div>

            {/* Hydration Tickers */}
            <div className="flex gap-0.5 h-3 items-end mt-6">
              {Array.from({ length: 20 }).map((_, idx) => {
                const active = idx < Math.round(waterPercent / 5);
                return (
                  <div
                    key={idx}
                    className={`flex-1 rounded-full transition-all duration-300 ${
                      active ? "h-full bg-blue-500" : "h-1.5 bg-slate-900"
                    }`}
                  ></div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={() => handleWaterIncrement(250)}
                className="py-3 bg-black border border-slate-800 hover:border-blue-500 rounded-xl font-black text-[11px] tracking-widest text-slate-300 transition"
              >
                +250ML
              </button>
              <button
                onClick={() => handleWaterIncrement(500)}
                className="py-3 bg-black border border-slate-800 hover:border-blue-500 rounded-xl font-black text-[11px] tracking-widest text-slate-300 transition"
              >
                +500ML
              </button>
            </div>
          </section>

          {/* 2. STEPS TRACKER */}
          <section className="bg-[#0a0a0c] border border-slate-900 rounded-3xl p-6 shadow-2xl text-center">
            <h3 className="text-xs font-black tracking-[0.2em] text-slate-500 uppercase mb-4 text-left">
              STEPS REGISTER
            </h3>
            
            <div className="text-6xl font-black tracking-tighter text-white leading-none">
              {log.steps} <span className="text-sm font-bold text-slate-500">STEPS</span>
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase mt-1">
              HABIT TARGET: {targetSteps} STEPS
            </div>

            {/* Steps Tickers */}
            <div className="flex gap-0.5 h-3 items-end mt-6">
              {Array.from({ length: 20 }).map((_, idx) => {
                const active = idx < Math.round(stepsPercent / 5);
                return (
                  <div
                    key={idx}
                    className={`flex-1 rounded-full transition-all duration-300 ${
                      active ? "h-full bg-cyan-400" : "h-1.5 bg-slate-900"
                    }`}
                  ></div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={() => handleStepsUpdate(1000)}
                className="py-3 bg-black border border-slate-800 hover:border-cyan-400 rounded-xl font-black text-[11px] tracking-widest text-slate-300 transition"
              >
                +1,000
              </button>
              <button
                onClick={() => handleStepsUpdate(-1000)}
                className="py-3 bg-black border border-slate-800 hover:border-cyan-400 rounded-xl font-black text-[11px] tracking-widest text-slate-300 transition"
              >
                -1,000
              </button>
            </div>
          </section>

          {/* 3. AI STRATEGIST CONSOLE */}
          <section className="bg-[#0a0a0c] border border-slate-900 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-cyan-400"></div>
            
            <h3 className="text-xs font-black tracking-[0.2em] text-cyan-400 uppercase mb-4">
              AI DIET STRATEGIST
            </h3>

            <form onSubmit={handleAiInquiry} className="space-y-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase">
                ENTER YOUR INGREDIENTS OR ASK A FITNESS QUESTION TO COMPUTE DIETARY PROTOCOLS:
              </p>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows="3"
                className="w-full p-4 bg-black border border-slate-800 rounded-2xl text-xs text-slate-300 focus:outline-none focus:border-cyan-400 placeholder-slate-700"
                placeholder="E.G., 'I HAVE CHICKEN BREAST AND BROWN RICE, WHAT CAN I MAKE?'..."
              />
              <button
                type="submit"
                disabled={aiLoading}
                className="w-full py-3 bg-white text-black font-black text-[10px] tracking-widest uppercase rounded-2xl transition hover:bg-slate-200"
              >
                {aiLoading ? "COMPUTING TARGETS..." : "EXECUTE AI QUERY →"}
              </button>
            </form>

            {aiResponse && (
              <div className="mt-6 p-4 bg-black border border-slate-800 rounded-2xl space-y-4 animate-fade-in relative">
                <div>
                  <span className="text-[8px] font-black tracking-widest text-cyan-400 uppercase bg-cyan-950/40 border border-cyan-800/40 px-2 py-1 rounded-md">
                    RECOMMENDED MEAL
                  </span>
                  <h4 className="font-black text-sm uppercase text-white mt-2.5">{aiResponse.name}</h4>
                  <div className="flex gap-4 text-[10px] text-slate-500 font-bold uppercase mt-1">
                    <span>P: {aiResponse.protein}G</span>
                    <span>C: {aiResponse.carbs}G</span>
                    <span>F: {aiResponse.fat}G</span>
                    <span className="text-white font-black">{aiResponse.calories} KCAL</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-900 pt-3">
                  {aiResponse.instructions}
                </div>

                <button
                  onClick={handleAddAiMealToLog}
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-black font-black text-[10px] tracking-widest uppercase rounded-xl transition shadow-[0_2px_15px_rgba(0,240,255,0.2)]"
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-[#0a0a0c] border border-slate-900 rounded-3xl p-8 relative shadow-2xl">
            <h3 className="text-2xl font-black italic tracking-tighter text-white uppercase mb-6">
              LOG TODAY'S <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">MEAL</span>
            </h3>

            <form onSubmit={handleLogMeal} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black tracking-widest text-slate-500 uppercase mb-1">MEAL DESCRIPTION</label>
                <input
                  type="text"
                  required
                  value={mealName}
                  onChange={(e) => setMealName(e.target.value)}
                  className="w-full px-4 py-3 bg-black border border-slate-800 rounded-xl text-xs text-white placeholder-slate-700 focus:outline-none focus:border-cyan-400"
                  placeholder="E.G., SIRLOIN STEAK WITH ASPARAGUS"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black tracking-widest text-slate-500 uppercase mb-1">CALORIES (KCAL)</label>
                  <input
                    type="number"
                    required
                    value={mealCalories}
                    onChange={(e) => setMealCalories(e.target.value)}
                    className="w-full px-4 py-3 bg-black border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
                    placeholder="450"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black tracking-widest text-slate-500 uppercase mb-1">PROTEIN (G)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={mealProtein}
                    onChange={(e) => setMealProtein(e.target.value)}
                    className="w-full px-4 py-3 bg-black border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
                    placeholder="35"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black tracking-widest text-slate-500 uppercase mb-1">CARBOHYDRATES (G)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={mealCarbs}
                    onChange={(e) => setMealCarbs(e.target.value)}
                    className="w-full px-4 py-3 bg-black border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
                    placeholder="20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black tracking-widest text-slate-500 uppercase mb-1">FAT INTAKE (G)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={mealFat}
                    onChange={(e) => setMealFat(e.target.value)}
                    className="w-full px-4 py-3 bg-[#000] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
                    placeholder="12"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowMealModal(false)}
                  className="flex-1 py-3.5 bg-black border border-slate-800 hover:border-slate-700 text-slate-400 font-bold text-xs uppercase rounded-xl tracking-wider"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-black font-black text-xs uppercase rounded-xl tracking-widest shadow-[0_2px_15px_rgba(0,240,255,0.2)]"
                >
                  COMMIT LOG
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}