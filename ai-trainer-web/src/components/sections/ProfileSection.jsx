import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { api } from "../../services/api";
import SectionHeader from "./SectionHeader";

const BODY_TYPES = ["Ectomorph", "Mesomorph", "Endomorph"];
const GOALS = ["Hypertrophy", "Fat Loss", "Endurance"];

// Field layout for the profile card. `kind` drives the edit control.
const PROFILE_FIELDS = [
  { key: "name", label: "NAME", kind: "text" },
  { key: "age", label: "AGE", kind: "int", suffix: "YRS" },
  { key: "height_cm", label: "HEIGHT", kind: "float", suffix: "CM" },
  { key: "weight_kg", label: "CURRENT WEIGHT", kind: "float", suffix: "KG" },
  { key: "body_type", label: "BODY TYPE", kind: "select", options: BODY_TYPES },
  { key: "fitness_goals", label: "GOAL", kind: "select", options: GOALS },
];

const TARGET_FIELDS = [
  { key: "target_calories", label: "CALORIES", kind: "int", suffix: "KCAL" },
  { key: "target_protein_g", label: "PROTEIN", kind: "float", suffix: "G" },
  { key: "target_carbs_g", label: "CARBS", kind: "float", suffix: "G" },
  { key: "target_fat_g", label: "FAT", kind: "float", suffix: "G" },
  { key: "target_water_ml", label: "WATER", kind: "int", suffix: "ML" },
  { key: "target_steps", label: "STEPS", kind: "int", suffix: "" },
];

const inputClass =
  "w-full px-3 py-2 bg-black/70 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400 font-bold";

const toNumber = (kind, raw) => {
  if (raw === "" || raw === null || raw === undefined) return undefined;
  const n = kind === "int" ? parseInt(raw, 10) : parseFloat(raw);
  return Number.isFinite(n) ? n : undefined;
};

const formatDay = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString([], { month: "short", day: "numeric" });

function WeightTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0].payload;
  return (
    <div className="px-3 py-2 rounded-xl bg-slate-950/95 border border-white/10 shadow-xl">
      <div className="text-[9px] font-black tracking-[0.2em] text-slate-500 uppercase">{formatDay(point.log_date)}</div>
      <div className="text-sm font-black text-white font-stats mt-0.5">{point.weight_kg} KG</div>
    </div>
  );
}

