from fastapi import FastAPI, HTTPException, Depends, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from app.services.supabase_client import supabase_auth, supabase_db
from datetime import date as date_type
from typing import List, Optional

app = FastAPI(
    title="AuraTrainer Core Backend",
    description="Secure Python FastAPI endpoint router with RLS-Bypass DB clients"
)

# Explicit localhost origins for CORS with credentials
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        response = supabase_auth.auth.get_user(token)
        if not response or not response.user:
            raise ValueError("Invalid user session")
        return response.user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )

# --- SCHEMAS ---

class UserAuth(BaseModel):
    email: EmailStr
    password: str

class ProfileOnboarding(BaseModel):
    name: str
    age: int
    height_cm: float
    weight_kg: float
    body_type: str
    fitness_goals: str
    target_calories: int = 2000
    target_protein_g: float = 150.0
    target_carbs_g: float = 200.0
    target_fat_g: float = 65.0
    target_water_ml: int = 3000
    target_steps: int = 10000

class TrackerUpdate(BaseModel):
    date: date_type
    weight_today: Optional[float] = None
    steps: Optional[int] = None
    water_intake_ml: Optional[int] = None
    workout_completed: Optional[bool] = None
    diet_met: Optional[bool] = None
    water_met: Optional[bool] = None
    steps_met: Optional[bool] = None
    workout_split: Optional[str] = None
    completed_exercises: Optional[List[str]] = None

class MealLog(BaseModel):
    date: date_type
    name: str
    calories: int
    protein_g: float
    carbs_g: float
    fat_g: float
    logged_at: str

class MealSuggestionRequest(BaseModel):
    calories: int
    protein_g: float
    carbs_g: float
    fat_g: float
    fitness_goals: str = "Hypertrophy"

# --- CORE USER ROUTES ---

@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
async def register_user(user: UserAuth):
    try:
        response = supabase_auth.auth.sign_up({"email": user.email, "password": user.password})
        user_id = response.user.id if response.user else None
        return {"message": "User registered successfully!", "user_id": user_id}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.post("/api/auth/login")
