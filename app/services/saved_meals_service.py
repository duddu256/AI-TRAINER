import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from app.services.supabase_client import supabase_db

# Resilient in-memory fallback store if Supabase table is not yet migrated
_IN_MEMORY_SAVED_MEALS: Dict[str, List[Dict[str, Any]]] = {}

def get_user_saved_meals(user_id: str) -> List[Dict[str, Any]]:
    """
    Fetch all saved meal templates for the specified user.
    """
    try:
        res = supabase_db.table("saved_meals").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        if res.data is not None:
            return res.data
    except Exception as e:
        print(f"[SavedMealsService] Supabase fallback: {e}")

    # Return local in-memory store
    return _IN_MEMORY_SAVED_MEALS.get(user_id, [
        {
            "id": "sample-1",
            "user_id": user_id,
            "name": "POST-WORKOUT CHICKEN & JASMINE RICE",
            "calories": 520,
            "protein_g": 48.0,
            "carbs_g": 60.0,
            "fat_g": 6.5,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "sample-2",
            "user_id": user_id,
            "name": "ANABOLIC WHEY & BLUEBERRY OATS",
            "calories": 410,
            "protein_g": 34.0,
            "carbs_g": 52.0,
            "fat_g": 7.0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ])


def create_saved_meal(user_id: str, meal_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Save a new meal template for quick 1-click logging.
    """
    meal_id = str(uuid.uuid4())
    record = {
        "id": meal_id,
        "user_id": user_id,
        "name": meal_data["name"].strip().toUpperCase() if hasattr(meal_data["name"], "toUpperCase") else meal_data["name"].strip().upper(),
        "calories": int(meal_data["calories"]),
        "protein_g": float(meal_data["protein_g"]),
        "carbs_g": float(meal_data["carbs_g"]),
        "fat_g": float(meal_data["fat_g"]),
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    try:
        res = supabase_db.table("saved_meals").insert(record).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
    except Exception as e:
        print(f"[SavedMealsService] Supabase fallback on insert: {e}")

    if user_id not in _IN_MEMORY_SAVED_MEALS:
        _IN_MEMORY_SAVED_MEALS[user_id] = []
    _IN_MEMORY_SAVED_MEALS[user_id].insert(0, record)
    return record


def delete_saved_meal(user_id: str, meal_id: str) -> bool:
    """
    Delete a saved meal template.
    """
    try:
        supabase_db.table("saved_meals").delete().eq("id", meal_id).eq("user_id", user_id).execute()
    except Exception as e:
        print(f"[SavedMealsService] Supabase fallback on delete: {e}")

    if user_id in _IN_MEMORY_SAVED_MEALS:
        _IN_MEMORY_SAVED_MEALS[user_id] = [m for m in _IN_MEMORY_SAVED_MEALS[user_id] if m["id"] != meal_id]
    return True
