import React, { useState } from "react";
import { api } from "../services/api";

export default function LoginRegister({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        onAuthSuccess(data.access_token);
      } else {
        await api.register(email, password);
        setMessage("REGISTRATION SUCCESSFUL! SWITCHING TO LOGIN...");
        setIsLogin(true);
        setPassword("");
      }
    } catch (err) {
      setError(err.message || "AN UNEXPECTED ERROR OCCURRED");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Premium Athletic Blue Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md bg-[#0a0a0c] border border-slate-900 rounded-3xl p-8 shadow-[0_0_50px_rgba(0,82,255,0.15)] relative z-10">
        <div className="text-center mb-10">
          <span className="text-[10px] font-black tracking-[0.2em] text-cyan-400 bg-cyan-950/50 px-4 py-1.5 rounded-full border border-cyan-800/50 uppercase">
            AuraTrainer Engine
          </span>
          <h1 className="text-4xl font-black italic tracking-tighter text-white mt-6 uppercase leading-none">
            {isLogin ? "READY TO\nPUSH?" : "JOIN THE\nCLUB."}
          </h1>
          <p className="text-slate-500 mt-3 text-xs font-medium uppercase tracking-wider">
            {isLogin ? "Enter details to access your daily stats" : "Begin your personalized training journey"}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-950/30 border-l-4 border-red-500 text-red-200 text-xs font-bold tracking-wide rounded-r-lg uppercase">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 bg-blue-950/30 border-l-4 border-cyan-400 text-cyan-200 text-xs font-bold tracking-wide rounded-r-lg uppercase">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-slate-400 text-xs font-bold tracking-widest uppercase mb-2">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-4 bg-black border border-slate-800 rounded-2xl text-slate-100 placeholder-slate-700 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
              placeholder="YOUR@EMAIL.COM"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-bold tracking-widest uppercase mb-2">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 bg-black border border-slate-800 rounded-2xl text-slate-100 placeholder-slate-700 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-black font-black text-xs tracking-widest uppercase rounded-2xl transition duration-300 transform active:scale-[0.98] disabled:opacity-50 shadow-[0_4px_20px_rgba(0,240,255,0.25)]"
          >
            {loading ? "PROCESSING..." : isLogin ? "SIGN IN →" : "CREATE ACCOUNT →"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
              setMessage("");
            }}
            className="text-xs font-bold uppercase tracking-widest text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            {isLogin ? "NEW USER? CREATE A PROFILE" : "ALREADY REGISTERED? LOG IN"}
          </button>
        </div>
      </div>
    </div>
  );
}