async def login_user(user: UserAuth):
    try:
        response = supabase_auth.auth.sign_in_with_password({"email": user.email, "password": user.password})
        return {
            "access_token": response.session.access_token,
            "token_type": "bearer",
            "user": {"id": response.user.id, "email": response.user.email}
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

@app.post("/api/profile")
async def save_user_profile(profile_data: ProfileOnboarding, current_user = Depends(get_current_user)):
    try:
        response = supabase_db.table("profiles").upsert({
            "id": current_user.id,
            "email": current_user.email,
            "name": profile_data.name,
            "age": profile_data.age,
            "height_cm": profile_data.height_cm,
            "weight_kg": profile_data.weight_kg,
            "body_type": profile_data.body_type,
            "fitness_goals": profile_data.fitness_goals,
            "target_calories": profile_data.target_calories,
            "target_protein_g": profile_data.target_protein_g,
            "target_carbs_g": profile_data.target_carbs_g,
            "target_fat_g": profile_data.target_fat_g,
            "target_water_ml": profile_data.target_water_ml,
            "target_steps": profile_data.target_steps,
        }).execute()
        return {"status": "Profile saved!", "data": next(iter(response.data), {})}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.get("/api/profile")
async def get_user_profile(current_user = Depends(get_current_user)):
    try:
        response = supabase_db.table("profiles").select("*").eq("id", current_user.id).execute()
        return next(iter(response.data), {})
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

# --- WORKOUT ENGINE ENDPOINT ---

@app.get("/api/workouts")
async def get_workouts_by_split(split: str = Query(..., description="PUSH DAY, PULL DAY, or LEG DAY")):
    """
    Returns the exercise protocol details based on selected daily tracking parameters.
    """
    splits_catalog = {
        "PUSH DAY": [
            {"name": "Incline Barbell Bench Press", "sets": 4, "reps": "8-10", "weight": "60-80kg"},
            {"name": "Dumbbell Overhead Shoulder Press", "sets": 3, "reps": "10-12", "weight": "20kg each"},
            {"name": "Cable Pec Flyes", "sets": 3, "reps": "12-15", "weight": "15kg each"},
            {"name": "Tricep Overhead Rope Pullovers", "sets": 4, "reps": "12", "weight": "25kg"}
        ],
        "PULL DAY": [
            {"name": "Deadlift / Bent-Over Rows", "sets": 4, "reps": "6-8", "weight": "100kg / 70kg"},
            {"name": "Wide Grip Pull-Ups", "sets": 3, "reps": "Bodyweight MAX", "weight": "0kg"},
            {"name": "Seated Hammer Strength Cable Rows", "sets": 3, "reps": "10", "weight": "45kg"},
            {"name": "Incline Dumbbell Hammer Curls", "sets": 3, "reps": "12", "weight": "12.5kg each"}
        ],
        "LEG DAY": [
            {"name": "Barbell Back Squats", "sets": 4, "reps": "6-8", "weight": "80-110kg"},
            {"name": "Romanian Dumbbell Deadlifts", "sets": 3, "reps": "10", "weight": "30kg each"},
            {"name": "Standing Calf Raises", "sets": 4, "reps": "15-20", "weight": "40kg"},
            {"name": "Hanging Knee Raises (Abs)", "sets": 3, "reps": "15", "weight": "Bodyweight"}
        ],
        "REST / RECOVERY": []
    }
    
    clean_split = split.upper().strip()
    if clean_split == "PUSH":
        clean_split = "PUSH DAY"
    elif clean_split == "PULL":
        clean_split = "PULL DAY"
    elif clean_split in ("LEG", "LEGS"):
        clean_split = "LEG DAY"
    elif clean_split in ("REST", "RECOVERY"):
        clean_split = "REST / RECOVERY"

    return splits_catalog.get(clean_split, [])

# --- TRACKING & HABIT ENDPOINTS ---

@app.get("/api/logs/daily")
async def get_daily_log(date: date_type, current_user = Depends(get_current_user)):
    date_str = str(date)
    try:
        res = supabase_db.table("daily_logs").select("*").eq("user_id", current_user.id).eq("date", date_str).execute()
        if res.data and len(res.data) > 0:
            return next(iter(res.data))
            
        new_log = {
            "user_id": current_user.id,
            "date": date_str,
            "weight_today": None,
            "steps": 0,
            "water_intake_ml": 0,
            "meals": [],
            "completed_exercises": [],
            "workout_split": "REST / RECOVERY",
            "workout_completed": False,
            "diet_met": False,
            "water_met": False,
            "steps_met": False
        }
        insert_res = supabase_db.table("daily_logs").insert(new_log).execute()
        return next(iter(insert_res.data), new_log)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.post("/api/logs/trackers")
async def update_trackers(tracker_data: TrackerUpdate, current_user = Depends(get_current_user)):
    date_str = str(tracker_data.date)
    try:
        update_payload = {}
        for field, val in tracker_data.model_dump(exclude_unset=True).items():
            if field != "date" and val is not None:
                update_payload[field] = val

        if not update_payload:
            raise HTTPException(status_code=400, detail="No values provided to update.")

        # Ensure daily log exists first
        existing = supabase_db.table("daily_logs").select("id").eq("user_id", current_user.id).eq("date", date_str).execute()
        if not existing.data:
            # Create initialized row then update
            init_row = {
                "user_id": current_user.id,
                "date": date_str,
                "weight_today": None,
                "steps": 0,
                "water_intake_ml": 0,
                "meals": [],
                "completed_exercises": [],
                "workout_split": "REST / RECOVERY",
                "workout_completed": False,
                "diet_met": False,
                "water_met": False,
                "steps_met": False
            }
            init_row.update(update_payload)
            insert_res = supabase_db.table("daily_logs").insert(init_row).execute()
            return {"status": "Trackers saved!", "data": next(iter(insert_res.data), init_row)}

        res = supabase_db.table("daily_logs").update(update_payload).eq("user_id", current_user.id).eq("date", date_str).execute()
        return {"status": "Trackers saved!", "data": next(iter(res.data), {})}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.post("/api/logs/meals")
async def log_meal(meal_data: MealLog, current_user = Depends(get_current_user)):
    date_str = str(meal_data.date)
    try:
        res = supabase_db.table("daily_logs").select("meals").eq("user_id", current_user.id).eq("date", date_str).execute()
        if not res.data:
            # Initialize daily log if not yet present
            current_meals = []
            new_meal = meal_data.model_dump()
            new_meal["id"] = f"m_{len(current_meals) + 1}"
            new_meal["date"] = str(new_meal["date"])
            current_meals.append(new_meal)
            
            init_row = {
                "user_id": current_user.id,
                "date": date_str,
                "weight_today": None,
                "steps": 0,
                "water_intake_ml": 0,
                "meals": current_meals,
                "completed_exercises": [],
                "workout_split": "REST / RECOVERY",
                "workout_completed": False,
                "diet_met": False,
                "water_met": False,
                "steps_met": False
            }
            insert_res = supabase_db.table("daily_logs").insert(init_row).execute()
            return {"status": "Meal logged!", "data": next(iter(insert_res.data), {})}

        first_row = next(iter(res.data), {})
        current_meals = first_row.get("meals", []) or []
        
        new_meal = meal_data.model_dump()
        new_meal["id"] = f"m_{len(current_meals) + 1}"
        new_meal["date"] = str(new_meal["date"])
        current_meals.append(new_meal)
        
        update_res = supabase_db.table("daily_logs").update({"meals": current_meals}).eq("user_id", current_user.id).eq("date", date_str).execute()
        return {"status": "Meal logged!", "data": next(iter(update_res.data), {})}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

# --- AI MEAL RECOMMENDATIONS ENGINE ---

@app.post("/api/ai/meal-suggestion")
async def suggest_meal(request: MealSuggestionRequest):
    """
    Processes user remaining targets and suggests an anabolic custom recipe.
    """
    calories = max(100, request.calories)
    protein = request.protein_g
    carbs = request.carbs_g
    fat = request.fat_g
    goals = request.fitness_goals or "Hypertrophy"
    
    # Dynamic mathematical model parsing remaining goals to build custom recipes
    if protein > 30:
        recipe = {
            "name": "Seared Lemon Herb Tuna Fillet",
            "calories": max(250, int(calories * 0.45)),
            "protein": round(max(25.0, protein), 1),
            "carbs": round(max(5.0, carbs * 0.2), 1),
            "fat": round(max(4.0, fat * 0.25), 1),
            "instructions": f"Sear 180g fresh tuna on high heat for 2 mins each side. Season with lemon, crushed black pepper, and coarse sea salt to hit your {protein:.0f}g protein target!"
        }
    elif carbs > 40:
        recipe = {
            "name": "Anabolic Berry Oatmeal Mash",
            "calories": max(300, int(calories * 0.4)),
            "protein": 28.0,
            "carbs": round(max(30.0, carbs), 1),
            "fat": 6.0,
            "instructions": f"Mash 1 ripe banana with 80g quick oats, 1 scoop whey isolate, and warm almond milk. Stir in fresh blueberries for immediate glycogen replenishment ({goals})."
        }
    elif goals == "Fat Loss":
        recipe = {
            "name": "Grilled Chicken & Asparagus Skillet",
            "calories": max(280, int(calories * 0.35)),
            "protein": 38.0,
            "carbs": 12.0,
            "fat": 7.0,
            "instructions": "Pan-sear 180g skinless chicken breast with 100g green asparagus and cherry tomatoes in 1 tsp olive oil with smoked paprika and garlic."
        }
    else:
        recipe = {
            "name": "Avocado & Egg White Sourdough Toast",
            "calories": 340,
            "protein": 24.0,
            "carbs": 28.0,
            "fat": 12.0,
            "instructions": "Toast 1 slice artisanal sourdough. Spread 60g ripe mashed avocado. Scramble 4 egg whites with 1 whole egg and finish with cracked red pepper flakes."
        }
    return recipe