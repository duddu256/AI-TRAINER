import React, { useState, useEffect } from "react";
import LoginRegister from "./components/LoginRegister";
import Onboarding from "./components/Onboarding";
import Dashboard from "./components/Dashboard";
import { api } from "./services/api";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyUserSession = async () => {
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
    };

    verifyUserSession();
  }, [token]);

  const handleAuthSuccess = (accessToken) => {
    setToken(accessToken);
    // When registering or logging in fresh, trigger the session verification
    setLoading(true);
  };

  const handleLogout = () => {
    api.logout();
    setToken(null);
    setNeedsOnboarding(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-cyan-400 font-black animate-pulse tracking-widest uppercase">
          Initializing AuraTrainer...
        </div>
      </div>
    );
  }

  // CHECKPOINT 1: If not logged in, force them to authenticate
  if (!token) {
    return <LoginRegister onAuthSuccess={handleAuthSuccess} />;
  }

  // CHECKPOINT 2: If logged in but profile is missing, force onboarding
  if (needsOnboarding) {
    return <Onboarding onOnboardingComplete={() => setNeedsOnboarding(false)} />;
  }

  // CHECKPOINT 3: Fully logged in and onboarded -> Load Dashboard!
  return (
    <div className="relative">
      <button
        onClick={handleLogout}
        className="absolute top-4 right-4 z-50 px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-400 text-xs font-semibold rounded-lg hover:text-red-400 transition"
      >
        Sign Out
      </button>
      <Dashboard />
    </div>
  );
}