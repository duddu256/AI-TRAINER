import React, { useState } from "react";
import { api } from "../services/api";

export default function CustomSplitEditor({ isOpen, onClose, customSplits, onSaveSplits, onSelectSplit }) {
  if (!isOpen) return null;

  const [splits, setSplits] = useState(customSplits || {});
  const [activeSplitKey, setActiveSplitKey] = useState(
    Object.keys(splits)[0] || "CUSTOM PUSH (HEAVY)"
  );
  
  const [newSplitName, setNewSplitName] = useState("");
  const [newExName, setNewExName] = useState("");
  const [newExSets, setNewExSets] = useState(4);
  const [newExReps, setNewExReps] = useState("8-10");
  const [newExWeight, setNewExWeight] = useState("60kg");
  const [saving, setSaving] = useState(false);

  const currentExercises = splits[activeSplitKey] || [];

  const handleAddSplit = () => {
    if (!newSplitName.trim()) return;
    const cleanName = newSplitName.trim().toUpperCase();
    if (!splits[cleanName]) {
      const updated = { ...splits, [cleanName]: [] };
      setSplits(updated);
      setActiveSplitKey(cleanName);
      setNewSplitName("");
    }
  };

  const handleDeleteSplit = (splitName) => {
    const updated = { ...splits };
    delete updated[splitName];
    setSplits(updated);
    const keys = Object.keys(updated);
    if (keys.length > 0) {
      setActiveSplitKey(keys[0]);
    }
  };

  const handleAddExercise = (e) => {
    e.preventDefault();
    if (!newExName.trim()) return;

    const newEx = {
      name: newExName.trim(),
      sets: parseInt(newExSets) || 3,
      reps: newExReps.trim() || "10",
      weight: newExWeight.trim() || "Bodyweight"
    };

    const updatedList = [...currentExercises, newEx];
    const updatedSplits = { ...splits, [activeSplitKey]: updatedList };
    setSplits(updatedSplits);

    setNewExName("");
    setNewExSets(4);
    setNewExReps("8-10");
    setNewExWeight("60kg");
  };

  const handleDeleteExercise = (index) => {
    const updatedList = currentExercises.filter((_, idx) => idx !== index);
    const updatedSplits = { ...splits, [activeSplitKey]: updatedList };
    setSplits(updatedSplits);
  };

  const handleCommitSave = async () => {
    setSaving(true);
    try {
      await api.saveCustomSplits(splits);
      if (onSaveSplits) onSaveSplits(splits);
      onClose();
    } catch (err) {
      console.error("Failed to save custom splits:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 select-none font-sans">
      <div className="w-full max-w-3xl bg-[#0a0a0c] border border-[#1a1a24] rounded-3xl p-6 sm:p-8 relative shadow-[0_0_60px_rgba(0,82,255,0.25)] max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Top Accent Stripe */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#0052FF] via-cyan-400 to-[#00F0FF]"></div>

        {/* Header */}
        <div className="flex items-start justify-between mb-6 pb-4 border-b border-[#14141c]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black tracking-[0.25em] text-cyan-400 uppercase">
                DYNAMIC SPLITS // VECTOR ENGINE
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black italic tracking-tighter uppercase text-white mt-1">
              CUSTOM SPLIT <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0052FF] to-[#00F0FF]">ARCHITECT</span>
            </h2>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">
              DESIGN AND ADAPT YOUR PERSONALIZED PROGRESSIVE OVERLOAD PROTOCOLS
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-black border border-slate-900 hover:border-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-lg transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Split Navigation Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-thin">
          {Object.keys(splits).map((sKey) => {
            const isSelected = sKey === activeSplitKey;
            return (
              <div key={sKey} className="flex items-center flex-shrink-0">
                <button
                  onClick={() => setActiveSplitKey(sKey)}
                  className={`px-4 py-2 rounded-xl text-xs font-black tracking-tight uppercase transition border cursor-pointer ${
                    isSelected
                      ? "bg-gradient-to-r from-blue-950/60 to-cyan-950/60 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.2)]"
                      : "bg-black border-slate-900 text-slate-400 hover:border-slate-800"
                  }`}
                >
                  {sKey} ({splits[sKey]?.length || 0})
                </button>
                {Object.keys(splits).length > 1 && (
                  <button
                    onClick={() => handleDeleteSplit(sKey)}
                    className="ml-1 text-slate-600 hover:text-red-400 text-xs px-1"
                    title="Delete Split"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Create New Split Input */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={newSplitName}
            onChange={(e) => setNewSplitName(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-black border border-slate-900 rounded-xl text-xs text-white uppercase placeholder-slate-700 focus:outline-none focus:border-cyan-400 font-bold"
            placeholder="NEW SPLIT NAME (E.G., 'CHEST & TRICEPS HYPERTROPHY')"
          />
          <button
            onClick={handleAddSplit}
            className="px-4 py-2.5 bg-slate-900 border border-slate-800 hover:border-cyan-400 text-cyan-400 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer"
          >
            + ADD SPLIT
          </button>
        </div>

        {/* Active Split Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase">
              EXERCISES IN {activeSplitKey}
            </h3>
            {onSelectSplit && (
              <button
                onClick={() => {
                  onSelectSplit(activeSplitKey);
                  onClose();
                }}
                className="text-[10px] font-black tracking-widest text-cyan-400 hover:text-cyan-300 uppercase bg-cyan-950/40 border border-cyan-500/30 px-3 py-1 rounded-full cursor-pointer"
              >
                ⚡ LOAD ONTO ACTIVE DASHBOARD
              </button>
            )}
          </div>

          {/* Exercises List */}
          {currentExercises.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentExercises.map((ex, index) => (
                <div
                  key={index}
                  className="p-4 rounded-2xl bg-black border border-slate-900 flex items-center justify-between group hover:border-slate-800 transition"
                >
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-tight text-white">{ex.name}</h4>
                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">
                      {ex.sets} SETS × {ex.reps} REPS • <span className="text-cyan-400">{ex.weight}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteExercise(index)}
                    className="w-7 h-7 rounded-lg bg-[#0e0e14] border border-slate-900 text-slate-500 hover:text-red-400 text-xs flex items-center justify-center transition cursor-pointer"
                    title="Remove Exercise"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed border-slate-900 rounded-2xl bg-black">
              <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">
                NO EXERCISES IN THIS SPLIT. ADD ONE BELOW TO POPULATE.
              </p>
            </div>
          )}

          {/* Add Exercise Form */}
          <form onSubmit={handleAddExercise} className="bg-black/60 border border-slate-900 rounded-2xl p-4 mt-4 space-y-3">
            <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase block">
              + APPEND EXERCISE TO PROTOCOL
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                required
                value={newExName}
                onChange={(e) => setNewExName(e.target.value)}
                className="sm:col-span-2 px-3 py-2 bg-black border border-slate-800 rounded-xl text-xs text-white placeholder-slate-700 focus:outline-none focus:border-cyan-400"
                placeholder="EXERCISE NAME (E.G. INCLINE DB PRESS)"
              />
              <input
                type="number"
                value={newExSets}
                onChange={(e) => setNewExSets(e.target.value)}
                className="px-3 py-2 bg-black border border-slate-800 rounded-xl text-xs text-white placeholder-slate-700 focus:outline-none focus:border-cyan-400"
                placeholder="SETS (4)"
              />
              <input
                type="text"
                value={newExReps}
                onChange={(e) => setNewExReps(e.target.value)}
                className="px-3 py-2 bg-black border border-slate-800 rounded-xl text-xs text-white placeholder-slate-700 focus:outline-none focus:border-cyan-400"
                placeholder="REPS (8-10)"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newExWeight}
                onChange={(e) => setNewExWeight(e.target.value)}
                className="flex-1 px-3 py-2 bg-black border border-slate-800 rounded-xl text-xs text-white placeholder-slate-700 focus:outline-none focus:border-cyan-400"
                placeholder="TARGET WEIGHT (E.G. 30KG EACH / 80KG)"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-black text-xs uppercase tracking-wider rounded-xl hover:bg-cyan-900/60 transition cursor-pointer"
              >
                + ADD EXERCISE
              </button>
            </div>
          </form>
        </div>

        {/* Bottom Commit Action */}
        <div className="mt-6 pt-4 border-t border-[#14141c] flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 bg-black border border-slate-800 hover:border-slate-700 text-slate-400 font-bold text-xs uppercase rounded-xl tracking-wider cursor-pointer"
          >
            CANCEL
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleCommitSave}
            className="flex-1 py-3.5 bg-gradient-to-r from-[#0052FF] to-[#00F0FF] text-black font-black text-xs uppercase tracking-[0.2em] rounded-xl transition shadow-[0_0_20px_rgba(0,240,255,0.3)] cursor-pointer disabled:opacity-50"
          >
            {saving ? "PERSISTING PROTOCOLS..." : "PERSIST CUSTOM SPLITS →"}
          </button>
        </div>

      </div>
    </div>
  );
}
