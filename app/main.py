from fastapi import FastAPI, HTTPException, Depends, status, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from app.services.supabase_client import supabase_auth, supabase_db
from app.services.ai_service import (
    parse_food_string,
    generate_pantry_full_day_plan,
    generate_strategist_meal_suggestion
)
from app.services.saved_meals_service import (
    get_user_saved_meals,
    create_saved_meal,
    delete_saved_meal
)
from app.services.vector_memory_service import (
    record_workout_milestone,
    get_progression_target,
    get_user_custom_splits,
    save_user_custom_splits
)
from app.services.gamification_service import (
    get_user_badges,
    evaluate_streaks_and_milestones
)
from datetime import date as date_type
from typing import List, Optional, Dict, Any

app = FastAPI(
    title="AuraTrainer Core Backend // Phase 2 MVP",
    description="Advanced AI-Automated Athletic Training Engine with Vector Overload Memory and Gamification"
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
    prompt: Optional[str] = None

class ParseFoodRequest(BaseModel):
    input_text: str

class SavedMealCreate(BaseModel):
    name: str
    calories: int
    protein_g: float
    carbs_g: float
    fat_g: float

class RecordWorkoutPerformanceRequest(BaseModel):
    exercise_name: str
    sets: int
    reps: str
    weight: str
    date: date_type

class PantryPlannerRequest(BaseModel):
    ingredients: List[str]
    target_calories: int
    target_protein: float
    target_carbs: float
    target_fat: float
    meal_count: int = 3
    body_type: Optional[str] = "Mesomorph"
    fitness_goals: Optional[str] = "Hypertrophy"

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

# --- WORKOUT ENGINE & VECTOR MEMORY ENDPOINTS ---

@app.get("/api/workouts")
async def get_workouts_by_split(
    split: str = Query(..., description="PUSH DAY, PULL DAY, LEG DAY, or custom split name"),
    current_user = Depends(get_current_user)
):
    """
    Returns exercise protocols from standard catalog or custom split templates.
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

    if clean_split in splits_catalog:
        return splits_catalog[clean_split]

    # Check custom user splits
    custom_splits = get_user_custom_splits(current_user.id)
    for s_name, exercises in custom_splits.items():
        if s_name.upper().strip() == clean_split:
            return exercises

    return []

@app.get("/api/workouts/progression-target")
async def get_exercise_progression_target(
    exercise_name: str = Query(..., description="Name of the exercise"),
    current_user = Depends(get_current_user)
):
    """
    Module 2: Queries Vector memory for previous performances and outputs targeted progressive overload.
    """
    target = get_progression_target(current_user.id, exercise_name)
    return target

@app.post("/api/workouts/record-performance")
async def record_exercise_performance(
    payload: RecordWorkoutPerformanceRequest,
    current_user = Depends(get_current_user)
):
    """
    Module 2: Upserts performance summary string into vector memory.
    """
    entry = record_workout_milestone(
        user_id=current_user.id,
        exercise_name=payload.exercise_name,
        sets=payload.sets,
        reps=payload.reps,
        weight=payload.weight,
        date_str=str(payload.date)
    )
    return {"status": "Performance recorded to Vector RAG Memory", "entry": entry}

@app.get("/api/workouts/custom-splits")
async def get_custom_splits_endpoint(current_user = Depends(get_current_user)):
    """
    Module 2: Returns custom split templates for user.
    """
    return get_user_custom_splits(current_user.id)

@app.post("/api/workouts/custom-splits")
async def save_custom_splits_endpoint(
    splits: Dict[str, List[Dict[str, Any]]] = Body(...),
    current_user = Depends(get_current_user)
):
    """
    Module 2: Saves custom split templates.
    """
    saved = save_user_custom_splits(current_user.id, splits)
    return {"status": "Custom splits updated", "splits": saved}

# --- SAVED MEALS CRUD (MODULE 1) ---

@app.get("/api/saved-meals")
async def list_saved_meals(current_user = Depends(get_current_user)):
    """
    Module 1: Returns user's saved meal templates.
    """
    return get_user_saved_meals(current_user.id)

@app.post("/api/saved-meals", status_code=status.HTTP_201_CREATED)
async def create_saved_meal_endpoint(
    meal: SavedMealCreate,
    current_user = Depends(get_current_user)
):
    """
    Module 1: Creates a reusable saved meal template.
    """
    created = create_saved_meal(current_user.id, meal.model_dump())
    return {"status": "Meal template saved!", "meal": created}

@app.delete("/api/saved-meals/{meal_id}")
async def delete_saved_meal_endpoint(
    meal_id: str,
    current_user = Depends(get_current_user)
):
    """
    Module 1: Deletes a saved meal template.
    """
    success = delete_saved_meal(current_user.id, meal_id)
    return {"status": "Deleted successfully", "success": success}

# --- AI NATURAL LANGUAGE FOOD PARSER & PANTRY (MODULE 1 & 4) ---

@app.post("/api/ai/parse-food")
async def parse_food_endpoint(payload: ParseFoodRequest):
    """
    Module 1: Parses natural language food text string into structured macro breakdown.
    """
    result = parse_food_string(payload.input_text)
    return result

@app.post("/api/ai/pantry-planner")
async def pantry_planner_endpoint(payload: PantryPlannerRequest):
    """
    Module 4: Full-day nutrition protocol planner based on kitchen inventory and remaining macros.
    """
    plan = generate_pantry_full_day_plan(
        ingredients=payload.ingredients,
        target_calories=payload.target_calories,
        target_protein=payload.target_protein,
        target_carbs=payload.target_carbs,
        target_fat=payload.target_fat,
        body_type=payload.body_type or "Mesomorph",
        fitness_goals=payload.fitness_goals or "Hypertrophy",
        meal_count=payload.meal_count
    )
    return plan

# --- GAMIFICATION & ACHIEVEMENTS (MODULE 3) ---

@app.get("/api/badges")
async def get_badges_endpoint(current_user = Depends(get_current_user)):
    """
    Module 3: Returns all badges with user's unlock statuses and timestamps.
    """
    return get_user_badges(current_user.id)

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
            saved_data = next(iter(insert_res.data), init_row)
        else:
            res = supabase_db.table("daily_logs").update(update_payload).eq("user_id", current_user.id).eq("date", date_str).execute()
            saved_data = next(iter(res.data), {})

        # Evaluate streak badges in real-time
        newly_unlocked = evaluate_streaks_and_milestones(current_user.id)

        return {
            "status": "Trackers saved!",
            "data": saved_data,
            "newly_unlocked_badges": newly_unlocked
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.post("/api/logs/meals")
async def log_meal(meal_data: MealLog, current_user = Depends(get_current_user)):
    date_str = str(meal_data.date)
    try:
        res = supabase_db.table("daily_logs").select("meals").eq("user_id", current_user.id).eq("date", date_str).execute()
        if not res.data:
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
            saved_data = next(iter(insert_res.data), {})
        else:
            first_row = next(iter(res.data), {})
            current_meals = first_row.get("meals", []) or []
            
            new_meal = meal_data.model_dump()
            new_meal["id"] = f"m_{len(current_meals) + 1}"
            new_meal["date"] = str(new_meal["date"])
            current_meals.append(new_meal)
            
            update_res = supabase_db.table("daily_logs").update({"meals": current_meals}).eq("user_id", current_user.id).eq("date", date_str).execute()
            saved_data = next(iter(update_res.data), {})

        # Evaluate streak badges
        newly_unlocked = evaluate_streaks_and_milestones(current_user.id)

        return {
            "status": "Meal logged!",
            "data": saved_data,
            "newly_unlocked_badges": newly_unlocked
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

# --- AI RECIPES ENGINE ---

@app.post("/api/ai/meal-suggestion")
async def suggest_meal(request: MealSuggestionRequest):
    """
    Processes user remaining targets and custom prompt to synthesize a high-precision anabolic recipe.
    """
    try:
        recipe = generate_strategist_meal_suggestion(
            prompt=request.prompt,
            calories=request.calories,
            protein_g=request.protein_g,
            carbs_g=request.carbs_g,
            fat_g=request.fat_g,
            fitness_goals=request.fitness_goals
        )
        return recipe
    except Exception as e:
        print(f"[Meal Suggestion Error] {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate meal suggestion: {str(e)}"
        )