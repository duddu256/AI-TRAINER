import React, { useState } from "react";
import { api } from "../services/api";

export default function Onboarding({ onOnboardingComplete }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [age, setAge] = useState(25);
  const [weight, setWeight] = useState(75);
  const [height, setHeight] = useState(175);
  const [bodyType, setBodyType] = useState("Mesomorph");
  const [goals, setGoals] = useState("Hypertrophy");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleNext = () => {
    if (step === 1 && !name.trim()) {
      setError("PLEASE ENTER YOUR NAME");
      return;
    }
    setError("");
    setStep(step + 1);
  };

  const handleBack = () => {
    setError("");
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    // Baseline calculation math based on user profile entries
    const targetProtein = weight * 2.0; 
    const targetCalories = goals === "Fat Loss" ? 1800 : goals === "Hypertrophy" ? 2700 : 2200;
    const targetCarbs = (targetCalories * 0.45) / 4;
    const targetFat = (targetCalories * 0.25) / 9;

    const profilePayload = {
      name: name,
      age: parseInt(age),
      height_cm: parseFloat(height),
      weight_kg: parseFloat(weight),
      body_type: bodyType,
      fitness_goals: goals,
      target_calories: targetCalories,
      target_protein_g: parseFloat(targetProtein.toFixed(1)),
      target_carbs_g: parseFloat(targetCarbs.toFixed(1)),
      target_fat_g: parseFloat(targetFat.toFixed(1)),
      target_water_ml: 3000,
      target_steps: 10000,
    };

    try {
      await api.saveProfile(profilePayload);
      onOnboardingComplete();
    } catch (err) {
      setError(err.message || "FAILED TO CONFIGURE PROFILE");
    } finally {
      setLoading(false);
    }
  };

  const renderProgressBar = () => {
    return (
      <div className="w-full mb-10">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
            STEP {step} OF 6
          </span>
          <span className="text-[10px] font-black tracking-widest text-cyan-400 uppercase">
            {Math.round((step / 6) * 100)}% COMPLETE
          </span>
        </div>
        <div className="flex gap-1 h-1 w-full">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className={`h-full flex-1 rounded-full transition-all duration-300 ${
                i <= step ? "bg-gradient-to-r from-blue-600 to-cyan-400" : "bg-slate-900"
              }`}
            ></div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-black flex flex-col justify-between p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-400/10 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Top Section */}
      <div className="max-w-md w-full mx-auto mt-4 z-10">
        {renderProgressBar()}
        {error && (
          <div className="mb-6 p-4 bg-red-950/40 border-l-4 border-red-500 text-red-200 text-xs font-bold rounded-r-lg uppercase tracking-wider">
            {error}
          </div>
        )}
      </div>

      {/* Dynamic Content Frame */}
      <div className="max-w-md w-full mx-auto flex-1 flex flex-col justify-center z-10">
        
        {/* STEP 1: NAME */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
              WHAT IS YOUR<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">NAME?</span>
            </h2>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent border-b-2 border-slate-800 py-4 text-3xl font-bold uppercase tracking-tight text-white focus:outline-none focus:border-cyan-400 transition-all placeholder-slate-800"
              placeholder="ENTER NAME"
            />
          </div>
        )}

        {/* STEP 2: AGE */}
        {step === 2 && (
          <div className="space-y-6 text-center">
            <h2 className="text-4xl font-black italic tracking-tighter uppercase text-left leading-none">
              WHAT IS YOUR<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">AGE?</span>
            </h2>
            <div className="text-8xl font-black tracking-tighter text-white py-4">
              {age} <span className="text-xl font-bold text-slate-500">YRS</span>
            </div>
            <input
              type="range"
              min="14"
              max="90"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>
        )}

        {/* STEP 3: WEIGHT RULER */}
        {step === 3 && (
          <div className="space-y-8">
            <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
              WHAT IS YOUR<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">WEIGHT?</span>
            </h2>
            <div className="text-center">
              <div className="text-8xl font-black tracking-tighter text-white leading-none">
                {weight} <span className="text-xl font-bold text-slate-500">KG</span>
              </div>
              
              {/* Horizontal sliding ruler simulation */}
              <div className="w-full overflow-hidden relative h-24 mt-8 flex flex-col justify-end">
                <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-1 h-16 bg-gradient-to-t from-cyan-400 to-blue-600 z-20 rounded-full"></div>
                <div 
                  className="flex items-end justify-center transition-all duration-150"
                  style={{ transform: `translateX(${(75 - weight) * 12}px)` }}
                >
                  {Array.from({ length: 111 }, (_, i) => i + 40).map((w) => (
                    <div key={w} className="flex flex-col items-center justify-end w-3 mx-1 flex-shrink-0">
                      <div className={`w-0.5 rounded-full transition-all ${
                        w === parseInt(weight) ? "h-12 bg-cyan-400" : w % 5 === 0 ? "h-8 bg-slate-500" : "h-5 bg-slate-800"
                      }`}></div>
                      <span className={`text-[9px] font-black mt-2 select-none ${
                        w === parseInt(weight) ? "text-cyan-400" : "text-slate-700"
                      }`}>
                        {w % 5 === 0 ? w : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <input
                type="range"
                min="40"
                max="150"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full accent-cyan-400 mt-6 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* STEP 4: HEIGHT RULER */}
        {step === 4 && (
          <div className="space-y-8 flex flex-row items-center justify-between">
            <div className="space-y-4 flex-1">
              <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
                WHAT IS YOUR<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">HEIGHT?</span>
              </h2>
              <div className="text-7xl font-black tracking-tighter text-white mt-4">
                {height} <span className="text-xl font-bold text-slate-500">CM</span>
              </div>
              <input
                type="range"
                min="120"
                max="220"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full accent-cyan-400 mt-6 cursor-pointer"
              />
            </div>
            
            {/* Vertical height ruler simulation */}
            <div className="w-16 h-64 bg-slate-950 border border-slate-900 rounded-2xl flex relative overflow-hidden ml-4">
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-1 bg-gradient-to-l from-cyan-400 to-blue-600 z-20"></div>
              <div 
                className="flex flex-col items-end w-full absolute right-0 transition-all duration-150"
                style={{ transform: `translateY(${(height - 170) * 4}px)` }}
              >
                {Array.from({ length: 101 }, (_, i) => 220 - i).map((h) => (
                  <div key={h} className="flex items-center justify-end h-2 w-full pr-1">
                    <span className="text-[7px] font-bold text-slate-700 mr-2">{h % 5 === 0 ? h : ""}</span>
                    <div className={`h-0.5 rounded-full ${
                      h === parseInt(height) ? "w-6 bg-cyan-400" : h % 5 === 0 ? "w-4 bg-slate-600" : "w-2 bg-slate-800"
                    }`}></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: SOMATOTYPE CARD SELECTION */}
        {step === 5 && (
          <div className="space-y-6">
            <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
              WHAT IS YOUR<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">BODY TYPE?</span>
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: "Ectomorph", desc: "LEAN / FAST METABOLISM" },
                { id: "Mesomorph", desc: "ATHLETIC / LEAN MUSCLE" },
                { id: "Endomorph", desc: "BROAD / SLOWER METABOLISM" }
              ].map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBodyType(b.id)}
                  className={`p-5 rounded-2xl text-left border transition-all ${
                    bodyType === b.id
                      ? "bg-gradient-to-r from-blue-950/40 to-cyan-950/40 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.15)]"
                      : "bg-[#0a0a0c] border-slate-900 hover:border-slate-800"
                  }`}
                >
                  <div className="text-lg font-black tracking-tight text-white">{b.id.toUpperCase()}</div>
                  <div className="text-[10px] font-bold text-slate-500 mt-1 tracking-wider">{b.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 6: GOAL SELECTION */}
        {step === 6 && (
          <div className="space-y-6">
            <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
              WHAT IS YOUR<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">FOCUS?</span>
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: "Hypertrophy", desc: "BUILD MUSCLE & POWER" },
                { id: "Fat Loss", desc: "BURN CALORIES & SHRED" },
                { id: "Endurance", desc: "STAMINA & PERFORMANCE" }
              ].map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGoals(g.id)}
                  className={`p-5 rounded-2xl text-left border transition-all ${
                    goals === g.id
                      ? "bg-gradient-to-r from-blue-950/40 to-cyan-950/40 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.15)]"
                      : "bg-[#0a0a0c] border-slate-900 hover:border-slate-800"
                  }`}
                >
                  <div className="text-lg font-black tracking-tight text-white">{g.id.toUpperCase()}</div>
                  <div className="text-[10px] font-bold text-slate-500 mt-1 tracking-wider">{g.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Bottom Button Panel */}
      <div className="max-w-md w-full mx-auto mt-10 z-10 flex gap-4">
        {step > 1 && (
          <button
            type="button"
            onClick={handleBack}
            className="w-16 h-16 bg-[#0a0a0c] border border-slate-800 hover:border-slate-700 text-white rounded-2xl flex items-center justify-center font-bold text-xl transition"
          >
            ←
          </button>
        )}
        {step < 6 ? (
          <button
            type="button"
            onClick={handleNext}
            className="flex-1 py-5 bg-white hover:bg-slate-200 text-black font-black text-xs tracking-widest uppercase rounded-2xl transition"
          >
            NEXT STEP →
          </button>
        ) : (
          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="flex-1 py-5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-black font-black text-xs tracking-widest uppercase rounded-2xl transition shadow-[0_4px_25px_rgba(0,240,255,0.3)] disabled:opacity-50"
          >
            {loading ? "BUILDING PROFILE..." : "BUILD DASHBOARD →"}
          </button>
        )}
      </div>
    </div>
  );
}
