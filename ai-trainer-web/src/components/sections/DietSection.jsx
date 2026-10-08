import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../services/api";
import SectionHeader from "./SectionHeader";

export default function DietSection() {
  const { date, profile, log, setError, refresh, checkBadgeUnlocks, stats } = useOutletContext();
  const {
    targetCalories, targetProtein, targetCarbs, targetFat, consumed,
    remainingCalories, remainingProtein, remainingCarbs, remainingFat,
    caloriePercent, proteinPercent, carbsPercent, fatPercent,
  } = stats;

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
  const [pendingMealDelete, setPendingMealDelete] = useState(null); // index of meal awaiting confirm
  const [deletingMeal, setDeletingMeal] = useState(false);

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

  useEffect(() => {
    api.getSavedMeals().then((meals) => setSavedMeals(meals || [])).catch(() => {});
  }, []);

  // A pending "remove?" confirm belongs to one day's list; drop it when the day changes.
  useEffect(() => {
    setPendingMealDelete(null);
  }, [date]);

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
      await refresh();
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
      await refresh();
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
      await refresh();
    } catch (err) {
      console.error("Failed to log saved meal:", err);
    }
  };

  const handleDeleteLoggedMeal = async (meal, idx) => {
    setDeletingMeal(true);
    try {
      await api.deleteLoggedMeal(meal.id, date, idx);
      setPendingMealDelete(null);
      await refresh();
    } catch (err) {
      console.error("Failed to delete logged meal:", err);
      setError("FAILED TO REMOVE LOGGED MEAL.");
    } finally {
      setDeletingMeal(false);
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
      await refresh();
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
      await refresh();
    } catch (err) {
      console.error("Failed to log pantry meals:", err);
    }
  };

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
    <>
      <SectionHeader eyebrow="NUTRITION // INDIAN & GLOBAL" title="DIET" accent="// FUEL CONTROL" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Row 1: wide rings panel + narrower, offset saved-meals rail */}
        <div className="lg:col-span-7">
          <section className="depth-card depth-elevated bg-slate-900/95 border border-white/[0.08] rounded-3xl p-4 sm:p-8 shadow-2xl hover:border-cyan-500/30 transition-all duration-300">
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
        </div>
        <div className="lg:col-span-5 lg:mt-12">
          <section className="depth-card depth-elevated bg-slate-900/95 border border-white/[0.08] rounded-3xl p-6 shadow-2xl hover:border-blue-500/30 transition-all duration-300">
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
        </div>

        {/* Row 2: fuel log carries the weight; AI console sits beside it */}
        <div className="lg:col-span-7">
          <section className="depth-card depth-elevated bg-slate-900/95 border border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 hover:border-cyan-500/30 transition-all duration-300">

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
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-lg font-black tracking-tight text-white font-stats">{meal.calories}</span>
                        <span className="text-[9px] font-black tracking-widest text-slate-500 block uppercase">KCAL</span>
                      </div>
                      {meal.id && (pendingMealDelete === idx ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDeleteLoggedMeal(meal, idx)}
                            disabled={deletingMeal}
                            className="px-2.5 py-1.5 rounded-lg bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/25 text-[9px] font-black tracking-widest uppercase transition cursor-pointer disabled:opacity-50"
                          >
                            {deletingMeal ? "..." : "REMOVE"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingMealDelete(null)}
                            disabled={deletingMeal}
                            className="px-2.5 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white text-[9px] font-black tracking-widest uppercase transition cursor-pointer disabled:opacity-50"
                          >
                            KEEP
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPendingMealDelete(idx)}
                          className="w-7 h-7 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 text-base flex items-center justify-center transition cursor-pointer"
                          title="Remove logged meal"
                          aria-label={`Remove ${meal.name}`}
                        >
                          ×
                        </button>
                      ))}
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
        <div className="lg:col-span-5">
          <section className="depth-card depth-elevated bg-slate-900/95 border border-white/[0.08] rounded-3xl p-6 shadow-2xl relative overflow-hidden hover:border-cyan-500/30 transition-all duration-300">
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
                      {aiResponse.source === "fallback" && (
                        <span className="ml-2 text-[8px] font-black tracking-[0.2em] text-amber-300 uppercase bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded">
                          OFFLINE ENGINE
                        </span>
                      )}
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

                    {aiResponse.ingredients && aiResponse.ingredients.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5 border-t border-white/5 pt-2.5">
                    {aiResponse.ingredients.map((ing, iIdx) => (
                      <li
                        key={iIdx}
                        className="px-2 py-1 rounded-md bg-[#121218] border border-slate-800 text-[10px] font-bold text-slate-300 uppercase"
                      >
                        {ing.display || `${ing.quantity} ${ing.unit} ${ing.name}`}
                      </li>
                    ))}
                  </ul>
                )}

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
      </div>

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
    </>
  );
}
