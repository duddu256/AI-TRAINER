from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.services.supabase_client import supabase_db

ALL_BADGES: List[Dict[str, Any]] = [
    {
        "id": "iron_pioneer",
        "title": "Iron Pioneer",
        "description": "Completed and mastered your first workout protocol",
        "icon_name": "sword",
        "category": "workout",
        "requirement_val": 1
    },
    {
        "id": "diet_streak_7",
        "title": "7-Day Consistent Diet Plan",
        "description": "Met your daily nutrition targets for 7 consecutive days",
        "icon_name": "flame",
        "category": "diet",
        "requirement_val": 7
    },
    {
        "id": "water_streak_7",
        "title": "Perfect Hydration Week",
        "description": "Achieved your 3,000ml water intake target for 7 consecutive days",
        "icon_name": "droplet",
        "category": "water",
        "requirement_val": 7
    },
    {
        "id": "steps_streak_7",
        "title": "10K Steps 7-Day Streak",
        "description": "Hit or exceeded 10,000 steps for 7 consecutive days",
        "icon_name": "zap",
        "category": "steps",
        "requirement_val": 7
    },
    {
        "id": "workout_30",
        "title": "30 Workouts Mastered",
        "description": "Logged 30 completed training split sessions",
        "icon_name": "trophy",
        "category": "workout",
        "requirement_val": 30
    }
]

# In-memory store of unlocked badges per user if Supabase table is not yet migrated
_USER_UNLOCKED_BADGES: Dict[str, Dict[str, str]] = {}


def get_user_badges(user_id: str) -> List[Dict[str, Any]]:
    """
    Returns full badge catalog with unlock status and timestamps for the user.
    """
    unlocked_map: Dict[str, str] = {}

    try:
        res = supabase_db.table("user_badges").select("*").eq("user_id", user_id).execute()
        if res.data:
            for row in res.data:
                unlocked_map[row["badge_id"]] = row.get("unlocked_at", "")
    except Exception as e:
        print(f"[GamificationService] Supabase fallback for user_badges: {e}")

    # Merge with local in-memory store
    local_unlocked = _USER_UNLOCKED_BADGES.get(user_id, {})
    for b_id, ts in local_unlocked.items():
        if b_id not in unlocked_map:
            unlocked_map[b_id] = ts

    # Default initial badge for demo experience if none yet unlocked
    if not unlocked_map and user_id not in _USER_UNLOCKED_BADGES:
        now_ts = datetime.now(timezone.utc).isoformat()
        unlocked_map["iron_pioneer"] = now_ts
        _USER_UNLOCKED_BADGES[user_id] = {"iron_pioneer": now_ts}

    result = []
    for badge in ALL_BADGES:
        is_unlocked = badge["id"] in unlocked_map
        result.append({
            **badge,
            "unlocked": is_unlocked,
            "unlocked_at": unlocked_map.get(badge["id"], None)
        })

    return result


def unlock_badge_for_user(user_id: str, badge_id: str) -> Optional[Dict[str, Any]]:
    """
    Unlocks a specific badge for a user if not already unlocked.
    """
    user_badges_map = _USER_UNLOCKED_BADGES.setdefault(user_id, {})
    if badge_id in user_badges_map:
        return None  # already unlocked

    now_ts = datetime.now(timezone.utc).isoformat()
    user_badges_map[badge_id] = now_ts

    try:
        supabase_db.table("user_badges").insert({
            "user_id": user_id,
            "badge_id": badge_id,
            "unlocked_at": now_ts
        }).execute()
    except Exception as e:
        print(f"[GamificationService] Supabase insert user_badge fallback: {e}")

    badge_info = next((b for b in ALL_BADGES if b["id"] == badge_id), None)
    if badge_info:
        return {
            **badge_info,
            "unlocked": True,
            "unlocked_at": now_ts
        }
    return None


def evaluate_streaks_and_milestones(user_id: str) -> List[Dict[str, Any]]:
    """
    Queries user daily log history to evaluate milestone requirements and awards newly earned badges.
    """
    newly_unlocked = []

    try:
        res = supabase_db.table("daily_logs").select("*").eq("user_id", user_id).order("date", desc=True).limit(60).execute()
        logs = res.data or []
    except Exception as e:
        print(f"[GamificationService] Supabase daily_logs query fallback: {e}")
        logs = []

    # Calculate metrics
    workout_count = sum(1 for l in logs if l.get("workout_completed"))
    
    # Check Iron Pioneer
    if workout_count >= 1:
        unlocked = unlock_badge_for_user(user_id, "iron_pioneer")
        if unlocked:
            newly_unlocked.append(unlocked)

    # Check 30 workouts
    if workout_count >= 30:
        unlocked = unlock_badge_for_user(user_id, "workout_30")
        if unlocked:
            newly_unlocked.append(unlocked)

    # Calculate streaks (consecutive days)
    diet_streak = 0
    water_streak = 0
    steps_streak = 0

    for l in logs:
        if l.get("diet_met"):
            diet_streak += 1
        else:
            break

    for l in logs:
        if l.get("water_met") or (l.get("water_intake_ml", 0) >= 3000):
            water_streak += 1
        else:
            break

    for l in logs:
        if l.get("steps_met") or (l.get("steps", 0) >= 10000):
            steps_streak += 1
        else:
            break

    if diet_streak >= 7:
        unlocked = unlock_badge_for_user(user_id, "diet_streak_7")
        if unlocked:
            newly_unlocked.append(unlocked)

    if water_streak >= 7:
        unlocked = unlock_badge_for_user(user_id, "water_streak_7")
        if unlocked:
            newly_unlocked.append(unlocked)

    if steps_streak >= 7:
        unlocked = unlock_badge_for_user(user_id, "steps_streak_7")
        if unlocked:
            newly_unlocked.append(unlocked)

    return newly_unlocked
