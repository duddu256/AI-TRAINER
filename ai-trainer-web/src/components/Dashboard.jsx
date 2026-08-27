import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../services/api";
import AchievementsModal from "./AchievementsModal";
import CustomSplitEditor from "./CustomSplitEditor";

export default function Dashboard({ onLogout }) {
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

  // Quick Add Exercise to Active Split
  const [showQuickAddEx, setShowQuickAddEx] = useState(false);
  const [quickExName, setQuickExName] = useState("");
  const [quickExSets, setQuickExSets] = useState(4);
  const [quickExReps, setQuickExReps] = useState("8-10");
  const [quickExWeight, setQuickExWeight] = useState("60kg");

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

  // AI Tab State & Pantry Full-Day Planner (Module 4 - Indian & Global Standards)
  const [activeAiTab, setActiveAiTab] = useState("STRATEGIST"); // 'STRATEGIST' | 'PANTRY'
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Pantry Planner State with Indian & Global kitchen inventory staples
  const [pantryIngredients, setPantryIngredients] = useState([
    "Paneer",
    "Eggs",
    "Whole Wheat Rotis",
    "Moong Dal",
    "Basmati Rice",
    "Oats",
    "Palak (Spinach)",
    "Dahi (Curd)"
  ]);
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
      const payload = { date: date, [field]: newValue };
      const res = await api.updateTrackers(payload);
      checkBadgeUnlocks(res);
    } catch (err) {
      console.error(`Failed to update ${field}:`, err);
      setLog((prev) => ({ ...prev, [field]: currentValue }));
    }
  };

  // --- TRACKER INCREMENTS ---
  const handleWaterIncrement = async (amount) => {
    const newWater = Math.max(0, (log.water_intake_ml || 0) + amount);
    const targetWater = (profile?.target_water_l || 3.5) * 1000;
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
    const targetSteps = profile?.target_steps || 10000;
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

  // --- MANUAL MEAL LOGGING ---
  const handleLogMeal = async (e) => {
    e.preventDefault();
    if (!mealName.trim() || !mealCalories) return;

    setMealSubmitting(true);
    const loggedAtTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const mealData = {
      date: date,
      name: mealName.trim().toUpperCase(),
      calories: parseInt(mealCalories),
      protein_g: parseFloat(mealProtein) || 0.0,
      carbs_g: parseFloat(mealCarbs) || 0.0,
      fat_g: parseFloat(mealFat) || 0.0,
      logged_at: loggedAtTime,
    };

    try {
      const res = await api.logMeal(mealData);
      checkBadgeUnlocks(res);
      setMealName("");
      setMealCalories("");
      setMealProtein("");
      setMealCarbs("");
      setMealFat("");
      setShowMealModal(false);
      await loadDashboardData(date);
    } catch (err) {
      console.error("Failed to log meal:", err);
      setError("FAILED TO LOG ATHLETIC MEAL FUEL.");
    } finally {
      setMealSubmitting(false);
    }
  };

  // --- NATURAL LANGUAGE AI FOOD PARSING (MODULE 1 - INDIAN & GLOBAL) ---
  const handleParseNlFood = async (e) => {
    e.preventDefault();
    if (!nlFoodInput.trim()) return;

    setNlLoading(true);
    setNlParsedResult(null);

    try {
      const result = await api.parseFood(nlFoodInput);
      setNlParsedResult(result);
    } catch (err) {
      console.error("Failed to parse food text:", err);
      setError("AI NATURAL LANGUAGE PARSER ENCOUNTERED AN ISSUE.");
    } finally {
      setNlLoading(false);
    }
  };

  const handleCommitParsedMealToDaily = async () => {
    if (!nlParsedResult) return;
    const loggedAtTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const mealPayload = {
      date: date,
      name: nlParsedResult.inferred_name.toUpperCase(),
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
    try {
      await api.saveMeal({
        name: nlParsedResult.inferred_name.toUpperCase(),
        calories: nlParsedResult.macros.calories,
        protein_g: nlParsedResult.macros.protein_g,
        carbs_g: nlParsedResult.macros.carbs_g,
        fat_g: nlParsedResult.macros.fat_g,
      });
      const updated = await api.getSavedMeals();
      setSavedMeals(updated || []);
      setNlParsedResult(null);
      setNlFoodInput("");
    } catch (err) {
      console.error("Failed to save custom meal:", err);
    }
  };

  // --- SAVED MEALS 1-CLICK ACTIONS (MODULE 1) ---
  const handleQuickLogSavedMeal = async (savedMeal) => {
    const loggedAtTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const mealPayload = {
      date: date,
      name: savedMeal.name.toUpperCase(),
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

  const handleDeleteSavedMeal = async (savedMealId) => {
    try {
      await api.deleteSavedMeal(savedMealId);
      setSavedMeals((prev) => prev.filter((m) => m.id !== savedMealId));
    } catch (err) {
      console.error("Failed to delete saved meal:", err);
    }
  };

  // --- CALCULATIONS & STATS ---
  const targetCalories = profile?.target_calories || 2500;
  const targetProtein = profile?.target_protein_g || 180;
  const targetCarbs = profile?.target_carbs_g || 250;
  const targetFat = profile?.target_fat_g || 70;
  const targetWater = (profile?.target_water_l || 3.5) * 1000;
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

  // AI Strategist Meal Synthesis inquiry
  const handleAiInquiry = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setAiLoading(true);
    setAiResponse(null);

    try {
      const suggestion = await api.getAiMealSuggestion({
        calories: remainingCalories > 0 ? remainingCalories : 500,
        protein_g: remainingProtein > 0 ? remainingProtein : 35,
        carbs_g: remainingCarbs > 0 ? remainingCarbs : 45,
        fat_g: remainingFat > 0 ? remainingFat : 12,
        fitness_goals: profile?.fitness_goals || "Hypertrophy",
        prompt: aiPrompt,
      });
      setAiResponse(suggestion);
    } catch (err) {
      console.error("AI service error:", err);
      setError("AI SERVICE COMPILATION ENCOUNTERED AN ISSUE. PLEASE TRY AGAIN.");
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
      calories: Math.round(Number(aiResponse.calories)),
      protein_g: Number(aiResponse.protein_g ?? aiResponse.protein ?? 0),
      carbs_g: Number(aiResponse.carbs_g ?? aiResponse.carbs ?? 0),
      fat_g: Number(aiResponse.fat_g ?? aiResponse.fat ?? 0),
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
      setError("FAILED TO LOG AI RECIPE MEAL.");
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
    try {
      for (const meal of pantryPlan.meals) {
        const loggedAtTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        await api.logMeal({
          date: date,
          name: `PANTRY: ${meal.name.toUpperCase()}`,
          calories: meal.calories,
          protein_g: meal.protein_g,
          carbs_g: meal.carbs_g,
          fat_g: meal.fat_g,
          logged_at: loggedAtTime,
        });
      }
      setPantryPlan(null);
      await loadDashboardData(date);
    } catch (err) {
      console.error("Failed to log pantry meals:", err);
    }
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

  // Aggregate standard splits + all user-created custom splits
  const standardSplits = [
    { id: "PUSH DAY", label: "PUSH DAY", desc: "CHEST / DELTS / TRICEPS" },
    { id: "PULL DAY", label: "PULL DAY", desc: "BACK / LATS / BICEPS" },
    { id: "LEG DAY", label: "LEG DAY", desc: "QUADS / HAMS / CALVES" },
    { id: "REST / RECOVERY", label: "REST / FUEL", desc: "ACTIVE RECOVERY" },
  ];

  const customKeys = Object.keys(customSplits || {}).filter(
    (k) => !["PUSH DAY", "PULL DAY", "LEG DAY", "REST / RECOVERY"].includes(k.toUpperCase().trim())
  );

  const allSplitOptions = [
    ...standardSplits,
    ...customKeys.map((k) => ({
      id: k,
      label: k,
      desc: `${(customSplits[k] || []).length} PROTOCOL EXERCISES`
    }))
  ];

  // --- APPLE FITNESS / HEALTH CONCENTRIC ACTIVITY RINGS METRICS ---
  const r1 = 100;
  const circ1 = 2 * Math.PI * r1;
  const offset1 = circ1 - (circ1 * Math.min(100, caloriePercent)) / 100;

  const r2 = 78;
  const circ2 = 2 * Math.PI * r2;
  const offset2 = circ2 - (circ2 * Math.min(100, proteinPercent)) / 100;

  const r3 = 56;
  const circ3 = 2 * Math.PI * r3;
  const offset3 = circ3 - (circ3 * Math.min(100, carbsPercent)) / 100;

  const r4 = 35;
  const circ4 = 2 * Math.PI * r4;
  const offset4 = circ4 - (circ4 * Math.min(100, fatPercent)) / 100;

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white relative overflow-x-hidden font-sans pb-24">
      
      {/* Background Ambient Cybernetic Glows */}
      <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-20 left-0 w-[700px] h-[700px] bg-cyan-500/10 blur-[140px] rounded-full pointer-events-none z-0" />

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

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4">
          <div className="p-3.5 sm:p-4 bg-red-950/40 border-l-4 border-red-500 text-red-200 text-xs font-bold rounded-r-xl uppercase tracking-wider backdrop-blur-md">
            {error}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 sm:mt-8 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        
        {/* LEFT COLUMN: TRAINERS, HABITS & APPLE MACRO RINGS (8 COLS) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* 1. DAILY FOCUS SPLIT SELECTOR & PROGRESSIVE OVERLOAD (MODULE 2) */}
          <section className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-cyan-500/30">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-[#00F0FF]"></div>
            
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
              </div>
            </div>

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
                className={`p-5 rounded-3xl border text-left transition-all duration-200 relative overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
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
                className={`p-5 rounded-3xl border text-left transition-all duration-200 relative overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
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
                className={`p-5 rounded-3xl border text-left transition-all duration-200 relative overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
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
                className={`p-5 rounded-3xl border text-left transition-all duration-200 relative overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
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

          {/* 3. APPLE-INSPIRED CONCENTRIC MACRO ACTIVITY TRACKER */}
          <section className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-3xl p-4 sm:p-8 shadow-2xl hover:border-cyan-500/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div>
                <span className="text-[8px] sm:text-[9px] font-black tracking-[0.25em] text-cyan-400 uppercase">
                  APPLE ACTIVITY RINGS // PRECISION METRICS
                </span>
                <h2 className="text-lg sm:text-xl font-black italic tracking-tighter uppercase mt-0.5">
                  MACRONUTRIENT BALANCE
                </h2>
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold tracking-wider text-slate-400 bg-white/5 border border-white/10 px-2.5 sm:px-3 py-1 rounded-full font-stats">
                {consumed.calories} / {targetCalories} KCAL
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center">
              
              {/* Apple Concentric 4-Ring Activity SVG */}
              <div className="md:col-span-5 flex flex-col items-center justify-center relative">
                <div className="relative w-52 h-52 sm:w-64 sm:h-64 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 240 240">
                    <defs>
                      {/* Calories / Move Gradient (Apple Red/Pink) */}
                      <linearGradient id="calGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FA114F" />
                        <stop offset="100%" stopColor="#FF5A78" />
                      </linearGradient>

                      {/* Protein / Exercise Gradient (Apple Neon Green) */}
                      <linearGradient id="protGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#30D158" />
                        <stop offset="100%" stopColor="#A1FF00" />
                      </linearGradient>

                      {/* Carbs / Stand Gradient (Apple Cyan/Blue) */}
                      <linearGradient id="carbGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#00F0FF" />
                        <stop offset="100%" stopColor="#0A84FF" />
                      </linearGradient>

                      {/* Fats / Lipids Gradient (Apple Purple/Violet) */}
                      <linearGradient id="fatGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#BF5AF2" />
                        <stop offset="100%" stopColor="#E040FB" />
                      </linearGradient>

                      {/* Glow Filters */}
                      <filter id="glowCal" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#FA114F" floodOpacity="0.5" />
                      </filter>
                      <filter id="glowProt" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#30D158" floodOpacity="0.5" />
                      </filter>
                      <filter id="glowCarb" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#00F0FF" floodOpacity="0.5" />
                      </filter>
                      <filter id="glowFat" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#BF5AF2" floodOpacity="0.5" />
                      </filter>
                    </defs>

                    {/* Ring 1 (Outer - Calories): r = 100 */}
                    <circle cx="120" cy="120" r={r1} className="fill-transparent" stroke="#25050f" strokeWidth="14" />
                    <circle
                      cx="120"
                      cy="120"
                      r={r1}
                      className="fill-transparent transition-all duration-700 ease-out"
                      stroke="url(#calGradient)"
                      strokeWidth="14"
                      strokeDasharray={circ1}
                      strokeDashoffset={offset1}
                      strokeLinecap="round"
                      filter="url(#glowCal)"
                    />

                    {/* Ring 2 (Middle - Protein): r = 78 */}
                    <circle cx="120" cy="120" r={r2} className="fill-transparent" stroke="#06200d" strokeWidth="14" />
                    <circle
                      cx="120"
                      cy="120"
                      r={r2}
                      className="fill-transparent transition-all duration-700 ease-out"
                      stroke="url(#protGradient)"
                      strokeWidth="14"
                      strokeDasharray={circ2}
                      strokeDashoffset={offset2}
                      strokeLinecap="round"
                      filter="url(#glowProt)"
                    />

                    {/* Ring 3 (Inner - Carbs): r = 56 */}
                    <circle cx="120" cy="120" r={r3} className="fill-transparent" stroke="#031d2b" strokeWidth="14" />
                    <circle
                      cx="120"
                      cy="120"
                      r={r3}
                      className="fill-transparent transition-all duration-700 ease-out"
                      stroke="url(#carbGradient)"
                      strokeWidth="14"
                      strokeDasharray={circ3}
                      strokeDashoffset={offset3}
                      strokeLinecap="round"
                      filter="url(#glowCarb)"
                    />

                    {/* Ring 4 (Core - Fat): r = 35 */}
                    <circle cx="120" cy="120" r={r4} className="fill-transparent" stroke="#1d0628" strokeWidth="12" />
                    <circle
                      cx="120"
                      cy="120"
                      r={r4}
                      className="fill-transparent transition-all duration-700 ease-out"
                      stroke="url(#fatGradient)"
                      strokeWidth="12"
                      strokeDasharray={circ4}
                      strokeDashoffset={offset4}
                      strokeLinecap="round"
                      filter="url(#glowFat)"
                    />
                  </svg>

                  {/* Center Energy Metrics */}
                  <div className="absolute text-center flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black tracking-tighter text-white font-stats leading-none">
                      {remainingCalories}
                    </span>
                    <span className="text-[8px] font-black tracking-[0.2em] text-slate-400 uppercase mt-0.5">
                      KCAL LEFT
                    </span>
                  </div>
                </div>
              </div>

              {/* Apple Health Metric Cards & Progress Bars */}
              <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                
                {/* 1. Calories Card (Apple Red) */}
                <div className="p-4 rounded-2xl bg-black/60 border border-[#FA114F]/30 shadow-[0_0_20px_rgba(250,17,79,0.1)] flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FA114F] shadow-[0_0_8px_#FA114F]"></span>
                      <span className="text-xs font-black tracking-wider text-slate-200 uppercase">CALORIES</span>
                    </div>
                    <span className="text-[9px] font-bold text-[#FF5A78] font-stats">{Math.round(caloriePercent)}%</span>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-lg font-black text-white font-stats">{consumed.calories}</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">/ {targetCalories} KCAL</span>
                    </div>
                    <div className="w-full h-2 bg-[#25050f] rounded-full mt-2 overflow-hidden">
                      <div
                        style={{ width: `${caloriePercent}%` }}
                        className="h-full bg-gradient-to-r from-[#FA114F] to-[#FF5A78] rounded-full transition-all duration-500 shadow-[0_0_10px_#FA114F]"
                      ></div>
                    </div>
                  </div>
                </div>

                {/* 2. Protein Card (Apple Green) */}
                <div className="p-4 rounded-2xl bg-black/60 border border-[#30D158]/30 shadow-[0_0_20px_rgba(48,209,88,0.1)] flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#30D158] shadow-[0_0_8px_#30D158]"></span>
                      <span className="text-xs font-black tracking-wider text-slate-200 uppercase">PROTEIN</span>
                    </div>
                    <span className="text-[9px] font-bold text-[#A1FF00] font-stats">{Math.round(proteinPercent)}%</span>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-lg font-black text-white font-stats">{consumed.protein}G</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">/ {targetProtein}G</span>
                    </div>
                    <div className="w-full h-2 bg-[#06200d] rounded-full mt-2 overflow-hidden">
                      <div
                        style={{ width: `${proteinPercent}%` }}
                        className="h-full bg-gradient-to-r from-[#30D158] to-[#A1FF00] rounded-full transition-all duration-500 shadow-[0_0_10px_#30D158]"
                      ></div>
                    </div>
                  </div>
                </div>

                {/* 3. Carbohydrates Card (Apple Cyan/Blue) */}
                <div className="p-4 rounded-2xl bg-black/60 border border-[#00F0FF]/30 shadow-[0_0_20px_rgba(0,240,255,0.1)] flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#00F0FF] shadow-[0_0_8px_#00F0FF]"></span>
                      <span className="text-xs font-black tracking-wider text-slate-200 uppercase">CARBOHYDRATES</span>
                    </div>
                    <span className="text-[9px] font-bold text-cyan-300 font-stats">{Math.round(carbsPercent)}%</span>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-lg font-black text-white font-stats">{consumed.carbs}G</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">/ {targetCarbs}G</span>
                    </div>
                    <div className="w-full h-2 bg-[#031d2b] rounded-full mt-2 overflow-hidden">
                      <div
                        style={{ width: `${carbsPercent}%` }}
                        className="h-full bg-gradient-to-r from-[#00F0FF] to-[#0A84FF] rounded-full transition-all duration-500 shadow-[0_0_10px_#00F0FF]"
                      ></div>
                    </div>
                  </div>
                </div>

                {/* 4. Dietary Fats Card (Apple Violet) */}
                <div className="p-4 rounded-2xl bg-black/60 border border-[#BF5AF2]/30 shadow-[0_0_20px_rgba(191,90,242,0.1)] flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#BF5AF2] shadow-[0_0_8px_#BF5AF2]"></span>
                      <span className="text-xs font-black tracking-wider text-slate-200 uppercase">DIETARY FATS</span>
                    </div>
                    <span className="text-[9px] font-bold text-[#E040FB] font-stats">{Math.round(fatPercent)}%</span>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-lg font-black text-white font-stats">{consumed.fat}G</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">/ {targetFat}G</span>
                    </div>
                    <div className="w-full h-2 bg-[#1d0628] rounded-full mt-2 overflow-hidden">
                      <div
                        style={{ width: `${fatPercent}%` }}
                        className="h-full bg-gradient-to-r from-[#BF5AF2] to-[#E040FB] rounded-full transition-all duration-500 shadow-[0_0_10px_#BF5AF2]"
                      ></div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </section>

          {/* 4. AI NATURAL LANGUAGE FOOD PARSER & MEAL LOGS (MODULE 1 - INDIAN & GLOBAL) */}
          <section className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 hover:border-cyan-500/30 transition-all duration-300">
            
            {/* Header with Log button */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black tracking-[0.25em] text-cyan-400 uppercase">
                  DIETARY FUEL PIPELINE // INDIAN & GLOBAL
                </span>
                <h2 className="text-xl font-black italic tracking-tighter uppercase mt-0.5">
                  TODAY'S FUEL LOGS
                </h2>
              </div>
              <button
                onClick={() => setShowMealModal(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-400 text-black text-[10px] font-black tracking-[0.2em] uppercase rounded-xl transition hover:opacity-95 shadow-[0_0_20px_rgba(0,240,255,0.3)] cursor-pointer hover:scale-105 active:scale-95"
              >
                + MANUAL LOG
              </button>
            </div>

            {/* AI NATURAL LANGUAGE FOOD PARSER (MODULE 1) */}
            <div className="bg-black/60 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[9px] font-black tracking-[0.25em] text-cyan-400 uppercase bg-cyan-950/40 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
                  AI NATURAL LANGUAGE PARSER
                </span>
                <span className="text-[9px] font-bold text-slate-500 uppercase">
                  INDIAN STAPLES & GLOBAL DIETS SUPPORTED
                </span>
              </div>

              <form onSubmit={handleParseNlFood} className="space-y-3">
                <textarea
                  value={nlFoodInput}
                  onChange={(e) => setNlFoodInput(e.target.value)}
                  rows="2"
                  className="w-full p-3.5 bg-[#08080c] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-medium"
                  placeholder="E.G. '3 ROTIS, 150G PANEER BHURJI, AND 1 BOWL DAL' OR '200G CHICKEN TIKKA WITH BASMATI RICE'..."
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={nlLoading || !nlFoodInput.trim()}
                    className="px-5 py-2.5 bg-white text-black font-black text-[10px] tracking-[0.2em] uppercase rounded-xl transition hover:bg-slate-200 cursor-pointer disabled:opacity-50 hover:scale-105 active:scale-95"
                  >
                    {nlLoading ? "CALCULATING MACROS..." : "PARSE FOOD INTAKE ⚡"}
                  </button>
                </div>
              </form>

              {/* Parsed Result Preview Card */}
              {nlParsedResult && (
                <div className="mt-4 p-4 bg-[#0c0c12] border border-cyan-500/40 rounded-xl space-y-3">
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
                      <span className="text-base font-black text-white font-stats">{nlParsedResult.macros.calories}</span>
                      <span className="text-[8px] font-bold text-slate-500 block">KCAL</span>
                    </div>
                  </div>

                  <div className="flex gap-4 text-xs font-bold uppercase text-slate-300">
                    <span>PROTEIN: <span className="text-cyan-400 font-black font-stats">{nlParsedResult.macros.protein_g}G</span></span>
                    <span>CARBS: <span className="text-blue-400 font-black font-stats">{nlParsedResult.macros.carbs_g}G</span></span>
                    <span>FAT: <span className="text-indigo-400 font-black font-stats">{nlParsedResult.macros.fat_g}G</span></span>
                  </div>

                  <div className="flex gap-3 pt-2 border-t border-slate-900">
                    <button
                      onClick={handleCommitParsedMealToDaily}
                      className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-400 text-black font-black text-[10px] tracking-widest uppercase rounded-xl transition shadow-[0_0_15px_rgba(0,240,255,0.25)] cursor-pointer hover:brightness-110 active:scale-95"
                    >
                      LOG TO DAILY TARGETS →
                    </button>
                    <button
                      onClick={handleSaveParsedToCustom}
                      className="px-4 py-2.5 bg-slate-900 border border-slate-800 hover:border-cyan-400 text-cyan-300 font-black text-[10px] tracking-widest uppercase rounded-xl transition cursor-pointer hover:scale-105 active:scale-95"
                    >
                      ★ SAVE TO CUSTOM MEALS
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Meal Items List */}
            {log.meals && log.meals.length > 0 ? (
              <div className="divide-y divide-white/5">
                {log.meals.map((meal, idx) => (
                  <div key={meal.id || idx} className="py-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-sm text-white uppercase tracking-tight">{meal.name}</h4>
                      <div className="flex gap-4 text-[10px] text-slate-400 font-bold uppercase mt-1">
                        <span>P: <span className="text-cyan-400 font-bold font-stats">{meal.protein_g}G</span></span>
                        <span>C: <span className="text-blue-400 font-bold font-stats">{meal.carbs_g}G</span></span>
                        <span>F: <span className="text-indigo-400 font-bold font-stats">{meal.fat_g}G</span></span>
                        <span className="text-slate-500 font-semibold">{meal.logged_at}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black tracking-tight text-white font-stats">{meal.calories}</span>
                      <span className="text-[9px] font-black tracking-widest text-slate-500 block uppercase">KCAL</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed border-slate-900 rounded-2xl bg-black/40">
                <p className="text-xs text-slate-500 font-black uppercase tracking-wider">
                  NO FOOD INTAKE REGISTERED TODAY. LOG A MEAL OR QUERY AI TO POPULATE STATS.
                </p>
              </div>
            )}
          </section>

        </div>

        {/* RIGHT COLUMN: SAVED MEALS, WATER, STEPS, AND AI CONSOLE (4 COLS) */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* 1. SAVED MEAL TEMPLATES PANEL (MODULE 1) */}
          <section className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl hover:border-blue-500/30 transition-all duration-300">
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
                    className="p-3 bg-black/60 border border-slate-800 rounded-xl flex items-center justify-between hover:border-cyan-500/40 transition hover:scale-[1.01]"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <h5 className="text-xs font-black uppercase tracking-tight text-white truncate">{sm.name}</h5>
                      <div className="flex gap-2 text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                        <span className="text-cyan-400 font-stats">{sm.calories} KCAL</span>
                        <span>• P:{sm.protein_g}g</span>
                        <span>• C:{sm.carbs_g}g</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleQuickLogSavedMeal(sm)}
                        className="px-2.5 py-1 bg-cyan-950/60 border border-cyan-500/40 hover:bg-cyan-900 text-cyan-300 rounded-lg text-xs font-black transition cursor-pointer hover:scale-105 active:scale-95"
                        title="Log this meal to today"
                      >
                        + LOG
                      </button>
                      <button
                        onClick={() => handleDeleteSavedMeal(sm.id)}
                        className="w-6 h-6 text-slate-500 hover:text-red-400 text-xs flex items-center justify-center transition cursor-pointer"
                        title="Remove saved meal"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-slate-900 rounded-2xl bg-black/40">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  NO SAVED MEALS YET. PARSE OR LOG A MEAL AND CLICK "SAVE TO CUSTOM MEALS".
                </p>
              </div>
            )}
          </section>

          {/* 2. HYDRATION STATION */}
          <section className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl text-center hover:border-cyan-500/30 transition-all duration-300">
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

          {/* 3. STEPS TRACKER */}
          <section className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl text-center hover:border-blue-500/30 transition-all duration-300">
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

          {/* 4. AI TACTICAL CONSOLE: STRATEGIST & PANTRY COACHING (MODULE 4) */}
          <section className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden hover:border-cyan-500/30 transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-[#00F0FF]"></div>
            
            {/* AI Tab Selector */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setActiveAiTab("STRATEGIST")}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer border ${
                  activeAiTab === "STRATEGIST"
                    ? "bg-cyan-950/70 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.25)]"
                    : "bg-black/60 border-slate-900 text-slate-500 hover:text-slate-300"
                }`}
              >
                AI STRATEGIST
              </button>
              <button
                onClick={() => setActiveAiTab("PANTRY")}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer border ${
                  activeAiTab === "PANTRY"
                    ? "bg-cyan-950/70 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.25)]"
                    : "bg-black/60 border-slate-900 text-slate-500 hover:text-slate-300"
                }`}
              >
                PANTRY COACHING 🍳
              </button>
            </div>

            {/* TAB 1: AI STRATEGIST */}
            {activeAiTab === "STRATEGIST" && (
              <div className="space-y-4">
                {/* Target Macro Pills with Context of Remaining Targets */}
                <div className="flex flex-wrap items-center gap-2 p-2.5 bg-black/60 border border-slate-800 rounded-2xl">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">REMAINING TARGETS:</span>
                  <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950/50 border border-cyan-500/20 px-2 py-0.5 rounded-lg font-stats">
                    {remainingProtein.toFixed(0)}g P
                  </span>
                  <span className="text-[10px] font-bold text-blue-300 bg-blue-950/50 border border-blue-500/20 px-2 py-0.5 rounded-lg font-stats">
                    {remainingCarbs.toFixed(0)}g C
                  </span>
                  <span className="text-[10px] font-bold text-indigo-300 bg-indigo-950/50 border border-indigo-500/20 px-2 py-0.5 rounded-lg font-stats">
                    {remainingFat.toFixed(0)}g F
                  </span>
                  <span className="text-[10px] font-black text-white bg-slate-900 px-2 py-0.5 rounded-lg font-stats">
                    {remainingCalories.toFixed(0)} KCAL
                  </span>
                </div>

                <form onSubmit={handleAiInquiry} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed">
                      SYNTHESIZE MEAL PROTOCOL FOR {profile?.fitness_goals?.toUpperCase() || "HYPERTROPHY"}:
                    </p>
                    {aiPrompt && (
                      <button
                        type="button"
                        onClick={() => setAiPrompt("")}
                        className="text-[9px] text-slate-500 hover:text-slate-300 uppercase cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Preset prompt pills with Indian and Global options */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "🍗 Chicken Tikka & Phulka", prompt: "Tandoori chicken tikka with whole wheat phulkas & cucumber raita" },
                      { label: "🧀 Paneer Tikka & Roti", prompt: "Low-fat tandoori paneer tikka with multigrain rotis & mint dahi" },
                      { label: "🌱 Soya & Khichdi", prompt: "High-protein boiled soya chunks with moong dal khichdi & tadka" },
                      { label: "🍳 Desi Egg Bhurji", prompt: "Spicy egg white & whole egg bhurji with 2 whole wheat rotis" },
                      { label: "🥤 Sattu & Whey Lassi", prompt: "Roasted chana sattu and whey protein cold anabolic lassi with roasted jeera" },
                      { label: "🐟 Surmai Fish & Rice", prompt: "Tawa pan-seared surmai fish with steamed basmati rice & yellow dal" },
                    ].map((pill, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAiPrompt(pill.prompt)}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase transition cursor-pointer border ${
                          aiPrompt === pill.prompt
                            ? "bg-cyan-950 border-cyan-400 text-cyan-300"
                            : "bg-[#101015] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                        }`}
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows="2"
                    className="w-full p-3.5 bg-black/80 border border-slate-800 rounded-2xl text-xs text-slate-200 focus:outline-none focus:border-cyan-400 placeholder-slate-600 font-medium"
                    placeholder="Describe desired meal (e.g. '3 rotis with paneer bhurji' or 'Chicken tikka & brown rice')..."
                  />
                  
                  <button
                    type="submit"
                    disabled={aiLoading}
                    className="w-full py-3 bg-white text-black font-black text-[10px] tracking-[0.25em] uppercase rounded-2xl transition hover:bg-slate-200 cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    {aiLoading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                        SYNTHESIZING PROTOCOL...
                      </>
                    ) : (
                      "EXECUTE AI QUERY →"
                    )}
                  </button>
                </form>

                {aiResponse && (
                  <div className="mt-4 p-4 bg-black/80 border border-cyan-500/50 rounded-2xl space-y-3 shadow-[0_0_25px_rgba(0,240,255,0.2)] relative animate-fade-in">
                    <div>
                      <span className="text-[8px] font-black tracking-[0.2em] text-cyan-400 uppercase bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded">
                        SYNTHESIZED RECIPE PROTOCOL
                      </span>
                      <h4 className="font-black text-sm uppercase text-white mt-1.5">{aiResponse.name}</h4>
                      <div className="flex flex-wrap gap-2.5 text-[10px] text-slate-400 font-bold uppercase mt-2">
                        <span className="bg-[#121218] px-2 py-1 rounded-md border border-slate-800 font-stats">
                          PROTEIN: <span className="text-cyan-400 font-black">{aiResponse.protein_g ?? aiResponse.protein}G</span>
                        </span>
                        <span className="bg-[#121218] px-2 py-1 rounded-md border border-slate-800 font-stats">
                          CARBS: <span className="text-blue-400 font-black">{aiResponse.carbs_g ?? aiResponse.carbs}G</span>
                        </span>
                        <span className="bg-[#121218] px-2 py-1 rounded-md border border-slate-800 font-stats">
                          FAT: <span className="text-indigo-400 font-black">{aiResponse.fat_g ?? aiResponse.fat}G</span>
                        </span>
                        <span className="bg-white/10 px-2 py-1 rounded-md text-white font-black font-stats">
                          {aiResponse.calories} KCAL
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-300 leading-relaxed border-t border-white/5 pt-2.5">
                      <p className="text-[9px] font-black uppercase text-slate-500 mb-1">Preparation Instructions:</p>
                      {aiResponse.instructions}
                    </div>

                    <button
                      type="button"
                      onClick={handleAddAiMealToLog}
                      className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-400 text-black font-black text-[10px] tracking-[0.2em] uppercase rounded-xl transition shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:brightness-110 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
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
                  <div className="flex flex-wrap gap-1.5 min-h-12 p-2 bg-black/60 border border-slate-800 rounded-xl">
                    {pantryIngredients.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold uppercase"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredientTag(tag)}
                          className="hover:text-red-400 ml-1 cursor-pointer font-bold"
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
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddIngredientTag();
                        }
                      }}
                      className="flex-1 px-3.5 py-2 bg-black/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                      placeholder="Add item (e.g. Paneer, Moong Dal, Rotis, Chicken, Dahi)..."
                    />
                    <button
                      type="button"
                      onClick={handleAddIngredientTag}
                      className="px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-cyan-400 text-cyan-400 text-xs font-bold uppercase rounded-xl transition cursor-pointer hover:scale-105 active:scale-95"
                    >
                      + ADD
                    </button>
                  </div>
                </div>

                {/* Meal Count selector */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">PLAN MEAL COUNT:</span>
                  <div className="flex gap-1">
                    {[2, 3, 4].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setMealCount(count)}
                        className={`w-8 h-8 rounded-lg text-xs font-black transition cursor-pointer border hover:scale-110 active:scale-90 ${
                          mealCount === count
                            ? "bg-cyan-400 text-black border-cyan-400 shadow-[0_0_10px_#00F0FF]"
                            : "bg-black/60 border-slate-800 text-slate-400 hover:text-white"
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
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-400 text-black font-black text-[10px] tracking-[0.2em] uppercase rounded-xl transition shadow-[0_0_25px_rgba(0,240,255,0.3)] cursor-pointer disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
                >
                  {pantryLoading ? "COMPUTING PANTRY PROTOCOLS..." : "CONSTRUCT FULL-DAY PROTOCOL ⚡"}
                </button>

                {/* Pantry Timeline View */}
                {pantryPlan && pantryPlan.meals && (
                  <div className="mt-4 space-y-3 border-t border-white/5 pt-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black tracking-widest text-cyan-400 uppercase">
                        FULL-DAY MEAL TIMELINE
                      </span>
                      <button
                        type="button"
                        onClick={handleLogAllPantryMeals}
                        className="px-3 py-1 bg-cyan-400 text-black text-[9px] font-black tracking-widest uppercase rounded-lg shadow hover:bg-cyan-300 transition cursor-pointer hover:scale-105 active:scale-95"
                      >
                        + LOG ALL MEALS
                      </button>
                    </div>

                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      {pantryPlan.meals.map((mealItem, mIdx) => (
                        <div
                          key={mIdx}
                          className="p-3 bg-black/80 border border-slate-800 rounded-xl space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase">
                              {mealItem.meal_slot}
                            </span>
                            <span className="text-xs font-black text-cyan-300 font-stats">{mealItem.calories} KCAL</span>
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
      <AnimatePresence>
        {showMealModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-slate-900/95 border border-white/10 rounded-3xl p-8 relative shadow-[0_0_80px_rgba(0,82,255,0.25)] backdrop-blur-2xl"
            >
              <h3 className="text-2xl font-black italic tracking-tighter text-white uppercase mb-6 leading-none">
                LOG ATHLETE <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">FUEL</span>
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
                    className="w-full px-4 py-3 bg-black/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 uppercase"
                    placeholder="E.G., 3 ROTIS WITH PANEER BHURJI"
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
                      className="w-full px-4 py-3 bg-black/60 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400 font-stats"
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
                      className="w-full px-4 py-3 bg-black/60 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400 font-stats"
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
                      className="w-full px-4 py-3 bg-black/60 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400 font-stats"
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
                      className="w-full px-4 py-3 bg-black/60 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400 font-stats"
                      placeholder="12"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowMealModal(false)}
                    className="flex-1 py-3.5 bg-black/60 border border-slate-800 hover:border-slate-700 text-slate-400 font-bold text-xs uppercase rounded-xl tracking-wider cursor-pointer transition"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={mealSubmitting}
                    className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-400 text-black font-black text-xs uppercase rounded-xl tracking-widest shadow-[0_0_20px_rgba(0,240,255,0.3)] cursor-pointer disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] transition"
                  >
                    {mealSubmitting ? "COMMITTING..." : "COMMIT FUEL"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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