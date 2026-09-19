import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Home, RefreshCw, ShieldAlert, Cpu, CheckCircle2, XCircle } from "lucide-react";
import { API_BASE_URL } from "../services/api";

export default function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();
  const [healthStatus, setHealthStatus] = useState("checking"); // checking | online | offline
  const [isPinging, setIsPinging] = useState(false);

  const checkBackendHealth = async () => {
    setIsPinging(true);
    try {
      const res = await fetch(`${API_BASE_URL}/health`, { method: "GET" });
      if (res.ok) {
        setHealthStatus("online");
      } else {
        setHealthStatus("offline");
      }
    } catch {
      setHealthStatus("offline");
    } finally {
      setIsPinging(false);
    }
  };

  useEffect(() => {
    checkBackendHealth();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      {/* Background Decorative HUD Grids */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      <div className="absolute w-96 h-96 bg-red-500/5 rounded-full blur-3xl -top-20 -left-20 pointer-events-none" />
      <div className="absolute w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl -bottom-20 -right-20 pointer-events-none" />

      {/* Main Terminal HUD Box */}
      <div className="relative z-10 max-w-xl w-full bg-slate-900/90 border border-red-500/30 rounded-2xl p-8 sm:p-10 shadow-[0_0_50px_rgba(239,68,68,0.15)] backdrop-blur-xl">
        {/* Top Status Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="font-mono text-xs text-red-400 font-semibold tracking-widest uppercase">
              SECTOR 404 // DEAD END INTERCEPTED
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>AURATRAINER CORE</span>
          </div>
        </div>

        {/* 404 Big Glitch Title */}
        <div className="text-center my-4">
          <div className="inline-flex items-center justify-center p-3 bg-red-500/10 border border-red-500/30 rounded-2xl mb-4">
            <ShieldAlert className="w-12 h-12 text-red-400 animate-pulse" />
          </div>
          <h1 className="text-6xl sm:text-7xl font-black tracking-tight text-white font-mono">
            404
          </h1>
          <p className="mt-2 text-sm sm:text-base font-bold text-red-300 tracking-wider uppercase font-mono">
            TARGET ROUTE NOT RECOGNIZED
          </p>
        </div>

        {/* Diagnostic Path Box */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 my-6 font-mono text-xs space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span>REQUESTED PATH:</span>
            <span className="text-red-400 font-bold break-all">{location.pathname}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>DIAGNOSIS:</span>
            <span className="text-slate-300">Route coordinate unmapped in telemetry system</span>
          </div>
          <div className="flex justify-between items-center text-slate-400 pt-2 border-t border-slate-900">
            <span>BACKEND UPTIME:</span>
            <div className="flex items-center gap-1.5">
              {healthStatus === "checking" && <span className="text-amber-400">PINGING...</span>}
              {healthStatus === "online" && (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> API CONNECTED
                </span>
              )}
              {healthStatus === "offline" && (
                <span className="text-red-400 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> API OFFLINE
                </span>
              )}
              <button
                onClick={checkBackendHealth}
                disabled={isPinging}
                title="Refresh Status"
                className="text-slate-500 hover:text-slate-300 transition-colors ml-1 p-0.5"
              >
                <RefreshCw className={`w-3 h-3 ${isPinging ? "animate-spin text-cyan-400" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons: Return to Dashboard & Safe Navigation */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-8">
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-cyan-400 text-slate-950 hover:bg-cyan-300 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,211,238,0.3)] active:scale-95"
          >
            <Home className="w-4 h-4" />
            RETURN TO DASHBOARD
          </button>

          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            GO BACK
          </button>
        </div>

        {/* Bottom Safety Hint */}
        <div className="text-center mt-6">
          <p className="text-[11px] text-slate-400">
            Lost in telemetry? All active user modules (Workouts, Diet, Pantry AI, Profile) reside inside the{" "}
            <Link to="/dashboard" className="text-cyan-400 hover:underline">
              Main Dashboard
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
