import React, { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import AchievementsModal from "./AchievementsModal";
import CustomSplitEditor from "./CustomSplitEditor";

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
  
  // Split selection & Exercises list (Module 2)
  const [selectedSplit, setSelectedSplit] = useState("PUSH DAY");
  const [splitExercises, setSplitExercises] = useState([]);
  const [exercisesLoading, setExercisesLoading] = useState(false);
  const [progressionTargets, setProgressionTargets] = useState({});
  const [customSplits, setCustomSplits] = useState({});
  const [showSplitEditor, setShowSplitEditor] = useState(false);

  // Gamification & Badges (Module 3)
  const [badges, setBadges] = useState([]);
  const [showAchievements, setShowAchievements] = useState(false);
  const [newlyUnlockedBadge, setNewlyUnlockedBadge] = useState(null);

  // Saved Meals & Natural Language Food Logging (Module 1)
  const [savedMeals, setSavedMeals] = useState([]);
  const [nlFoodInput, setNlFoodInput] = useState("");
  const [nlParsedResult, setNlParsedResult] = useState(null);
  const [nlLoading, setNlLoading] = useState(false);

  // Meal modal & form state
  const [showMealModal, setShowMealModal] = useState(false);
  const [mealName, setMealName] = useState("");
  const [mealCalories, setMealCalories] = useState("");
  const [mealProtein, setMealProtein] = useState("");
  const [mealCarbs, setMealCarbs] = useState("");
  const [mealFat, setMealFat] = useState("");
  const [mealSubmitting, setMealSubmitting] = useState(false);

  // AI Tab State & Pantry Full-Day Planner (Module 4)
  const [activeAiTab, setActiveAiTab] = useState("STRATEGIST"); // 'STRATEGIST' | 'PANTRY'
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Pantry Planner State
  const [pantryIngredients, setPantryIngredients] = useState(["Chicken Breast", "Eggs", "Jasmine Rice", "Oats", "Spinach"]);
  const [newIngredientTag, setNewIngredientTag] = useState("");
  const [mealCount, setMealCount] = useState(3);
  const [pantryPlan, setPantryPlan] = useState(null);
  const [pantryLoading, setPantryLoading] = useState(false);

  // --- DATA LOADING & SYNCING ---
  const loadDashboardData = useCallback(async (targetDate) => {
    setLoading(true);
    setError("");
    try {
      // 1. Fetch user targets and physical profile variables
      const profileData = await api.getProfile();
      setProfile(profileData);

      // 2. Fetch daily logs
      const logData = await api.getDailyLog(targetDate);
      setLog(logData);
      
      if (logData.workout_split) {
        setSelectedSplit(logData.workout_split);
      }

      // 3. Load Saved Meals & Badges & Custom Splits
      const [savedMealsData, badgesData, customSplitsData] = await Promise.allSettled([
        api.getSavedMeals(),
        api.getBadges(),
        api.getCustomSplits(),
      ]);

      if (savedMealsData.status === "fulfilled") setSavedMeals(savedMealsData.value || []);
      if (badgesData.status === "fulfilled") setBadges(badgesData.value || []);
      if (customSplitsData.status === "fulfilled") setCustomSplits(customSplitsData.value || {});

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

  // Load exercises and progressive overload targets when selectedSplit changes
  useEffect(() => {
    const loadExercisesAndProgression = async () => {
      setExercisesLoading(true);
      try {
        const exercises = await api.getWorkoutsBySplit(selectedSplit);
        setSplitExercises(exercises || []);

        // Query Vector RAG for progressive overload targets for each exercise
        if (exercises && exercises.length > 0) {
          const targets = {};
          await Promise.all(
            exercises.map(async (ex) => {
              try {
                const targetInfo = await api.getProgressionTarget(ex.name);
                targets[ex.name] = targetInfo;
              } catch (e) {
                targets[ex.name] = {
                  progression_target_text: "🎯 AI Goal: Progressive Overload",
                  target_weight: ex.weight,
                  target_reps: ex.reps
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
    };

    loadExercisesAndProgression();
  }, [selectedSplit]);

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

  const checkBadgeUnlocks = (response) => {
    if (response && response.newly_unlocked_badges && response.newly_unlocked_badges.length > 0) {
      const newBadge = response.newly_unlocked_badges[0];
      setNewlyUnlockedBadge(newBadge);
      setShowAchievements(true);
      api.getBadges().then((b) => setBadges(b || [])).catch(() => {});
    }
  };

  // --- HABIT MUTATIONS ---
  const handleToggleHabit = async (field, currentValue) => {
    const newValue = !currentValue;
    try {
      setLog((prev) => ({ ...prev, [field]: newValue }));
      
      const res = await api.updateTrackers({
        date: date,
        [field]: newValue,
      });
      checkBadgeUnlocks(res);
    } catch (err) {
      console.error("Failed to toggle metric:", err);
      setLog((prev) => ({ ...prev, [field]: currentValue }));
    }
  };

  // Hydration & Steps adjustments
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

      const res = await api.updateTrackers({
        date: date,
        water_intake_ml: newWater,
        water_met: isMet,
      });
      checkBadgeUnlocks(res);
    } catch (err) {
      console.error("Water tracker failed to save:", err);
      loadDashboardData(date);
    }
  };

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

      const res = await api.updateTrackers({
        date: date,
        steps: newSteps,
        steps_met: isMet,
      });
      checkBadgeUnlocks(res);
    } catch (err) {
      console.error("Steps tracker failed to save:", err);
      loadDashboardData(date);
    }
  };

  // --- MEAL LOGGING & SAVED MEALS (MODULE 1) ---
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
      const res = await api.logMeal(mealData);
      checkBadgeUnlocks(res);
      
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

  // 1-Click Quick Log of Saved Meal
  const handleQuickLogSavedMeal = async (savedMeal) => {
    const loggedAtTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const mealPayload = {
      date: date,
      name: savedMeal.name,
      calories: savedMeal.calories,
      protein_g: savedMeal.protein_g,
      carbs_g: savedMeal.carbs_g,
      fat_g: savedMeal.fat_g,
      logged_at: loggedAtTime,
    };

    try {
      const res = await api.logMeal(mealPayload);
      checkBadgeUnlocks(res);
      await loadDashboardData(date);
    } catch (err) {
      console.error("Failed to log saved meal:", err);
    }
  };

  const handleDeleteSavedMeal = async (mealId) => {
    try {
      await api.deleteSavedMeal(mealId);
      setSavedMeals((prev) => prev.filter((m) => m.id !== mealId));
    } catch (err) {
      console.error("Failed to delete saved meal:", err);
    }
  };

  // Natural Language Food Parsing
  const handleParseNlFood = async (e) => {
    e.preventDefault();
    if (!nlFoodInput.trim()) return;

    setNlLoading(true);
    setNlParsedResult(null);

    try {
      const res = await api.parseFood(nlFoodInput);
      setNlParsedResult(res);
    } catch (err) {
      console.error("NL Food parse error:", err);
      setError("AI FOOD PARSER COULD NOT INTERPRET INPUT.");
    } finally {
      setNlLoading(false);
    }
  };

  const handleCommitParsedMealToDaily = async () => {
    if (!nlParsedResult) return;
    const loggedAtTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const mealPayload = {
      date: date,
      name: `AI PARSED: ${nlParsedResult.inferred_name}`,
      calories: nlParsedResult.macros.calories,
      protein_g: nlParsedResult.macros.protein_g,
      carbs_g: nlParsedResult.macros.carbs_g,
      fat_g: nlParsedResult.macros.fat_g,
      logged_at: loggedAtTime,
    };

    try {
      const res = await api.logMeal(mealPayload);
      checkBadgeUnlocks(res);
      setNlParsedResult(null);
      setNlFoodInput("");
      await loadDashboardData(date);
    } catch (err) {
      console.error("Failed to log parsed meal:", err);
    }
  };

  const handleSaveParsedToCustom = async () => {
    if (!nlParsedResult) return;
    const customName = prompt("ENTER A NAME FOR THIS SAVED MEAL TEMPLATE:", nlParsedResult.inferred_name);
    if (!customName) return;

    try {
      const res = await api.saveMeal({
        name: customName,
        calories: nlParsedResult.macros.calories,
        protein_g: nlParsedResult.macros.protein_g,
        carbs_g: nlParsedResult.macros.carbs_g,
        fat_g: nlParsedResult.macros.fat_g,
      });
      if (res && res.meal) {
        setSavedMeals((prev) => [res.meal, ...prev]);
      }
      alert("MEAL TEMPLATE SAVED TO SAVED MEALS!");
    } catch (err) {
      console.error("Failed to save meal template:", err);
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

  const targetCalories = profile?.target_calories || 2000;
  const targetProtein = profile?.target_protein_g || 150;
  const targetCarbs = profile?.target_carbs_g || 200;
  const targetFat = profile?.target_fat_g || 65;
  const targetWater = profile?.target_water_ml || 3000;
  const targetSteps = profile?.target_steps || 10000;

  const remainingCalories = Math.max(0, targetCalories - consumed.calories);
  const remainingProtein = Math.max(0, targetProtein - consumed.protein);
  const remainingCarbs = Math.max(0, targetCarbs - consumed.carbs);
  const remainingFat = Math.max(0, targetFat - consumed.fat);

  const caloriePercent = Math.min(100, (consumed.calories / targetCalories) * 100);
  const proteinPercent = Math.min(100, (consumed.protein / targetProtein) * 100);
  const carbsPercent = Math.min(100, (consumed.carbs / targetCarbs) * 100);
  const fatPercent = Math.min(100, (consumed.fat / targetFat) * 100);
  const waterPercent = Math.min(100, ((log.water_intake_ml || 0) / targetWater) * 100);
  const stepsPercent = Math.min(100, ((log.steps || 0) / targetSteps) * 100);

  // Legacy AI Diet Recommendation inquiry
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
      const res = await api.logMeal(mealPayload);
      checkBadgeUnlocks(res);
      setAiResponse(null);
      setAiPrompt("");
      await loadDashboardData(date);
    } catch (err) {
      console.error("Failed to append AI meal:", err);
    }
  };

  // --- PANTRY AI FULL-DAY MEAL PLANNER (MODULE 4) ---
  const handleAddIngredientTag = () => {
    if (!newIngredientTag.trim()) return;
    const tag = newIngredientTag.trim();
    if (!pantryIngredients.includes(tag)) {
      setPantryIngredients([...pantryIngredients, tag]);
    }
    setNewIngredientTag("");
  };

  const handleRemoveIngredientTag = (tagToRemove) => {
    setPantryIngredients(pantryIngredients.filter((t) => t !== tagToRemove));
  };

  const handleGeneratePantryPlan = async () => {
    setPantryLoading(true);
    setPantryPlan(null);

    try {
      const plan = await api.planPantryMeals({
        ingredients: pantryIngredients,
        target_calories: remainingCalories > 300 ? remainingCalories : targetCalories,
        target_protein: remainingProtein > 20 ? remainingProtein : targetProtein,
        target_carbs: remainingCarbs > 20 ? remainingCarbs : targetCarbs,
        target_fat: remainingFat > 10 ? remainingFat : targetFat,
        meal_count: mealCount,
        body_type: profile?.body_type || "Mesomorph",
        fitness_goals: profile?.fitness_goals || "Hypertrophy",
      });
      setPantryPlan(plan);
    } catch (err) {
      console.error("Pantry plan error:", err);
      setError("PANTRY AI PROTOCOL FAILED TO COMPILE.");
    } finally {
      setPantryLoading(false);
    }
  };

  const handleLogAllPantryMeals = async () => {
    if (!pantryPlan || !pantryPlan.meals) return;
    const loggedAtTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
      for (const m of pantryPlan.meals) {
        await api.logMeal({
          date: date,
          name: `PANTRY REC: ${m.name}`,
          calories: m.calories,
          protein_g: m.protein_g,
          carbs_g: m.carbs_g,
          fat_g: m.fat_g,
          logged_at: loggedAtTime,
        });
      }
      setPantryPlan(null);
      await loadDashboardData(date);
    } catch (err) {
      console.error("Failed to batch log pantry meals:", err);
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
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className="w-14 h-14 border-4 border-slate-800 border-t-cyan-400 rounded-full animate-spin mb-4 shadow-[0_0_20px_rgba(0,240,255,0.3)]"></div>
        <div className="text-cyan-400 font-black tracking-[0.25em] text-xs uppercase animate-pulse">
          SYNCHRONIZING ATHLETIC COMBAT MATRIX...
        </div>
      </div>
    );
  }

  const unlockedBadgesCount = badges.filter((b) => b.unlocked).length;

  return (
    <div className="min-h-screen w-full bg-black text-white relative overflow-x-hidden font-sans pb-24 select-none">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-0 right-0 w-[650px] h-[650px] bg-blue-600/5 blur-[170px] rounded-full pointer-events-none z-0"></div>
      <div className="absolute bottom-20 left-0 w-[650px] h-[650px] bg-cyan-400/5 blur-[170px] rounded-full pointer-events-none z-0"></div>

      {/* HEADER SECTION */}
      <header className="border-b border-[#14141c] bg-black/85 backdrop-blur-xl sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#0052FF] to-[#00F0FF] flex items-center justify-center font-black text-black text-xl italic tracking-tighter shadow-[0_0_20px_rgba(0,240,255,0.3)]">
              AT
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black tracking-[0.25em] text-cyan-400 uppercase">
                  AURATRAINER // PHASE 2 MVP
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
              </div>
              <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none mt-1">
                WELCOME, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0052FF] via-cyan-400 to-[#00F0FF]">{profile?.name || "ATHLETE"}</span>
              </h1>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-3 self-start sm:self-auto">
            {/* Gamification Achievements Button */}
            <button
              onClick={() => setShowAchievements(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#0a0a0c] border border-[#1a1a24] hover:border-cyan-400 rounded-2xl text-xs font-black uppercase tracking-wider text-cyan-300 transition shadow-[0_0_15px_rgba(0,240,255,0.15)] cursor-pointer"
            >
              <span>🏆</span>
              <span className="hidden sm:inline">ACHIEVEMENTS</span>
              <span className="px-1.5 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-[9px] text-cyan-400">
                {unlockedBadgesCount}/{badges.length || 5}
              </span>
            </button>

            {/* Date Selector Navigation */}
            <div className="flex items-center bg-[#0a0a0c] border border-[#1a1a24] rounded-2xl px-3 py-1.5 shadow-inner">
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
          
          {/* 1. DAILY FOCUS SPLIT SELECTOR & PROGRESSIVE OVERLOAD (MODULE 2) */}
          <section className="bg-[#0a0a0c] border border-[#1a1a24] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#0052FF] via-cyan-400 to-[#00F0FF]"></div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
              <div>
                <span className="text-[9px] font-black tracking-[0.25em] text-cyan-400 uppercase">
                  TRAINING PROTOCOL // VECTOR RAG
                </span>
                <h2 className="text-xl font-black italic tracking-tighter uppercase mt-0.5">
                  TODAY'S WORKOUT SPLIT
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSplitEditor(true)}
                  className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-cyan-400 rounded-xl text-[10px] font-black tracking-widest text-cyan-400 uppercase transition cursor-pointer"
                >
                  ⚡ CUSTOM SPLIT ARCHITECT
                </button>
              </div>
            </div>
            
            {/* Split Switcher Buttons */}
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

            {/* SPLIT EXERCISE CHECKLIST WITH VECTOR PROGRESSIVE OVERLOAD (MODULE 2) */}
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
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isDone
                            ? "bg-cyan-950/20 border-cyan-500/50 shadow-[0_0_12px_rgba(0,240,255,0.1)]"
                            : "bg-black border-slate-900 hover:border-slate-800"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-lg flex items-center justify-center font-black text-[10px] border transition-all flex-shrink-0 ${
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
                              <div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                                {ex.sets} SETS × {ex.reps} REPS • <span className="text-slate-300">{ex.weight}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Glowing Vector Progressive Overload Target Sub-label */}
                        {target && (
                          <div className="mt-2.5 pt-2 border-t border-[#14141c] flex items-center justify-between">
                            <span className="text-[9px] font-black tracking-wider text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded-md">
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
                <div className="text-center py-6 border border-dashed border-slate-900 rounded-2xl bg-black">
                  <p className="text-xs text-slate-600 font-black uppercase tracking-wider">
                    REST & RECOVERY PROTOCOL ACTIVE. REHYDRATE AND REBUILD MUSCLE TISSUE.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* 2. STREAK CHECKLIST PROTOCOL (MODULE 3) */}
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
              
              {/* Habit 01: Workout */}
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

              {/* Habit 02: Steps */}
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

              {/* Habit 03: Hydration */}
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

              {/* Habit 04: Diet */}
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

          {/* 4. AI NATURAL LANGUAGE FOOD PARSER & MEAL LOGS (MODULE 1) */}
          <section className="bg-[#0a0a0c] border border-[#1a1a24] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            
            {/* Header with Log button */}
            <div className="flex items-center justify-between">
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
                className="px-5 py-2.5 bg-gradient-to-r from-[#0052FF] to-[#00F0FF] text-black text-[10px] font-black tracking-[0.2em] uppercase rounded-xl transition hover:opacity-95 transform active:scale-95 shadow-[0_0_15px_rgba(0,240,255,0.3)] cursor-pointer"
              >
                + MANUAL LOG
              </button>
            </div>

            {/* AI NATURAL LANGUAGE FOOD PARSER (MODULE 1) */}
            <div className="bg-black border border-slate-900 rounded-2xl p-5 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[9px] font-black tracking-[0.25em] text-cyan-400 uppercase bg-cyan-950/40 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
                  AI NATURAL LANGUAGE PARSER
                </span>
                <span className="text-[9px] font-bold text-slate-500 uppercase">
                  TYPE INGREDIENTS FREELY
                </span>
              </div>

              <form onSubmit={handleParseNlFood} className="space-y-3">
                <textarea
                  value={nlFoodInput}
                  onChange={(e) => setNlFoodInput(e.target.value)}
                  rows="2"
                  className="w-full p-3.5 bg-[#08080c] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-medium"
                  placeholder="E.G. '150G CHICKEN BREAST, 100G RICE, AND 1 TBSP OLIVE OIL'..."
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={nlLoading || !nlFoodInput.trim()}
                    className="px-5 py-2.5 bg-white text-black font-black text-[10px] tracking-[0.2em] uppercase rounded-xl transition hover:bg-slate-200 cursor-pointer disabled:opacity-50"
                  >
                    {nlLoading ? "CALCULATING MACROS..." : "PARSE FOOD INTAKE ⚡"}
                  </button>
                </div>
              </form>

              {/* Parsed Result Preview Card */}
              {nlParsedResult && (
                <div className="mt-4 p-4 bg-[#0c0c12] border border-cyan-500/40 rounded-xl space-y-3 animate-fade-in">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[8px] font-black tracking-widest text-cyan-400 uppercase">
                        PARSED INGREDIENT PROFILE
                      </span>
                      <h4 className="text-sm font-black text-white uppercase italic mt-0.5">
                        {nlParsedResult.inferred_name}
                      </h4>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-black text-white">{nlParsedResult.macros.calories}</span>
                      <span className="text-[8px] font-bold text-slate-500 block">KCAL</span>
                    </div>
                  </div>

                  <div className="flex gap-4 text-xs font-bold uppercase text-slate-300">
                    <span>PROTEIN: <span className="text-cyan-400 font-black">{nlParsedResult.macros.protein_g}G</span></span>
                    <span>CARBS: <span className="text-blue-400 font-black">{nlParsedResult.macros.carbs_g}G</span></span>
                    <span>FAT: <span className="text-indigo-400 font-black">{nlParsedResult.macros.fat_g}G</span></span>
                  </div>

                  <div className="flex gap-3 pt-2 border-t border-slate-900">
                    <button
                      onClick={handleCommitParsedMealToDaily}
                      className="flex-1 py-2.5 bg-gradient-to-r from-[#0052FF] to-[#00F0FF] text-black font-black text-[10px] tracking-widest uppercase rounded-xl transition shadow-[0_0_12px_rgba(0,240,255,0.25)] cursor-pointer"
                    >
                      LOG TO DAILY TARGETS →
                    </button>
                    <button
                      onClick={handleSaveParsedToCustom}
                      className="px-4 py-2.5 bg-slate-900 border border-slate-800 hover:border-cyan-400 text-cyan-300 font-black text-[10px] tracking-widest uppercase rounded-xl transition cursor-pointer"
                    >
                      ★ SAVE TO CUSTOM MEALS
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Meal Items List */}
            {log.meals && log.meals.length > 0 ? (
              <div className="divide-y divide-[#14141c]">
                {log.meals.map((meal, idx) => (
                  <div key={meal.id || idx} className="py-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-sm text-white uppercase tracking-tight">{meal.name}</h4>
                      <div className="flex gap-4 text-[10px] text-slate-400 font-bold uppercase mt-1">
                        <span>P: <span className="text-cyan-400 font-bold">{meal.protein_g}G</span></span>
                        <span>C: <span className="text-blue-400 font-bold">{meal.carbs_g}G</span></span>
                        <span>F: <span className="text-indigo-400 font-bold">{meal.fat_g}G</span></span>
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
              <div className="text-center py-8 border border-dashed border-slate-900 rounded-2xl bg-black">
                <p className="text-xs text-slate-600 font-black uppercase tracking-wider">
                  NO FOOD INTAKE REGISTERED TODAY. LOG A MEAL OR QUERY AI TO POPULATE STATS.
                </p>
              </div>
            )}
          </section>

        </div>

        {/* RIGHT COLUMN: SAVED MEALS, WATER, STEPS, AND AI CONSOLE (4 COLS) */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* 1. SAVED MEAL TEMPLATES PANEL (MODULE 1) */}
          <section className="bg-[#0a0a0c] border border-[#1a1a24] rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[9px] font-black tracking-[0.25em] text-cyan-400 uppercase">
                  1-CLICK TEMPLATES
                </span>
                <h3 className="text-xs font-black tracking-[0.2em] text-white uppercase mt-0.5">
                  SAVED MEALS ({savedMeals.length})
                </h3>
              </div>
            </div>

            {savedMeals.length > 0 ? (
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {savedMeals.map((sm) => (
                  <div
                    key={sm.id}
                    className="p-3 bg-black border border-slate-900 rounded-xl flex items-center justify-between hover:border-slate-800 transition"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <h5 className="text-xs font-black uppercase tracking-tight text-white truncate">{sm.name}</h5>
                      <div className="flex gap-2 text-[9px] text-slate-500 font-bold uppercase mt-0.5">
                        <span className="text-cyan-400">{sm.calories} KCAL</span>
                        <span>• P:{sm.protein_g}g</span>
                        <span>• C:{sm.carbs_g}g</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleQuickLogSavedMeal(sm)}
                        className="px-2.5 py-1 bg-cyan-950/60 border border-cyan-500/40 hover:bg-cyan-900 text-cyan-300 rounded-lg text-xs font-black transition cursor-pointer"
                        title="Log this meal to today"
                      >
                        + LOG
                      </button>
                      <button
                        onClick={() => handleDeleteSavedMeal(sm.id)}
                        className="w-6 h-6 text-slate-600 hover:text-red-400 text-xs flex items-center justify-center transition cursor-pointer"
                        title="Remove saved meal"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-slate-900 rounded-2xl bg-black">
                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                  NO SAVED MEALS YET. PARSE OR LOG A MEAL AND CLICK "SAVE TO CUSTOM MEALS".
                </p>
              </div>
            )}
          </section>

          {/* 2. HYDRATION STATION */}
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

          {/* 3. STEPS TRACKER */}
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

          {/* 4. AI TACTICAL CONSOLE: STRATEGIST & PANTRY COACHING (MODULE 4) */}
          <section className="bg-[#0a0a0c] border border-[#1a1a24] rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#0052FF] via-cyan-400 to-[#00F0FF]"></div>
            
            {/* AI Tab Selector */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setActiveAiTab("STRATEGIST")}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer border ${
                  activeAiTab === "STRATEGIST"
                    ? "bg-cyan-950/60 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.2)]"
                    : "bg-black border-slate-900 text-slate-500 hover:text-slate-300"
                }`}
              >
                AI STRATEGIST
              </button>
              <button
                onClick={() => setActiveAiTab("PANTRY")}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer border ${
                  activeAiTab === "PANTRY"
                    ? "bg-cyan-950/60 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.2)]"
                    : "bg-black border-slate-900 text-slate-500 hover:text-slate-300"
                }`}
              >
                PANTRY COACHING 🍳
              </button>
            </div>

            {/* TAB 1: AI STRATEGIST */}
            {activeAiTab === "STRATEGIST" && (
              <div className="space-y-4">
                <form onSubmit={handleAiInquiry} className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed">
                    SYNTHESIZE MEAL PROTOCOLS TARGETED TO YOUR REMAINING {remainingProtein.toFixed(0)}G PROTEIN GOAL:
                  </p>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows="2"
                    className="w-full p-3.5 bg-black border border-slate-900 rounded-2xl text-xs text-slate-200 focus:outline-none focus:border-cyan-400 placeholder-slate-700 font-medium"
                    placeholder="E.G., 'QUICK POST-WORKOUT MEAL WITH HIGH PROTEIN'..."
                  />
                  <button
                    type="submit"
                    disabled={aiLoading}
                    className="w-full py-3 bg-white text-black font-black text-[10px] tracking-[0.25em] uppercase rounded-2xl transition hover:bg-slate-200 cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.15)] disabled:opacity-50"
                  >
                    {aiLoading ? "SYNTHESIZING PROTOCOL..." : "EXECUTE AI QUERY →"}
                  </button>
                </form>

                {aiResponse && (
                  <div className="mt-4 p-4 bg-black border border-cyan-500/40 rounded-2xl space-y-3 shadow-[0_0_20px_rgba(0,240,255,0.1)] relative">
                    <div>
                      <span className="text-[8px] font-black tracking-[0.2em] text-cyan-400 uppercase bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded">
                        SYNTHESIZED RECIPE
                      </span>
                      <h4 className="font-black text-sm uppercase text-white mt-1.5">{aiResponse.name}</h4>
                      <div className="flex gap-3 text-[10px] text-slate-400 font-bold uppercase mt-1">
                        <span>P: <span className="text-cyan-400">{aiResponse.protein}G</span></span>
                        <span>C: <span className="text-blue-400">{aiResponse.carbs}G</span></span>
                        <span>F: <span className="text-indigo-400">{aiResponse.fat}G</span></span>
                        <span className="text-white font-black">{aiResponse.calories} KCAL</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-300 leading-relaxed border-t border-[#14141c] pt-2">
                      {aiResponse.instructions}
                    </div>

                    <button
                      type="button"
                      onClick={handleAddAiMealToLog}
                      className="w-full py-2.5 bg-gradient-to-r from-[#0052FF] to-[#00F0FF] text-black font-black text-[10px] tracking-[0.2em] uppercase rounded-xl transition shadow-[0_0_15px_rgba(0,240,255,0.3)] cursor-pointer"
                    >
                      APPEND TO DIET LOG
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PANTRY COACHING FULL-DAY PLANNER (MODULE 4) */}
            {activeAiTab === "PANTRY" && (
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed">
                  INPUT INGREDIENTS CURRENTLY IN YOUR KITCHEN TO COMPUTE FULL-DAY MACRO PROTOCOL:
                </p>

                {/* Tag Input */}
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5 min-h-12 p-2 bg-black border border-slate-900 rounded-xl">
                    {pantryIngredients.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold uppercase"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredientTag(tag)}
                          className="hover:text-red-400 ml-1 cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newIngredientTag}
                      onChange={(e) => setNewIngredientTag(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddIngredientTag(); } }}
                      className="flex-1 px-3 py-2 bg-black border border-slate-800 rounded-xl text-xs text-white placeholder-slate-700 focus:outline-none focus:border-cyan-400"
                      placeholder="ADD INGREDIENT (E.G. 'SWEET POTATOES')..."
                    />
                    <button
                      type="button"
                      onClick={handleAddIngredientTag}
                      className="px-3 py-2 bg-slate-900 border border-slate-800 hover:border-cyan-400 text-cyan-400 text-xs font-black uppercase rounded-xl cursor-pointer"
                    >
                      + ADD
                    </button>
                  </div>
                </div>

                {/* Meal Count Selector */}
                <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400 pt-1">
                  <span>MEALS TO COMPILE:</span>
                  <div className="flex gap-1.5">
                    {[2, 3, 4].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setMealCount(count)}
                        className={`w-7 h-7 rounded-lg text-xs font-black border transition cursor-pointer ${
                          mealCount === count
                            ? "bg-cyan-400 text-black border-cyan-400"
                            : "bg-black text-slate-500 border-slate-900"
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={pantryLoading || pantryIngredients.length === 0}
                  onClick={handleGeneratePantryPlan}
                  className="w-full py-3 bg-gradient-to-r from-[#0052FF] to-[#00F0FF] text-black font-black text-[10px] tracking-[0.2em] uppercase rounded-xl transition shadow-[0_0_20px_rgba(0,240,255,0.3)] cursor-pointer disabled:opacity-50"
                >
                  {pantryLoading ? "COMPUTING PANTRY PROTOCOLS..." : "CONSTRUCT FULL-DAY PROTOCOL ⚡"}
                </button>

                {/* Pantry Timeline View */}
                {pantryPlan && pantryPlan.meals && (
                  <div className="mt-4 space-y-3 animate-fade-in border-t border-[#14141c] pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black tracking-widest text-cyan-400 uppercase">
                        FULL-DAY MEAL TIMELINE
                      </span>
                      <button
                        type="button"
                        onClick={handleLogAllPantryMeals}
                        className="px-3 py-1 bg-cyan-400 text-black text-[9px] font-black tracking-widest uppercase rounded-lg shadow hover:bg-cyan-300 transition cursor-pointer"
                      >
                        + LOG ALL MEALS
                      </button>
                    </div>

                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      {pantryPlan.meals.map((mealItem, mIdx) => (
                        <div
                          key={mIdx}
                          className="p-3 bg-black border border-slate-900 rounded-xl space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black tracking-widest text-slate-500 uppercase">
                              {mealItem.meal_slot}
                            </span>
                            <span className="text-xs font-black text-cyan-300">{mealItem.calories} KCAL</span>
                          </div>
                          <h5 className="text-xs font-black text-white uppercase">{mealItem.name}</h5>
                          <div className="flex gap-2 text-[9px] font-bold text-slate-400 uppercase">
                            <span>P: {mealItem.protein_g}G</span>
                            <span>C: {mealItem.carbs_g}G</span>
                            <span>F: {mealItem.fat_g}G</span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-tight pt-1">
                            {mealItem.instructions}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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

      {/* --- CUSTOM SPLIT EDITOR MODAL (MODULE 2) --- */}
      <CustomSplitEditor
        isOpen={showSplitEditor}
        onClose={() => setShowSplitEditor(false)}
        customSplits={customSplits}
        onSaveSplits={(updated) => setCustomSplits(updated)}
        onSelectSplit={(splitKey) => setSelectedSplit(splitKey)}
      />

    </div>
  );
}