import React, { useState } from "react";
import { api } from "../services/api";

export default function Onboarding({ onOnboardingComplete }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [age, setAge] = useState(24);
  const [weight, setWeight] = useState(76);
  const [height, setHeight] = useState(178);
  const [bodyType, setBodyType] = useState("Mesomorph");
  const [goals, setGoals] = useState("Hypertrophy");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleNext = () => {
    if (step === 1 && !name.trim()) {
      setError("PLEASE ENTER YOUR ATHLETE NAME");
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
    const numWeight = parseFloat(weight);
    const targetCalories = goals === "Fat Loss" ? 1850 : goals === "Hypertrophy" ? 2750 : 2250;
    const targetProtein = numWeight * 2.0; 
    const targetCarbs = (targetCalories * 0.45) / 4;
    const targetFat = (targetCalories * 0.25) / 9;

    const profilePayload = {
      name: name.trim().toUpperCase(),
      age: parseInt(age),
      height_cm: parseFloat(height),
      weight_kg: numWeight,
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
      setError(err.message || "FAILED TO CONFIGURE ATHLETE PROFILE");
    } finally {
      setLoading(false);
    }
  };

  const renderProgressBar = () => {
    return (
      <div className="w-full mb-8">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] font-black tracking-[0.25em] text-slate-500 uppercase">
            CALIBRATION STEP {step} OF 6
          </span>
          <span className="text-[10px] font-black tracking-[0.2em] text-cyan-400 uppercase">
            {Math.round((step / 6) * 100)}% COMPLETE
          </span>
        </div>
        <div className="flex gap-1.5 h-1.5 w-full">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className={`h-full flex-1 rounded-full transition-all duration-300 ${
                i <= step
                  ? "bg-gradient-to-r from-[#0052FF] to-[#00F0FF] shadow-[0_0_8px_rgba(0,240,255,0.4)]"
                  : "bg-slate-900"
              }`}
            ></div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-black flex flex-col justify-between p-6 relative overflow-hidden font-sans select-none">
      {/* Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 blur-[130px] rounded-full pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-400/10 blur-[130px] rounded-full pointer-events-none"></div>

      {/* Top Section */}
      <div className="max-w-md w-full mx-auto mt-2 z-10">
        {renderProgressBar()}
        {error && (
          <div className="mb-4 p-4 bg-red-950/40 border-l-4 border-red-500 text-red-200 text-xs font-bold rounded-r-xl uppercase tracking-wider">
            {error}
          </div>
        )}
      </div>

      {/* Dynamic Content Frame */}
      <div className="max-w-md w-full mx-auto flex-1 flex flex-col justify-center z-10 py-6">
        
        {/* STEP 1: NAME */}
        {step === 1 && (
          <div className="space-y-6">
            <span className="text-[10px] font-black tracking-[0.25em] text-cyan-400 uppercase bg-cyan-950/40 border border-cyan-500/30 px-3 py-1 rounded-full">
              PROTOCOL // IDENTITY
            </span>
            <h2 className="text-4xl sm:text-5xl font-black italic tracking-tighter uppercase leading-none text-white">
              WHAT IS YOUR <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0052FF] to-[#00F0FF]">
                ATHLETE NAME?
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              THIS WILL IDENTIFY YOUR PROFILE ACROSS ALL WORKOUT LOGS.
            </p>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent border-b-2 border-slate-800 py-4 text-3xl font-black uppercase tracking-tight text-white focus:outline-none focus:border-cyan-400 transition-all placeholder-slate-800"
              placeholder="ENTER NAME"
            />
          </div>
        )}

        {/* STEP 2: AGE */}
        {step === 2 && (
          <div className="space-y-6 text-center">
            <div className="text-left">
              <span className="text-[10px] font-black tracking-[0.25em] text-cyan-400 uppercase bg-cyan-950/40 border border-cyan-500/30 px-3 py-1 rounded-full">
                PROTOCOL // BIOMETRICS
              </span>
              <h2 className="text-4xl sm:text-5xl font-black italic tracking-tighter uppercase leading-none text-white mt-3">
                WHAT IS YOUR <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0052FF] to-[#00F0FF]">
                  CURRENT AGE?
                </span>
              </h2>
            </div>
            <div className="text-8xl sm:text-9xl font-black tracking-tighter text-white py-6">
              {age} <span className="text-xl font-black text-slate-500 uppercase tracking-widest">YRS</span>
            </div>
            <input
              type="range"
              min="14"
              max="80"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-900 rounded-lg"
            />
            <div className="flex justify-between text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">
              <span>14 YRS</span>
              <span>45 YRS</span>
              <span>80 YRS</span>
            </div>
          </div>
        )}

        {/* STEP 3: WEIGHT RULER */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <span className="text-[10px] font-black tracking-[0.25em] text-cyan-400 uppercase bg-cyan-950/40 border border-cyan-500/30 px-3 py-1 rounded-full">
                PROTOCOL // PHYSICAL MASS
              </span>
              <h2 className="text-4xl sm:text-5xl font-black italic tracking-tighter uppercase leading-none text-white mt-3">
                WHAT IS YOUR <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0052FF] to-[#00F0FF]">
                  CURRENT WEIGHT?
                </span>
              </h2>
            </div>

            <div className="text-center bg-[#0a0a0c] border border-slate-900 rounded-3xl p-6 shadow-2xl relative">
              <div className="text-7xl sm:text-8xl font-black tracking-tighter text-white leading-none">
                {weight} <span className="text-xl font-bold text-slate-500">KG</span>
              </div>
              
              {/* Horizontal sliding ruler simulation */}
              <div className="w-full overflow-hidden relative h-28 mt-6 bg-black rounded-2xl border border-[#14141a] flex flex-col justify-end pb-2">
                {/* Center needle indicator with glow */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-1 h-20 bg-gradient-to-t from-cyan-400 via-cyan-300 to-blue-600 z-30 rounded-full shadow-[0_0_15px_rgba(0,240,255,0.8)]">
                  <div className="w-3 h-3 bg-cyan-400 rounded-full absolute -top-1 left-1/2 -translate-x-1/2 shadow-[0_0_10px_#00F0FF]"></div>
                </div>

                {/* Sliding Ruler Tape */}
                <div 
                  className="flex items-end justify-center transition-all duration-100 ease-out"
                  style={{ transform: `translateX(${(75 - weight) * 14}px)` }}
                >
                  {Array.from({ length: 121 }, (_, i) => i + 35).map((w) => {
                    const isSelected = w === parseInt(weight);
                    const isMajor = w % 5 === 0;
                    return (
                      <div key={w} className="flex flex-col items-center justify-end w-3.5 flex-shrink-0">
                        <div
                          className={`rounded-full transition-all ${
                            isSelected
                              ? "h-14 w-1 bg-cyan-400 shadow-[0_0_8px_#00F0FF]"
                              : isMajor
                              ? "h-9 w-0.5 bg-slate-400"
                              : "h-5 w-0.5 bg-slate-800"
                          }`}
                        ></div>
                        <span
                          className={`text-[8px] font-black mt-2 select-none ${
                            isSelected
                              ? "text-cyan-400"
                              : isMajor
                              ? "text-slate-500"
                              : "text-transparent"
                          }`}
                        >
                          {isMajor ? w : "."}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <input
                type="range"
                min="40"
                max="150"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full accent-cyan-400 mt-6 cursor-pointer h-2 bg-slate-900 rounded-lg"
              />
              <div className="flex justify-between text-[10px] font-black text-slate-600 uppercase tracking-widest mt-2 px-1">
                <span>40 KG</span>
                <span>95 KG</span>
                <span>150 KG</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: HEIGHT RULER */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <span className="text-[10px] font-black tracking-[0.25em] text-cyan-400 uppercase bg-cyan-950/40 border border-cyan-500/30 px-3 py-1 rounded-full">
                PROTOCOL // STATURE
              </span>
              <h2 className="text-4xl sm:text-5xl font-black italic tracking-tighter uppercase leading-none text-white mt-3">
                WHAT IS YOUR <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0052FF] to-[#00F0FF]">
                  STATURE / HEIGHT?
                </span>
              </h2>
            </div>

            <div className="bg-[#0a0a0c] border border-slate-900 rounded-3xl p-6 shadow-2xl flex items-center justify-between gap-6">
              <div className="space-y-4 flex-1">
                <div className="text-6xl sm:text-7xl font-black tracking-tighter text-white leading-none">
                  {height} <span className="text-xl font-bold text-slate-500">CM</span>
                </div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  PRECISE HEIGHT CALIBRATES BASAL METABOLIC RATE AND ENERGY EXPENDITURE.
                </p>
                <input
                  type="range"
                  min="130"
                  max="220"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full accent-cyan-400 mt-4 cursor-pointer h-2 bg-slate-900 rounded-lg"
                />
                <div className="flex justify-between text-[9px] font-black text-slate-600 uppercase tracking-widest">
                  <span>130 CM</span>
                  <span>175 CM</span>
                  <span>220 CM</span>
                </div>
              </div>
              
              {/* Vertical height tape ruler */}
              <div className="w-20 h-72 bg-black border border-[#14141a] rounded-2xl flex relative overflow-hidden flex-shrink-0 shadow-inner">
                {/* Horizontal laser indicator */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gradient-to-l from-cyan-400 to-transparent z-30 shadow-[0_0_12px_#00F0FF]">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full absolute -top-0.5 right-1 shadow-[0_0_8px_#00F0FF]"></div>
                </div>

                <div 
                  className="flex flex-col items-end w-full absolute right-0 transition-all duration-100 ease-out"
                  style={{ transform: `translateY(${(height - 175) * 6}px)` }}
                >
                  {Array.from({ length: 96 }, (_, i) => 225 - i).map((h) => {
                    const isSelected = h === parseInt(height);
                    const isMajor = h % 5 === 0;
                    return (
                      <div key={h} className="flex items-center justify-end h-3 w-full pr-2">
                        <span className={`text-[8px] font-black mr-2 select-none ${
                          isSelected ? "text-cyan-400" : isMajor ? "text-slate-500" : "text-transparent"
                        }`}>
                          {isMajor ? h : ""}
                        </span>
                        <div className={`rounded-full ${
                          isSelected
                            ? "w-7 h-1 bg-cyan-400 shadow-[0_0_8px_#00F0FF]"
                            : isMajor
                            ? "w-4 h-0.5 bg-slate-400"
                            : "w-2 h-0.5 bg-slate-800"
                        }`}></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: SOMATOTYPE CARD SELECTION */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <span className="text-[10px] font-black tracking-[0.25em] text-cyan-400 uppercase bg-cyan-950/40 border border-cyan-500/30 px-3 py-1 rounded-full">
                PROTOCOL // PHYSIOLOGY
              </span>
              <h2 className="text-4xl sm:text-5xl font-black italic tracking-tighter uppercase leading-none text-white mt-3">
                SELECT YOUR <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0052FF] to-[#00F0FF]">
                  BODY TYPE.
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-3.5">
              {[
                { id: "Ectomorph", label: "ECTOMORPH", desc: "LEAN FRAME / RAPID METABOLISM / FAST CALORIC BURN", tag: "HYPER-OXIDATIVE" },
                { id: "Mesomorph", label: "MESOMORPH", desc: "ATHLETIC BUILD / EFFICIENT MUSCLE HYPERTROPHY", tag: "ANABOLIC DENSE" },
                { id: "Endomorph", label: "ENDOMORPH", desc: "BROAD FRAME / SOLID STRENGTH / HIGHER NUTRIENT STORAGE", tag: "POWER PROFILE" }
              ].map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBodyType(b.id)}
                  className={`p-5 rounded-2xl text-left border transition-all relative overflow-hidden cursor-pointer ${
                    bodyType === b.id
                      ? "bg-gradient-to-r from-blue-950/60 to-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.2)]"
                      : "bg-[#0a0a0c] border-slate-900 hover:border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-black tracking-tight text-white uppercase italic">{b.label}</div>
                    <span className={`text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase border ${
                      bodyType === b.id
                        ? "bg-cyan-400 text-black border-cyan-400"
                        : "bg-slate-900 text-slate-500 border-slate-800"
                    }`}>
                      {b.tag}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-400 mt-2 tracking-wide">{b.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 6: GOAL SELECTION */}
        {step === 6 && (
          <div className="space-y-6">
            <div>
              <span className="text-[10px] font-black tracking-[0.25em] text-cyan-400 uppercase bg-cyan-950/40 border border-cyan-500/30 px-3 py-1 rounded-full">
                PROTOCOL // OBJECTIVE
              </span>
              <h2 className="text-4xl sm:text-5xl font-black italic tracking-tighter uppercase leading-none text-white mt-3">
                DEFINE PRIMARY <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0052FF] to-[#00F0FF]">
                  FITNESS TARGET.
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-3.5">
              {[
                { id: "Hypertrophy", label: "HYPERTROPHY & POWER", desc: "MAXIMIZE LEAN MUSCLE GROWTH, STRENGTH, AND SURPLUS NUTRITION", focus: "BUILD MODE" },
                { id: "Fat Loss", label: "FAT LOSS & SHRED", desc: "TARGET DEFICIT, METABOLIC CONDITIONING, AND VASCULARITY", focus: "DEFICIT MODE" },
                { id: "Endurance", label: "ENDURANCE & ATHLETICISM", desc: "HIGH-CAPACITY CARDIOVASCULAR OUTPUT, AGILITY, AND SPEED", focus: "STAMINA MODE" }
              ].map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGoals(g.id)}
                  className={`p-5 rounded-2xl text-left border transition-all relative overflow-hidden cursor-pointer ${
                    goals === g.id
                      ? "bg-gradient-to-r from-blue-950/60 to-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.2)]"
                      : "bg-[#0a0a0c] border-slate-900 hover:border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-black tracking-tight text-white uppercase italic">{g.label}</div>
                    <span className={`text-[9px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase border ${
                      goals === g.id
                        ? "bg-cyan-400 text-black border-cyan-400"
                        : "bg-slate-900 text-slate-500 border-slate-800"
                    }`}>
                      {g.focus}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-400 mt-2 tracking-wide">{g.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Bottom Navigation Controls */}
      <div className="max-w-md w-full mx-auto mt-6 z-10 flex gap-4">
        {step > 1 && (
          <button
            type="button"
            onClick={handleBack}
            className="w-16 h-16 bg-[#0a0a0c] border border-slate-800 hover:border-cyan-400 text-white rounded-2xl flex items-center justify-center font-black text-xl transition cursor-pointer"
          >
            ←
          </button>
        )}
        {step < 6 ? (
          <button
            type="button"
            onClick={handleNext}
            className="flex-1 py-5 bg-white hover:bg-slate-200 text-black font-black text-xs tracking-[0.25em] uppercase rounded-2xl transition shadow-[0_0_20px_rgba(255,255,255,0.15)] cursor-pointer"
          >
            NEXT CALIBRATION →
          </button>
        ) : (
          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="flex-1 py-5 bg-gradient-to-r from-[#0052FF] to-[#00F0FF] hover:from-blue-500 hover:to-cyan-300 text-black font-black text-xs tracking-[0.25em] uppercase rounded-2xl transition shadow-[0_0_30px_rgba(0,240,255,0.35)] disabled:opacity-50 cursor-pointer"
          >
            {loading ? "INITIALIZING CONSOLE..." : "BUILD COMBAT DASHBOARD →"}
          </button>
        )}
      </div>
    </div>
  );
}
