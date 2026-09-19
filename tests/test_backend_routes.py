import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_all_routes():
    print("--- 1. Testing Health Endpoints ---")
    r1 = client.get("/")
    assert r1.status_code == 200, f"Root health failed: {r1.text}"
    assert r1.json()["status"] == "online"
    print("GET / -> OK:", r1.json())

    r2 = client.get("/health")
    assert r2.status_code == 200, f"/health failed: {r2.text}"
    assert r2.json()["status"] == "online"
    print("GET /health -> OK:", r2.json())

    print("\n--- 2. Testing AI Food Parser (Indian & Global Cuisine) ---")
    r3 = client.post("/api/ai/parse-food", json={"input_text": "2 rotis and 100g paneer bhurji and 1 cup curd"})
    assert r3.status_code == 200, f"Parse food failed: {r3.text}"
    parsed = r3.json()
    print("POST /api/ai/parse-food -> OK:")
    print(f"  Calories: {parsed.get('calories')}, Protein: {parsed.get('protein_g')}g, Carbs: {parsed.get('carbs_g')}g, Fat: {parsed.get('fat_g')}g")
    assert parsed.get("calories", 0) > 0, "Parsed calories should be > 0"

    print("\n--- 3. Testing AI Meal Suggestion ---")
    r4 = client.post("/api/ai/meal-suggestion", json={
        "calories": 600,
        "protein_g": 45.0,
        "carbs_g": 60.0,
        "fat_g": 15.0,
        "fitness_goals": "Hypertrophy",
        "prompt": "High protein chicken or paneer dinner"
    })
    assert r4.status_code == 200, f"Meal suggestion failed: {r4.text}"
    recipe = r4.json()
    print("POST /api/ai/meal-suggestion -> OK:")
    print(f"  Recipe: {recipe.get('name')}")
    print(f"  Instructions: {recipe.get('instructions')[:100]}...")

    print("\n--- 4. Testing AI Pantry Planner ---")
    r5 = client.post("/api/ai/pantry-planner", json={
        "ingredients": ["eggs", "paneer", "oats", "rice", "curd"],
        "target_calories": 2200,
        "target_protein": 160.0,
        "target_carbs": 240.0,
        "target_fat": 65.0,
        "meal_count": 3,
        "body_type": "Mesomorph",
        "fitness_goals": "Hypertrophy"
    })
    assert r5.status_code == 200, f"Pantry planner failed: {r5.text}"
    pantry = r5.json()
    print("POST /api/ai/pantry-planner -> OK:")
    print(f"  Summary: {pantry.get('plan_summary')}")
    print(f"  Meals generated: {len(pantry.get('meals', []))}")
    assert len(pantry.get("meals", [])) == 3

    print("\n--- 5. Testing Auth Guard & Protected Endpoints (Expect 403 or 401 on missing token) ---")
    r6 = client.get("/api/profile")
    assert r6.status_code in (401, 403), f"Protected endpoint without auth returned unexpected code: {r6.status_code}"
    print(f"GET /api/profile without token correctly blocked: HTTP {r6.status_code}")

    r7 = client.get("/api/badges")
    assert r7.status_code in (401, 403), f"Protected endpoint without auth returned unexpected code: {r7.status_code}"
    print(f"GET /api/badges without token correctly blocked: HTTP {r7.status_code}")

    print("\n==============================================")
    print("ALL BACKEND INTEGRITY TESTS PASSED WITH 100% SUCCESS!")
    print("==============================================")

if __name__ == "__main__":
    test_all_routes()