export default function ProfileSection() {
  const { date, profile, setProfile, log, setLog, refresh, setError, checkBadgeUnlocks, stats } = useOutletContext();

  // --- PROFILE EDIT MODE ---
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  const startEditing = () => {
    const initial = {};
    [...PROFILE_FIELDS, ...TARGET_FIELDS].forEach(({ key }) => {
      initial[key] = profile?.[key] ?? "";
    });
    if (!initial.target_water_ml) initial.target_water_ml = stats.targetWater;
    setDraft(initial);
    setProfileError("");
    setEditing(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const updates = {};
    [...PROFILE_FIELDS, ...TARGET_FIELDS].forEach(({ key, kind }) => {
      const value = kind === "text" || kind === "select" ? String(draft[key] ?? "").trim() : toNumber(kind, draft[key]);
      if (value !== undefined && value !== "" && value !== profile?.[key]) updates[key] = value;
    });
    if (Object.keys(updates).length === 0) {
      setEditing(false);
      return;
    }

    setSavingProfile(true);
    setProfileError("");
    try {
      const res = await api.updateProfile(updates);
      setProfile((prev) => ({ ...prev, ...updates, ...(res?.data || {}) }));
      setEditing(false);
    } catch (err) {
      setProfileError(err.message || "FAILED TO UPDATE PROFILE.");
    } finally {
      setSavingProfile(false);
    }
  };

  // --- WEIGHT TRACKING ---
  const [weightLogs, setWeightLogs] = useState([]);
  const [weightInput, setWeightInput] = useState("");
  const [weightSaving, setWeightSaving] = useState(false);
  const [weightMessage, setWeightMessage] = useState("");

  const loadWeightLogs = useCallback(async () => {
    try {
      const rows = await api.getWeightLogs(90);
      // API returns newest first; the chart reads left-to-right in time.
      setWeightLogs(
        (rows || [])
          .map((r) => ({ log_date: r.log_date, weight_kg: Number(r.weight_kg) }))
          .sort((a, b) => a.log_date.localeCompare(b.log_date))
      );
    } catch (err) {
      console.error("Failed to load weight history:", err);
    }
  }, []);

  useEffect(() => {
    loadWeightLogs();
  }, [loadWeightLogs]);

  const handleLogWeight = async (e) => {
    e.preventDefault();
    const value = parseFloat(weightInput);
    if (!Number.isFinite(value) || value <= 0 || value >= 500) {
      setWeightMessage("ENTER A WEIGHT BETWEEN 0 AND 500 KG.");
      return;
    }
    setWeightSaving(true);
    setWeightMessage("");
    try {
      const todayIso = new Date().toISOString().split("T")[0];
      await api.logWeight(value, todayIso);
      setProfile((prev) => ({ ...prev, weight_kg: value }));
      setWeightInput("");
      setWeightMessage("TODAY'S WEIGHT SAVED.");
      await loadWeightLogs();
    } catch (err) {
      setWeightMessage(err.message || "FAILED TO LOG WEIGHT.");
    } finally {
      setWeightSaving(false);
    }
  };

  const latest = weightLogs[weightLogs.length - 1];
  const first = weightLogs[0];
  const weightDelta = latest && first && weightLogs.length > 1 ? Math.round((latest.weight_kg - first.weight_kg) * 10) / 10 : null;

  // --- TODAY'S ENTRIES EDITOR ---
  const [editingMealIdx, setEditingMealIdx] = useState(null);
  const [mealDraft, setMealDraft] = useState({});
  const [mealSaving, setMealSaving] = useState(false);
  const [waterDraft, setWaterDraft] = useState(String(log.water_intake_ml || 0));
  const [stepsDraft, setStepsDraft] = useState(String(log.steps || 0));
  const [trackerSaving, setTrackerSaving] = useState(false);

  useEffect(() => {
    setWaterDraft(String(log.water_intake_ml || 0));
    setStepsDraft(String(log.steps || 0));
  }, [log.water_intake_ml, log.steps]);

  useEffect(() => {
    setEditingMealIdx(null);
  }, [date]);

  const startEditMeal = (meal, idx) => {
    setEditingMealIdx(idx);
    setMealDraft({
      name: meal.name,
      calories: meal.calories,
      protein_g: meal.protein_g,
      carbs_g: meal.carbs_g,
      fat_g: meal.fat_g,
    });
  };

  const handleSaveMeal = async (meal, idx) => {
    const updates = {
      name: String(mealDraft.name || "").trim(),
      calories: toNumber("int", mealDraft.calories),
      protein_g: toNumber("float", mealDraft.protein_g),
      carbs_g: toNumber("float", mealDraft.carbs_g),
      fat_g: toNumber("float", mealDraft.fat_g),
    };
    Object.keys(updates).forEach((k) => (updates[k] === undefined || updates[k] === "") && delete updates[k]);

    setMealSaving(true);
    try {
      await api.updateLoggedMeal(meal.id, date, idx, updates);
      setEditingMealIdx(null);
      await refresh();
    } catch (err) {
      console.error("Failed to update meal:", err);
      setError("FAILED TO UPDATE LOGGED MEAL.");
    } finally {
      setMealSaving(false);
    }
  };

  const handleSaveTrackers = async (e) => {
    e.preventDefault();
    const water = Math.max(0, toNumber("int", waterDraft) ?? 0);
    const steps = Math.max(0, toNumber("int", stepsDraft) ?? 0);
    const payload = {
      date,
      water_intake_ml: water,
      water_met: water >= stats.targetWater,
      steps,
      steps_met: steps >= stats.targetSteps,
    };
    setTrackerSaving(true);
    try {
      const res = await api.updateTrackers(payload);
      setLog((prev) => ({ ...prev, ...payload }));
      checkBadgeUnlocks(res);
    } catch (err) {
      console.error("Failed to update trackers:", err);
      setError("FAILED TO UPDATE WATER / STEPS.");
    } finally {
      setTrackerSaving(false);
    }
  };

  const renderValue = ({ key, suffix }) => {
    const value = key === "target_water_ml" ? profile?.[key] || stats.targetWater : profile?.[key];
    if (value === undefined || value === null || value === "") return <span className="text-slate-600">—</span>;
    return (
      <>
        <span className="font-stats">{value}</span>
        {suffix && <span className="text-[9px] text-slate-500 ml-1">{suffix}</span>}
      </>
    );
  };

  const renderInput = ({ key, kind, options }) =>
    kind === "select" ? (
      <select
        value={draft[key] ?? ""}
        onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
        className={`${inputClass} uppercase`}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o.toUpperCase()}
          </option>
        ))}
      </select>
    ) : (
      <input
        type={kind === "text" ? "text" : "number"}
        step={kind === "float" ? "0.1" : "1"}
        value={draft[key] ?? ""}
        onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
        className={`${inputClass} ${kind === "text" ? "uppercase" : "font-stats"}`}
      />
    );

  const isToday = date === new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-8">
      <SectionHeader eyebrow="ATHLETE DOSSIER // ONBOARDING DATA" title="PROFILE" accent="// TARGETS">
        {!editing ? (
          <button
            type="button"
            onClick={startEditing}
            className="px-4 py-2 bg-cyan-950/70 border border-cyan-500/40 hover:border-cyan-400 rounded-xl text-[10px] font-black tracking-widest text-cyan-300 uppercase transition cursor-pointer active:scale-95"
          >
            ✎ EDIT PROFILE
          </button>
        ) : (
          <span className="text-[9px] font-black tracking-[0.2em] text-amber-300 uppercase">EDIT MODE</span>
        )}
      </SectionHeader>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* PROFILE + TARGETS CARD (wide) */}
        <form
          onSubmit={handleSaveProfile}
          className="lg:col-span-7 depth-card depth-elevated bg-slate-900/95 border border-white/[0.08] rounded-3xl p-6 sm:p-8 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-[#00F0FF]"></div>

          <h3 className="text-[10px] font-black tracking-[0.25em] text-slate-400 uppercase mb-4">PHYSICAL PROFILE</h3>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-5">
            {PROFILE_FIELDS.map((field) => (
              <div key={field.key} className={field.key === "name" ? "col-span-2 sm:col-span-3" : ""}>
                <dt className="text-[9px] font-black tracking-[0.2em] text-slate-500 uppercase mb-1">{field.label}</dt>
                <dd className="text-sm font-black text-white uppercase">
                  {editing ? renderInput(field) : renderValue(field)}
                </dd>
              </div>
            ))}
          </dl>

          <h3 className="text-[10px] font-black tracking-[0.25em] text-slate-400 uppercase mt-8 mb-4 pt-6 border-t border-white/5">
            DAILY TARGETS
          </h3>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {TARGET_FIELDS.map((field) => (
              <div key={field.key} className="p-3 rounded-2xl bg-black/50 border border-slate-800">
                <dt className="text-[9px] font-black tracking-[0.2em] text-slate-500 uppercase mb-1">{field.label}</dt>
                <dd className="text-base font-black text-white">{editing ? renderInput(field) : renderValue(field)}</dd>
              </div>
            ))}
          </dl>

          {profileError && (
            <p className="mt-4 text-[10px] font-black text-red-400 uppercase tracking-wider">{profileError}</p>
          )}

          {editing && (
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={savingProfile}
                className="flex-1 py-3 bg-black/60 border border-slate-800 hover:border-slate-700 text-slate-400 font-black text-[10px] uppercase rounded-xl tracking-widest cursor-pointer transition"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={savingProfile}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-400 text-black font-black text-[10px] uppercase rounded-xl tracking-widest shadow-[0_0_20px_rgba(0,240,255,0.3)] cursor-pointer disabled:opacity-50 active:scale-[0.98] transition"
              >
                {savingProfile ? "SAVING..." : "SAVE PROFILE"}
              </button>
            </div>
          )}
        </form>

        {/* WEIGHT TRACKING CARD (narrow, offset) */}
        <section className="lg:col-span-5 lg:mt-10 depth-card depth-elevated depth-tilt-right bg-slate-900/95 border border-white/[0.08] rounded-3xl p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[9px] font-black tracking-[0.25em] text-cyan-400 uppercase">BODY WEIGHT // 90 DAYS</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-black tracking-tighter font-stats">
                  {latest ? latest.weight_kg : profile?.weight_kg ?? "—"}
                </span>
                <span className="text-xs font-black text-slate-500">KG</span>
              </div>
              {weightDelta !== null && (
                <div className="text-[10px] font-black text-slate-400 uppercase mt-1 font-stats">
                  {weightDelta > 0 ? "+" : ""}
                  {weightDelta} KG SINCE {formatDay(first.log_date).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleLogWeight} className="flex gap-2 mt-5">
            <input
              type="number"
              step="0.1"
              min="0"
              inputMode="decimal"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder="TODAY'S WEIGHT (KG)"
              aria-label="Today's weight in kilograms"
              className={`${inputClass} flex-1 font-stats`}
            />
            <button
              type="submit"
              disabled={weightSaving || !weightInput}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-400 text-black font-black text-[10px] uppercase rounded-xl tracking-widest cursor-pointer disabled:opacity-50 active:scale-95 transition"
            >
              {weightSaving ? "..." : "LOG"}
            </button>
          </form>
          {weightMessage && (
            <p className="mt-2 text-[9px] font-black tracking-wider text-slate-400 uppercase">{weightMessage}</p>
          )}

          <div className="mt-5 h-48 -mx-2">
            {weightLogs.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightLogs} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="log_date"
                    tickFormatter={formatDay}
                    tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                    tickLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    domain={[(min) => Math.floor(min - 0.5), (max) => Math.ceil(max + 0.5)]}
                    tickFormatter={(v) => Number(v).toFixed(1)}
                    tickCount={4}
                    tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    content={<WeightTooltip />}
                    cursor={{ stroke: "rgba(0,240,255,0.35)", strokeWidth: 1, strokeDasharray: "3 3" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight_kg"
                    stroke="#00F0FF"
                    strokeWidth={2}
                    dot={weightLogs.length <= 31 ? { r: 3, fill: "#00F0FF", stroke: "#121216", strokeWidth: 2 } : false}
                    activeDot={{ r: 5, fill: "#00F0FF", stroke: "#121216", strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-center border border-dashed border-slate-800 rounded-2xl mx-2 px-4">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">
                  LOG YOUR WEIGHT ON TWO OR MORE DAYS TO SEE THE TREND.
                </p>
              </div>
            )}
          </div>

          {weightLogs.length > 0 && (
            <ul className="mt-4 divide-y divide-white/5 max-h-32 overflow-y-auto pr-1" aria-label="Recent weight entries">
              {[...weightLogs].reverse().slice(0, 7).map((w) => (
                <li key={w.log_date} className="py-1.5 flex justify-between text-[10px] font-bold uppercase">
                  <span className="text-slate-500">{formatDay(w.log_date)}</span>
                  <span className="text-slate-200 font-stats">{w.weight_kg} KG</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* TODAY'S ENTRIES EDITOR */}
      <section className="depth-card depth-elevated bg-slate-900/95 border border-white/[0.08] rounded-3xl p-6 sm:p-8">
        <SectionHeader
          eyebrow={isToday ? "CORRECT TODAY'S LOG" : `CORRECT LOG FOR ${date}`}
          title="LOGGED ENTRIES"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <h3 className="text-[10px] font-black tracking-[0.25em] text-slate-400 uppercase mb-3">MEALS</h3>
            {log.meals && log.meals.length > 0 ? (
              <ul className="divide-y divide-white/5">
                {log.meals.map((meal, idx) => (
                  <li key={meal.id || idx} className="py-3">
                    {editingMealIdx === idx ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={mealDraft.name ?? ""}
                          onChange={(e) => setMealDraft((d) => ({ ...d, name: e.target.value }))}
                          className={`${inputClass} uppercase`}
                          aria-label="Meal name"
                        />
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            ["calories", "KCAL", "1"],
                            ["protein_g", "P (G)", "0.1"],
                            ["carbs_g", "C (G)", "0.1"],
                            ["fat_g", "F (G)", "0.1"],
                          ].map(([key, label, step]) => (
                            <label key={key} className="block">
                              <span className="block text-[8px] font-black tracking-[0.2em] text-slate-500 uppercase mb-1">{label}</span>
                              <input
                                type="number"
                                step={step}
                                min="0"
                                value={mealDraft[key] ?? ""}
                                onChange={(e) => setMealDraft((d) => ({ ...d, [key]: e.target.value }))}
                                className={`${inputClass} font-stats`}
                              />
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setEditingMealIdx(null)}
                            disabled={mealSaving}
                            className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white text-[9px] font-black tracking-widest uppercase cursor-pointer"
                          >
                            CANCEL
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveMeal(meal, idx)}
                            disabled={mealSaving}
                            className="px-3 py-1.5 rounded-lg bg-cyan-400 text-black text-[9px] font-black tracking-widest uppercase cursor-pointer disabled:opacity-50"
                          >
                            {mealSaving ? "SAVING..." : "SAVE"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-black text-white uppercase truncate">{meal.name}</div>
                          <div className="text-[9px] font-bold text-slate-500 uppercase mt-0.5 font-stats">
                            {meal.calories} KCAL • P {meal.protein_g}G • C {meal.carbs_g}G • F {meal.fat_g}G
                          </div>
                        </div>
                        {meal.id && (
                          <button
                            type="button"
                            onClick={() => startEditMeal(meal, idx)}
                            className="flex-shrink-0 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-cyan-400 text-cyan-300 text-[9px] font-black tracking-widest uppercase cursor-pointer transition"
                          >
                            ✎ EDIT
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider py-4">NO MEALS LOGGED FOR THIS DAY.</p>
            )}
          </div>

          <form onSubmit={handleSaveTrackers} className="lg:col-span-4 space-y-3 p-4 rounded-2xl bg-black/40 border border-slate-800 self-start">
            <h3 className="text-[10px] font-black tracking-[0.25em] text-slate-400 uppercase">WATER & STEPS</h3>
            <label className="block">
              <span className="block text-[8px] font-black tracking-[0.2em] text-slate-500 uppercase mb-1">WATER (ML)</span>
              <input
                type="number"
                min="0"
                step="25"
                value={waterDraft}
                onChange={(e) => setWaterDraft(e.target.value)}
                className={`${inputClass} font-stats`}
              />
            </label>
            <label className="block">
              <span className="block text-[8px] font-black tracking-[0.2em] text-slate-500 uppercase mb-1">STEPS</span>
              <input
                type="number"
                min="0"
                step="1"
                value={stepsDraft}
                onChange={(e) => setStepsDraft(e.target.value)}
                className={`${inputClass} font-stats`}
              />
            </label>
            <button
              type="submit"
              disabled={trackerSaving}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-400 text-black font-black text-[10px] uppercase rounded-xl tracking-widest cursor-pointer disabled:opacity-50 active:scale-[0.98] transition"
            >
              {trackerSaving ? "SAVING..." : "SAVE CORRECTIONS"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
