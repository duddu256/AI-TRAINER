import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { api } from "../services/api";

export default function LoginRegister({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (isLogin) {
        const data = await api.login(email, password);
        if (stayLoggedIn) {
          localStorage.setItem("stayLoggedIn", "true");
        } else {
          sessionStorage.setItem("sessionOnly", "true");
        }
        onAuthSuccess(data.access_token);
      } else {
        // Register & immediately authenticate
        await api.register(email, password);
        const data = await api.login(email, password);
        if (stayLoggedIn) {
          localStorage.setItem("stayLoggedIn", "true");
        }
        onAuthSuccess(data.access_token);
      }
    } catch (err) {
      setError(err.message || "AN UNEXPECTED AUTHENTICATION ERROR OCCURRED");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans select-none">
      {/* Athletic Blue & Cyan Ambient Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/15 blur-[140px] rounded-full pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-400/15 blur-[140px] rounded-full pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-700/5 blur-[180px] rounded-full pointer-events-none"></div>

      {/* Main Glass/Charcoal Card */}
      <div className="w-full max-w-md bg-[#0a0a0c] border border-[#1a1a24] rounded-3xl p-8 sm:p-10 shadow-[0_0_60px_rgba(0,82,255,0.12)] relative z-10">

        {/* Athletic Badge & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 text-[10px] font-black tracking-[0.25em] uppercase shadow-[0_0_12px_rgba(0,240,255,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
            AURATRAINER // PERFORMANCE OS
          </div>

          <h1 className="text-4xl sm:text-5xl font-black italic tracking-tighter text-white mt-5 uppercase leading-none">
            {isLogin ? (
              <>
                READY TO <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0052FF] via-cyan-400 to-[#00F0FF]">
                  PUSH?
                </span>
              </>
            ) : (
              <>
                JOIN THE <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0052FF] via-cyan-400 to-[#00F0FF]">
                  ELITE CLUB.
                </span>
              </>
            )}
          </h1>

          <p className="text-slate-500 mt-3 text-xs font-semibold uppercase tracking-wider">
            {isLogin
              ? "AUTHENTICATE TO ACCESS YOUR TRAINING & DIET PROTOCOLS"
              : "INITIALIZE YOUR PERFORMANCE DATA PIPELINE"}
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-500/50 rounded-2xl text-red-200 text-xs font-semibold leading-relaxed shadow-[0_0_20px_rgba(239,68,68,0.15)]">
            <div className="flex items-center gap-2 text-red-400 font-black tracking-wider uppercase mb-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              {error.includes("DATABASE") ? "DATABASE STATUS NOTICE" : "AUTHENTICATION NOTICE"}
            </div>
            <p className="text-slate-300 font-mono text-[11px] mb-2">{error}</p>
            {error.includes("supabase.com") && (
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-bold text-[10px] tracking-wider uppercase transition cursor-pointer mt-1"
              >
                OPEN SUPABASE DASHBOARD →
              </a>
            )}
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 bg-cyan-950/30 border-l-4 border-cyan-400 text-cyan-200 text-xs font-bold tracking-wide rounded-r-xl uppercase">
            {message}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-slate-400 text-[10px] font-black tracking-[0.2em] uppercase mb-2">
              ATHLETE EMAIL
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-4 bg-black border border-slate-900 rounded-2xl text-slate-100 placeholder-slate-700 font-medium focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all text-sm uppercase tracking-wide"
              placeholder="ATHLETE@AURATRAINER.COM"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-[10px] font-black tracking-[0.2em] uppercase mb-2">
              SECRET PASSCODE
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-5 pr-14 py-4 bg-black border border-slate-900 rounded-2xl text-slate-100 placeholder-slate-700 font-medium focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all text-sm"
                placeholder="••••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 hover:text-cyan-400 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Stay Logged In Toggle */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-400 uppercase tracking-wider select-none">
              <input
                type="checkbox"
                checked={stayLoggedIn}
                onChange={(e) => setStayLoggedIn(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-900 border-slate-800 text-cyan-400 focus:ring-cyan-400 focus:ring-offset-0 cursor-pointer accent-cyan-400"
              />
              <span>STAY LOGGED IN ON THIS DEVICE</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-2 bg-gradient-to-r from-[#0052FF] to-[#00F0FF] hover:from-blue-500 hover:to-cyan-300 text-black font-black text-xs tracking-[0.25em] uppercase rounded-2xl transition duration-300 transform active:scale-[0.98] disabled:opacity-50 shadow-[0_0_25px_rgba(0,240,255,0.3)] flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
          >
            {loading ? (
              <span className="animate-pulse">AUTHENTICATING...</span>
            ) : isLogin ? (
              <span>SIGN IN TO CONSOLE →</span>
            ) : (
              <span>CREATE & LAUNCH ATHLETE PROFILE →</span>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-8 pt-6 border-t border-slate-900 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
              setMessage("");
            }}
            className="text-xs font-black uppercase tracking-widest text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
          >
            {isLogin
              ? "NEW ATHLETE? INITIALIZE PROFILE →"
              : "EXISTING ATHLETE? LOG IN →"}
          </button>
        </div>
      </div>
    </div>
  );
}