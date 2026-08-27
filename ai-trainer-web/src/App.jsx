import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginRegister from "./components/LoginRegister";
import Onboarding from "./components/Onboarding";
import Dashboard from "./components/Dashboard";
import { api } from "./services/api";

function AuthGuard({ children, token, handleLogout, needsOnboarding, handleAuthSuccess, handleOnboardingDone, loading }) {
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans select-none">
        <div className="w-12 h-12 border-4 border-slate-900 border-t-cyan-400 rounded-full animate-spin mb-4 shadow-[0_0_20px_rgba(0,240,255,0.3)]"></div>
        <div className="text-cyan-400 font-black tracking-[0.3em] text-xs uppercase animate-pulse">
          INITIALIZING AURATRAINER ENGINE...
        </div>
      </div>
    );
  }

  if (!token) {
    return <LoginRegister onAuthSuccess={handleAuthSuccess} />;
  }

  if (needsOnboarding) {
    return <Onboarding onOnboardingComplete={handleOnboardingDone} />;
  }

  return children;
}

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
      const profile = await api.getProfile();
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

  return (
    <BrowserRouter>
      <Routes>
        {/* All routes start directly with AuthGuard (Login -> Onboarding -> Dashboard) */}
        <Route
          path="/*"
          element={
            <AuthGuard
              token={token}
              handleLogout={handleLogout}
              needsOnboarding={needsOnboarding}
              handleAuthSuccess={handleAuthSuccess}
              handleOnboardingDone={handleOnboardingDone}
              loading={loading}
            >
              <Routes>
                <Route path="/" element={<Dashboard onLogout={handleLogout} />} />
                <Route path="/dashboard" element={<Dashboard onLogout={handleLogout} />} />
                <Route path="/food-log" element={<Navigate to="/dashboard" replace />} />
                <Route path="/workouts" element={<Navigate to="/dashboard" replace />} />
                <Route path="/pantry-ai" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </AuthGuard>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}