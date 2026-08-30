const rawApiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_BASE_URL = rawApiUrl.replace(/\/+$/, "");

// Helper to retrieve auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Resilient authenticated fetch with transparent token refresh
const authFetch = async (url, options = {}) => {
  let headers = {
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };

  let response = await fetch(url, { ...options, headers });

  // If unauthorized and we have a refresh token, attempt automatic silent session refresh
  if (response.status === 401) {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          if (refreshData.access_token) {
            localStorage.setItem("token", refreshData.access_token);
            if (refreshData.refresh_token) {
              localStorage.setItem("refreshToken", refreshData.refresh_token);
            }
            // Retry original request with fresh token
            headers["Authorization"] = `Bearer ${refreshData.access_token}`;
            response = await fetch(url, { ...options, headers });
          }
        }
      } catch (refreshErr) {
        console.warn("Silent session refresh failed:", refreshErr);
      }
    }
  }

  return response;
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
    if (data.refresh_token) {
      localStorage.setItem("refreshToken", data.refresh_token);
    }
    if (data.user && data.user.email) {
      localStorage.setItem("userEmail", data.user.email);
    }
    return data;
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("stayLoggedIn");
    sessionStorage.clear();
  },

  // 2. Profile Details
  saveProfile: async (profileData) => {
    const res = await authFetch(`${API_BASE_URL}/api/profile`, {
      method: "POST",
      body: JSON.stringify(profileData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to save profile details");
    }
    return res.json();
  },

  getProfile: async () => {
    const res = await authFetch(`${API_BASE_URL}/api/profile`, {
      method: "GET",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to load profile details");
    }
    return res.json();
  },

  // 3. Daily Logs & Habit Tracker Data
  getDailyLog: async (dateStr) => {
    const res = await authFetch(`${API_BASE_URL}/api/logs/daily?date=${dateStr}`, {
      method: "GET",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to load daily dashboard data");
    }
    return res.json();
  },

  updateTrackers: async (trackerData) => {
    const res = await authFetch(`${API_BASE_URL}/api/logs/trackers`, {
      method: "POST",
      body: JSON.stringify(trackerData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to update trackers");
    }
    return res.json();
  },

  logMeal: async (mealData) => {
    const res = await authFetch(`${API_BASE_URL}/api/logs/meals`, {
      method: "POST",
      body: JSON.stringify(mealData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to log meal");
    }
    return res.json();
  },

  // 4. Workout Engine & Vector Progressive Overload (Module 2)
  getWorkoutsBySplit: async (splitName) => {
    const res = await authFetch(
      `${API_BASE_URL}/api/workouts?split=${encodeURIComponent(splitName)}`,
      { method: "GET" }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to load workout protocols");
    }
    return res.json();
  },

  getProgressionTarget: async (exerciseName) => {
    const res = await authFetch(
      `${API_BASE_URL}/api/workouts/progression-target?exercise_name=${encodeURIComponent(exerciseName)}`,
      { method: "GET" }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to fetch progression target");
    }
    return res.json();
  },

  recordWorkoutPerformance: async (performanceData) => {
    const res = await authFetch(`${API_BASE_URL}/api/workouts/record-performance`, {
      method: "POST",
      body: JSON.stringify(performanceData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to record workout performance");
    }
    return res.json();
  },

  getCustomSplits: async () => {
    const res = await authFetch(`${API_BASE_URL}/api/workouts/custom-splits`, {
      method: "GET",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to fetch custom splits");
    }
    return res.json();
  },

  saveCustomSplits: async (splitsData) => {
    const res = await authFetch(`${API_BASE_URL}/api/workouts/custom-splits`, {
      method: "POST",
      body: JSON.stringify(splitsData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to save custom splits");
    }
    return res.json();
  },

  // 5. Gamification & Badges (Module 3)
  getBadges: async () => {
    const res = await authFetch(`${API_BASE_URL}/api/badges`, {
      method: "GET",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to load achievements");
    }
    return res.json();
  },

  // 6. AI Strategic & Natural Language Services (Module 1 & 4)
  parseFood: async (inputText) => {
    const res = await authFetch(`${API_BASE_URL}/api/ai/parse-food`, {
      method: "POST",
      body: JSON.stringify({ input_text: inputText }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "AI failed to parse food text");
    }
    return res.json();
  },
  parseFoodText: async (inputText) => api.parseFood(inputText),

  getAiMealSuggestion: async (suggestionRequest) => {
    const res = await authFetch(`${API_BASE_URL}/api/ai/meal-suggestion`, {
      method: "POST",
      body: JSON.stringify(suggestionRequest),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "AI meal suggestion failed");
    }
    return res.json();
  },

  planPantryMeals: async (pantryRequest) => {
    const res = await authFetch(`${API_BASE_URL}/api/ai/pantry-planner`, {
      method: "POST",
      body: JSON.stringify(pantryRequest),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Pantry planner AI failed");
    }
    return res.json();
  },

  // 7. Custom Saved Meals Operations (Module 1)
  getSavedMeals: async () => {
    const res = await authFetch(`${API_BASE_URL}/api/saved-meals`, {
      method: "GET",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to fetch saved meals");
    }
    return res.json();
  },

  saveMeal: async (mealData) => {
    const res = await authFetch(`${API_BASE_URL}/api/saved-meals`, {
      method: "POST",
      body: JSON.stringify(mealData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to save meal template");
    }
    return res.json();
  },
  createSavedMeal: async (mealData) => api.saveMeal(mealData),

  deleteSavedMeal: async (savedMealId) => {
    const res = await authFetch(`${API_BASE_URL}/api/saved-meals/${savedMealId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to delete saved meal");
    }
    return res.json();
  },
};