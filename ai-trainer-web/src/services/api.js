const API_BASE_URL = "http://127.0.0.1:8000";

// Helper to retrieve auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const api = {
  // 1. Auth Operations
  register: async (email, password) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Registration failed");
    }
    return res.json();
  },

  login: async (email, password) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Login failed");
    }
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem("token", data.access_token);
    }
    if (data.user && data.user.email) {
      localStorage.setItem("userEmail", data.user.email);
    }
    return data;
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
  },

  // 2. Profile Details
  saveProfile: async (profileData) => {
    const res = await fetch(`${API_BASE_URL}/api/profile`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to save profile details");
    }
    return res.json();
  },

  getProfile: async () => {
    const res = await fetch(`${API_BASE_URL}/api/profile`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to load profile details");
    }
    return res.json();
  },

  // 3. Daily Logs & Habit Tracker Data
  getDailyLog: async (dateStr) => {
    const res = await fetch(`${API_BASE_URL}/api/logs/daily?date=${dateStr}`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to load daily dashboard data");
    }
    return res.json();
  },

  updateTrackers: async (trackerData) => {
    const res = await fetch(`${API_BASE_URL}/api/logs/trackers`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(trackerData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to update trackers");
    }
    return res.json();
  },

  logMeal: async (mealData) => {
    const res = await fetch(`${API_BASE_URL}/api/logs/meals`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(mealData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to log meal");
    }
    return res.json();
  },

  // Fetch exercises based on selected daily workout split
  getWorkoutsBySplit: async (splitName) => {
    const res = await fetch(
      `${API_BASE_URL}/api/workouts?split=${encodeURIComponent(splitName)}`,
      {
        method: "GET",
        headers: getAuthHeaders(),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to load workout protocols");
    }
    return res.json();
  },

  // AI Meal Suggestion Engine
  getAiMealSuggestion: async (macroPayload) => {
    // Safely map incoming variables to match backend Pydantic schema MealSuggestionRequest
    const mappedPayload = {
      calories: Math.round(Number(macroPayload.calories ?? macroPayload.remainingCalories ?? 0)),
      protein_g: Number(macroPayload.protein_g ?? macroPayload.protein ?? 0),
      carbs_g: Number(macroPayload.carbs_g ?? macroPayload.carbs ?? 0),
      fat_g: Number(macroPayload.fat_g ?? macroPayload.fat ?? 0),
      fitness_goals: macroPayload.fitness_goals || macroPayload.goals || "Hypertrophy",
    };

    const res = await fetch(`${API_BASE_URL}/api/ai/meal-suggestion`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(mappedPayload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "AI failed to compile suggestions");
    }
    return res.json();
  },
};