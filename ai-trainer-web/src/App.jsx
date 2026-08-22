import React, { useState, useEffect, useCallback } from "react";
import LoginRegister from "./components/LoginRegister";
import Onboarding from "./components/Onboarding";
import Dashboard from "./components/Dashboard";
import { api } from "./services/api";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleLogout = useCallback(() => {
    api.logout();
    setToken(null);
    setNeedsOnboarding(false);
  }, []);

  const verifyUserSession = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // Fetch the user's profile immediately on startup/login
      const profile = await api.getProfile();
      
      // If they have no name or weight logged, they MUST onboard first
      if (!profile || !profile.name || !profile.weight_kg) {
        setNeedsOnboarding(true);
      } else {
        setNeedsOnboarding(false);
      }
    } catch (err) {
      console.error("Session check failed, logging out:", err);
      handleLogout();
    } finally {
      setLoading(false);
    }
  }, [token, handleLogout]);

  useEffect(() => {
    verifyUserSession();
  }, [verifyUserSession]);

  const handleAuthSuccess = (accessToken) => {
    setToken(accessToken);
    setLoading(true);
  };

  const handleOnboardingDone = () => {
    setNeedsOnboarding(false);
    setLoading(true);
    verifyUserSession();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center font-sans select-none">
        <div className="w-12 h-12 border-4 border-[#121218] border-t-cyan-400 rounded-full animate-spin mb-4 shadow-[0_0_20px_rgba(0,240,255,0.3)]"></div>
        <div className="text-cyan-400 font-black tracking-[0.3em] text-xs uppercase animate-pulse">
          INITIALIZING AURATRAINER ENGINE...
        </div>
      </div>
    );
  }

  // CHECKPOINT 1: If not logged in, force authentication
  if (!token) {
    return <LoginRegister onAuthSuccess={handleAuthSuccess} />;
  }

  // CHECKPOINT 2: If logged in but profile is missing, force onboarding
  if (needsOnboarding) {
    return <Onboarding onOnboardingComplete={handleOnboardingDone} />;
  }

  // CHECKPOINT 3: Fully logged in and onboarded -> Load Dashboard!
  return (
    <div className="relative min-h-screen bg-black">
      <div className="fixed top-4 right-6 z-50">
        <button
          onClick={handleLogout}
          className="px-3.5 py-1.5 bg-[#0a0a0c]/90 backdrop-blur-md border border-[#1a1a24] text-slate-400 hover:text-red-400 hover:border-red-900/50 text-[10px] font-black tracking-widest uppercase rounded-xl transition shadow-lg cursor-pointer"
        >
          DISCONNECT CONSOLE ⏻
        </button>
      </div>
      <Dashboard />
    </div>
  );
}