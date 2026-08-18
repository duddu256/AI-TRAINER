export const mockDailyDashboard = {
  date: "2026-08-07",
  user_profile: {
    name: "Alex",
    fitness_goals: "Hypertrophy and lean muscle growth",
    body_type: "Mesomorph"
  },
  trackers: {
    steps_count: 6200,
    water_intake_ml: 1500,
    weight_today: 75.2
  },
  targets: {
    steps: 10000,
    water_ml: 3000,
    calories: 2500,
    protein_g: 160,
    carbs_g: 265,
    fat_g: 85
  },
  meals_logged: [
    {
      id: "m1",
      name: "Oatmeal with Protein Powder & Banana",
      calories: 450,
      protein_g: 35.0,
      carbs_g: 60.0,
      fat_g: 7.0,
      logged_at: "08:30 AM"
    },
    {
      id: "m2",
      name: "Grilled Chicken and Rice Bowl",
      calories: 650,
      protein_g: 50.0,
      carbs_g: 75.0,
      fat_g: 12.0,
      logged_at: "01:15 PM"
    }
  ],
  streak_checklist: {
    workout_completed: false,
    diet_met: false,
    water_met: false,
    steps_met: false
  }
};
