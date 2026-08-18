from fastapi import FastAPI, HTTPException, Depends, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from app.services.supabase_client import supabase_auth, supabase_db
from datetime import date as date_type

app = FastAPI(
    title="AI Trainer Backend Service (Supabase Auth)",
    description="Secure backend service for user registration, onboarding, and daily tracker logging"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        # Use the AUTH client to verify the user token
        response = supabase_auth.auth.get_user(token)
        return response.user
    except Exception as e:
        print(f"Auth Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )

class UserAuth(BaseModel):
    email: EmailStr
    password: str

# --- UPDATED PROFILE SCHEMA ---
class ProfileOnboarding(BaseModel):
    name: str
    age: int
    height_cm: float
    weight_kg: float
    body_type: str  # e.g., 'Ectomorph', 'Mesomorph', 'Endomorph'
    fitness_goals: str  # e.g., 'Hypertrophy'
    target_calories: int = 2000
    target_protein_g: float = 150.0
    target_carbs_g: float = 200.0
    target_fat_g: float = 65.0
    target_water_ml: int = 3000
    target_steps: int = 10000

class TrackerUpdate(BaseModel):
    date: date_type
    weight_today: float = None
    steps: int = None
    water_intake_ml: int = None
    workout_completed: bool = None
    diet_met: bool = None
    water_met: bool = None
    steps_met: bool = None

class MealLog(BaseModel):
    date: date_type
    name: str
    calories: int
    protein_g: float
    carbs_g: float
    fat_g: float
    logged_at: str

@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
async def register_user(user: UserAuth):
    try:
        # Use the AUTH client to register
        response = supabase_auth.auth.sign_up({"email": user.email, "password": user.password})
        return {"message": "User registered successfully!", "user_id": response.user.id}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.post("/api/auth/login")
async def login_user(user: UserAuth):
    try:
        # Use the AUTH client to log in
        response = supabase_auth.auth.sign_in_with_password({"email": user.email, "password": user.password})
        return {
            "access_token": response.session.access_token,
            "token_type": "bearer",
            "user": {"id": response.user.id, "email": response.user.email}
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

# --- UPDATED ONBOARDING SAVE ---
# 1. THE POST ROUTE (Saves onboarding data - Frontend calls this at Step 6)
@app.post("/api/profile")
async def save_user_profile(profile_data: ProfileOnboarding, current_user = Depends(get_current_user)):
    """
    Saves or Updates user details in the public.profiles table.
    """
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
        
        profile_row = next(iter(response.data), {})
        return {"status": "Profile updated successfully!", "data": profile_row}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# 2. THE GET ROUTE (Fetches targets - Dashboard calls this to load ring charts)
@app.get("/api/profile")
async def get_user_profile(current_user = Depends(get_current_user)):
    """
    Fetches the logged-in user's physical goals and targets from the profiles table.
    """
    try:
        response = supabase_db.table("profiles").select("*").eq("id", current_user.id).execute()
        profile_row = next(iter(response.data), {})
        return profile_row
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.get("/api/logs/daily")
async def get_daily_log(
    date: date_type = Query(..., description="Date format: YYYY-MM-DD"), 
    current_user = Depends(get_current_user)
):
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

        res = supabase_db.table("daily_logs").update(update_payload).eq("user_id", current_user.id).eq("date", date_str).execute()
        updated_row = next(iter(res.data), {})
        return {"status": "Trackers updated successfully!", "data": updated_row}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.post("/api/logs/meals")
async def log_meal(meal_data: MealLog, current_user = Depends(get_current_user)):
    date_str = str(meal_data.date)
    try:
        res = supabase_db.table("daily_logs").select("meals").eq("user_id", current_user.id).eq("date", date_str).execute()
        if not res.data or len(res.data) == 0:
            raise HTTPException(status_code=404, detail="Daily log not initialized.")

        first_row = next(iter(res.data), {})
        current_meals = first_row.get("meals", [])
        if current_meals is None:
            current_meals = []
        
        new_meal = meal_data.model_dump()
        new_meal["id"] = f"m_{len(current_meals) + 1}"
        new_meal["date"] = str(new_meal["date"])
        current_meals.append(new_meal)
        
        update_res = supabase_db.table("daily_logs").update({"meals": current_meals}).eq("user_id", current_user.id).eq("date", date_str).execute()
        updated_row = next(iter(update_res.data), {})
        return {"status": "Meal logged successfully!", "data": updated_row}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.get("/")
def read_root():
    return {"status": "AI Fitness Backend is up and running!"}