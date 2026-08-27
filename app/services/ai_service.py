import os
import re
import json
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

# Ensure environment variables are loaded
load_dotenv()

# Nutrient dictionary for high-precision local semantic fallback (per 100g or standard unit)
FOOD_DATABASE = {
    "chicken": {"cals": 165, "p": 31.0, "c": 0.0, "f": 3.6, "unit": 100, "name": "Chicken Breast"},
    "chicken breast": {"cals": 165, "p": 31.0, "c": 0.0, "f": 3.6, "unit": 100, "name": "Chicken Breast"},
    "chicken thigh": {"cals": 209, "p": 26.0, "c": 0.0, "f": 10.9, "unit": 100, "name": "Chicken Thigh"},
    "turkey": {"cals": 135, "p": 30.0, "c": 0.0, "f": 1.5, "unit": 100, "name": "Lean Turkey Breast"},
    "rice": {"cals": 130, "p": 2.7, "c": 28.0, "f": 0.3, "unit": 100, "name": "Cooked Jasmine Rice"},
    "white rice": {"cals": 130, "p": 2.7, "c": 28.0, "f": 0.3, "unit": 100, "name": "Cooked White Rice"},
    "brown rice": {"cals": 111, "p": 2.6, "c": 23.0, "f": 0.9, "unit": 100, "name": "Cooked Brown Rice"},
    "egg": {"cals": 72, "p": 6.3, "c": 0.4, "f": 4.8, "unit": 1, "name": "Whole Egg"},
    "eggs": {"cals": 72, "p": 6.3, "c": 0.4, "f": 4.8, "unit": 1, "name": "Whole Eggs"},
    "egg white": {"cals": 17, "p": 3.6, "c": 0.2, "f": 0.1, "unit": 1, "name": "Egg White"},
    "egg whites": {"cals": 17, "p": 3.6, "c": 0.2, "f": 0.1, "unit": 1, "name": "Egg Whites"},
    "beef": {"cals": 250, "p": 26.0, "c": 0.0, "f": 15.0, "unit": 100, "name": "Ground Beef (90/10)"},
    "steak": {"cals": 271, "p": 25.0, "c": 0.0, "f": 19.0, "unit": 100, "name": "Sirloin Steak"},
    "salmon": {"cals": 208, "p": 20.0, "c": 0.0, "f": 13.0, "unit": 100, "name": "Atlantic Salmon"},
    "tuna": {"cals": 132, "p": 28.0, "c": 0.0, "f": 1.3, "unit": 100, "name": "Seared Tuna Fillet"},
    "tofu": {"cals": 83, "p": 10.0, "c": 2.0, "f": 5.0, "unit": 100, "name": "Firm Tofu"},
    "paneer": {"cals": 265, "p": 18.0, "c": 4.0, "f": 20.0, "unit": 100, "name": "Low-Fat Paneer"},
    "oats": {"cals": 389, "p": 16.9, "c": 66.3, "f": 6.9, "unit": 100, "name": "Rolled Oats"},
    "oatmeal": {"cals": 150, "p": 5.0, "c": 27.0, "f": 2.5, "unit": 100, "name": "Cooked Oatmeal"},
    "quinoa": {"cals": 120, "p": 4.4, "c": 21.3, "f": 1.9, "unit": 100, "name": "Cooked Quinoa"},
    "whey": {"cals": 120, "p": 24.0, "c": 3.0, "f": 1.5, "unit": 1, "name": "Whey Protein Isolate Scoop"},
    "protein powder": {"cals": 120, "p": 24.0, "c": 3.0, "f": 1.5, "unit": 1, "name": "Protein Powder Scoop"},
    "olive oil": {"cals": 119, "p": 0.0, "c": 0.0, "f": 13.5, "unit": 1, "name": "Extra Virgin Olive Oil (1 tbsp)"},
    "oil": {"cals": 119, "p": 0.0, "c": 0.0, "f": 13.5, "unit": 1, "name": "Cooking Oil (1 tbsp)"},
    "butter": {"cals": 102, "p": 0.1, "c": 0.0, "f": 11.5, "unit": 1, "name": "Butter (1 tbsp)"},
    "peanut butter": {"cals": 188, "p": 8.0, "c": 6.0, "f": 16.0, "unit": 2, "name": "Natural Peanut Butter (2 tbsp)"},
    "avocado": {"cals": 160, "p": 2.0, "c": 8.5, "f": 14.7, "unit": 100, "name": "Fresh Avocado"},
    "bread": {"cals": 80, "p": 4.0, "c": 15.0, "f": 1.0, "unit": 1, "name": "Whole Wheat Bread Slice"},
    "sourdough": {"cals": 120, "p": 4.5, "c": 24.0, "f": 1.0, "unit": 1, "name": "Artisanal Sourdough Slice"},
    "milk": {"cals": 122, "p": 8.0, "c": 12.0, "f": 4.8, "unit": 1, "name": "Whole Milk (240ml)"},
    "almond milk": {"cals": 30, "p": 1.0, "c": 1.0, "f": 2.5, "unit": 1, "name": "Unsweetened Almond Milk (240ml)"},
    "greek yogurt": {"cals": 100, "p": 17.0, "c": 6.0, "f": 0.7, "unit": 170, "name": "Non-Fat Greek Yogurt (170g)"},
    "yogurt": {"cals": 100, "p": 17.0, "c": 6.0, "f": 0.7, "unit": 170, "name": "Greek Yogurt"},
    "banana": {"cals": 105, "p": 1.3, "c": 27.0, "f": 0.3, "unit": 1, "name": "Ripe Banana"},
    "apple": {"cals": 95, "p": 0.5, "c": 25.0, "f": 0.3, "unit": 1, "name": "Honeycrisp Apple"},
    "blueberries": {"cals": 84, "p": 1.1, "c": 21.0, "f": 0.5, "unit": 100, "name": "Fresh Blueberries"},
    "spinach": {"cals": 23, "p": 2.9, "c": 3.6, "f": 0.4, "unit": 100, "name": "Baby Spinach"},
    "broccoli": {"cals": 34, "p": 2.8, "c": 7.0, "f": 0.4, "unit": 100, "name": "Steamed Broccoli"},
    "sweet potato": {"cals": 86, "p": 1.6, "c": 20.0, "f": 0.1, "unit": 100, "name": "Baked Sweet Potato"},
    "potato": {"cals": 77, "p": 2.0, "c": 17.0, "f": 0.1, "unit": 100, "name": "Boiled Russet Potato"},
    "pasta": {"cals": 158, "p": 5.8, "c": 31.0, "f": 0.9, "unit": 100, "name": "Cooked Penne Pasta"},
    "cheese": {"cals": 113, "p": 7.0, "c": 0.4, "f": 9.3, "unit": 1, "name": "Sharp Cheddar Cheese (28g)"},
    "almonds": {"cals": 164, "p": 6.0, "c": 6.0, "f": 14.0, "unit": 1, "name": "Raw Almonds (28g)"},
    "protein bar": {"cals": 210, "p": 20.0, "c": 22.0, "f": 7.0, "unit": 1, "name": "High-Protein Energy Bar"},
}


def _extract_and_parse_json(text: str) -> Optional[Dict[str, Any]]:
    """
    Safely extracts and parses JSON payload from LLM responses handling markdown code blocks,
    unescaped newlines, and trailing control characters.
    """
    if not text:
        return None
    cleaned = text.strip()
    if "```json" in cleaned:
        cleaned = cleaned.split("```json", 1)[1]
        if "```" in cleaned:
            cleaned = cleaned.split("```", 1)[0]
    elif "```" in cleaned:
        cleaned = cleaned.split("```", 1)[1]
        if "```" in cleaned:
            cleaned = cleaned.split("```", 1)[0]
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned, strict=False)
    except Exception:
        pass

    match = re.search(r'\{.*\}', cleaned, re.DOTALL)
    if match:
        matched_str = match.group(0)
        try:
            return json.loads(matched_str, strict=False)
        except Exception:
            try:
                # Replace literal unescaped newlines inside strings
                sanitized = re.sub(r'[\r\n\t]+', ' ', matched_str)
                return json.loads(sanitized, strict=False)
            except Exception:
                pass
    return None


def _call_huggingface_llm(system_prompt: str, user_prompt: str) -> Optional[str]:
    """
    Calls open-source LLM models via Hugging Face Serverless Inference Router.
    Prioritizes top responsive instruct models with timeout protection.
    """
    hf_token = os.getenv("HUGGINGFACE_API_KEY") or os.getenv("HF_TOKEN")
    if not hf_token:
        return None

    try:
        from huggingface_hub import InferenceClient
        client = InferenceClient(token=hf_token, timeout=7)

        models = [
            "Qwen/Qwen2.5-Coder-32B-Instruct",
            "Qwen/Qwen2.5-72B-Instruct",
            "meta-llama/Llama-3.1-8B-Instruct"
        ]

        for model in models:
            try:
                response = client.chat_completion(
                    model=model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    max_tokens=750,
                    temperature=0.2
                )
                content = response.choices[0].message.content
                if content:
                    return content
            except Exception as model_err:
                print(f"[HuggingFace Inference] Model {model} attempt failed: {model_err}")
                continue

    except Exception as e:
        print(f"[HuggingFace Inference] Client error: {e}")

    return None


def parse_food_string(input_text: str) -> Dict[str, Any]:
    """
    Parses unstructured food text (e.g. '150g chicken breast, 100g rice, and 1 tbsp olive oil')
    using Open-Source Hugging Face AI with high-precision semantic fallback.
    """
    cleaned = input_text.strip()
    if not cleaned:
        return {
            "parsed_successfully": False,
            "inferred_name": "UNSPECIFIED MEAL",
            "macros": {"calories": 0, "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 0.0}
        }

    # 1. Try Hugging Face Open-Source Model
    hf_system = (
        "You are an elite sports nutritionist. Output strict JSON with keys: "
        "parsed_successfully (boolean), inferred_name (string), macros (object with integer calories, float protein_g, float carbs_g, float fat_g). "
        "Do not include any extra text, only raw JSON."
    )
    hf_response = _call_huggingface_llm(hf_system, f"Calculate macros for: '{cleaned}'")
    if hf_response:
        data = _extract_and_parse_json(hf_response)
        if data and "macros" in data and "calories" in data["macros"]:
            return {
                "parsed_successfully": True,
                "inferred_name": str(data.get("inferred_name", cleaned[:25])).upper(),
                "macros": {
                    "calories": int(data["macros"]["calories"]),
                    "protein_g": round(float(data["macros"]["protein_g"]), 1),
                    "carbs_g": round(float(data["macros"]["carbs_g"]), 1),
                    "fat_g": round(float(data["macros"]["fat_g"]), 1)
                }
            }

    # 2. Local Open-Source Heuristic Semantic Tokenizer
    total_cals = 0
    total_protein = 0.0
    total_carbs = 0.0
    total_fat = 0.0
    found_items = []

    # Split on commas, 'and', '+', or newlines
    segments = re.split(r'[,+\n]|(?:\band\b)', cleaned.lower())

    for seg in segments:
        seg = seg.strip()
        if not seg:
            continue

        match_grams = re.search(r'(\d+(?:\.\d+)?)\s*(?:g|grams?)\b\s*(?:of\s*)?([a-z\s]+)', seg)
        match_tbsp = re.search(r'(\d+(?:\.\d+)?)\s*(?:tbsp|tablespoons?|tbsps?)\b\s*(?:of\s*)?([a-z\s]+)', seg)
        match_tsp = re.search(r'(\d+(?:\.\d+)?)\s*(?:tsp|teaspoons?)\b\s*(?:of\s*)?([a-z\s]+)', seg)
        match_cups = re.search(r'(\d+(?:\.\d+)?)\s*(?:cups?)\b\s*(?:of\s*)?([a-z\s]+)', seg)
        match_scoops = re.search(r'(\d+(?:\.\d+)?)\s*(?:scoops?|servings?|slices?|pieces?)\b\s*(?:of\s*)?([a-z\s]+)', seg)
        match_count = re.search(r'^(\d+(?:\.\d+)?)\s+([a-z\s]+)', seg)

        qty = 1.0
        unit_type = "default"
        item_name = seg

        if match_grams:
            qty = float(match_grams.group(1))
            unit_type = "grams"
            item_name = match_grams.group(2).strip()
        elif match_tbsp:
            qty = float(match_tbsp.group(1))
            unit_type = "tbsp"
            item_name = match_tbsp.group(2).strip()
        elif match_tsp:
            qty = float(match_tsp.group(1)) * 0.33
            unit_type = "tbsp"
            item_name = match_tsp.group(2).strip()
        elif match_cups:
            qty = float(match_cups.group(1)) * 200.0
            unit_type = "grams"
            item_name = match_cups.group(2).strip()
        elif match_scoops:
            qty = float(match_scoops.group(1))
            unit_type = "items"
            item_name = match_scoops.group(2).strip()
        elif match_count:
            qty = float(match_count.group(1))
            unit_type = "items"
            item_name = match_count.group(2).strip()

        # Match against food database
        matched_food = None
        for key in sorted(FOOD_DATABASE.keys(), key=lambda k: len(k), reverse=True):
            if key in item_name or item_name in key:
                matched_food = (key, FOOD_DATABASE[key])
                break

        if matched_food:
            key, val = matched_food
            found_items.append(val["name"])
            multiplier = 1.0
            if unit_type == "grams":
                multiplier = qty / 100.0
            elif unit_type in ("tbsp", "items"):
                multiplier = qty
            else:
                multiplier = 1.0

            total_cals += int(val["cals"] * multiplier)
            total_protein += val["p"] * multiplier
            total_carbs += val["c"] * multiplier
            total_fat += val["f"] * multiplier
        else:
            found_items.append(item_name.title())
            total_cals += 150
            total_protein += 10.0
            total_carbs += 15.0
            total_fat += 4.0

    inferred_name = " + ".join(found_items[:3]) if found_items else input_text[:30].title()

    return {
        "parsed_successfully": True,
        "inferred_name": inferred_name.upper(),
        "macros": {
            "calories": max(50, total_cals),
            "protein_g": round(max(2.0, total_protein), 1),
            "carbs_g": round(max(0.0, total_carbs), 1),
            "fat_g": round(max(0.0, total_fat), 1)
        }
    }


def generate_pantry_full_day_plan(
    ingredients: List[str],
    target_calories: int,
    target_protein: float,
    target_carbs: float,
    target_fat: float,
    body_type: str = "Mesomorph",
    fitness_goals: str = "Hypertrophy",
    meal_count: int = 3
) -> Dict[str, Any]:
    """
    Generates a structured full-day nutrition protocol using open-source AI models & pantry inventory.
    """
    ing_text = ", ".join(ingredients) if ingredients else "Chicken Breast, Whole Eggs, Jasmine Rice, Rolled Oats, Baby Spinach"

    # 1. Try Hugging Face Open-Source Planner
    hf_system = (
        "You are an athletic nutritionist creating full-day meal protocols. "
        "Output strict JSON with format: "
        '{"plan_summary": "string", "meals": [{"meal_slot": "BREAKFAST / LUNCH / DINNER", "name": "NAME", "calories": int, "protein_g": float, "carbs_g": float, "fat_g": float, "used_ingredients": ["list"], "instructions": "string"}]}'
    )
    user_prompt = (
        f"Create a {meal_count}-meal full-day protocol fitting target {target_calories} kcal, {target_protein}g protein, {target_carbs}g carbs, {target_fat}g fat. "
        f"Goal: {fitness_goals} ({body_type}). Pantry items available: {ing_text}."
    )
    hf_response = _call_huggingface_llm(hf_system, user_prompt)
    if hf_response:
        data = _extract_and_parse_json(hf_response)
        if data and "meals" in data and len(data["meals"]) > 0:
            return {
                "plan_summary": data.get("plan_summary", f"AI Generated {meal_count}-Meal Protocol for {fitness_goals}"),
                "target_totals": {
                    "calories": target_calories,
                    "protein_g": target_protein,
                    "carbs_g": target_carbs,
                    "fat_g": target_fat
                },
                "meals": data["meals"]
            }

    # 2. Local Heuristic Engine
    meal_slots = ["BREAKFAST // GLYCOGEN PRIMER", "LUNCH // ANABOLIC CORE", "DINNER // SLOW METABOLIC RECOVERY"]
    if meal_count == 4:
        meal_slots.append("SNACK // TACTICAL FUEL")
    elif meal_count == 2:
        meal_slots = ["BRUNCH // PEAK ANABOLIC WINDOW", "DINNER // RECOVERY SYNTHESIS"]

    cals_per_meal = target_calories // len(meal_slots)
    prot_per_meal = round(target_protein / len(meal_slots), 1)
    carbs_per_meal = round(target_carbs / len(meal_slots), 1)
    fat_per_meal = round(target_fat / len(meal_slots), 1)

    recipes = []
    for idx, slot_name in enumerate(meal_slots):
        if idx == 0:
            name = "Morning Anabolic Fuel Bowl"
            inst = f"Pan-sear or mix available morning items ({ing_text[:40]}). Season lightly with sea salt and serve warm for immediate metabolic ramp."
            cals = cals_per_meal
            prot = prot_per_meal
            carbs = carbs_per_meal
            fat = fat_per_meal
        elif idx == 1:
            name = "High-Nitrogen Midday Anabolic Plate"
            inst = f"Cook available primary protein and complex carb staples from kitchen pantry ({ing_text}). Pair with greens for optimal micronutrient uptake."
            cals = int(cals_per_meal * 1.05)
            prot = round(prot_per_meal * 1.05, 1)
            carbs = round(carbs_per_meal * 1.1, 1)
            fat = round(fat_per_meal * 0.9, 1)
        elif idx == 2:
            name = "Nighttime Anabolic Recovery Plate"
            inst = f"Combine remaining pantry items ({ing_text}) into a slow-digesting nutrient-dense plate. Season with coarse salt and cracked pepper for sustained recovery."
            cals = int(cals_per_meal * 0.95)
            prot = round(prot_per_meal * 0.95, 1)
            carbs = round(carbs_per_meal * 0.9, 1)
            fat = round(fat_per_meal * 1.1, 1)
        else:
            name = "Tactical Glycogen & Whey Booster"
            inst = f"Quick-prep energy snack blending available pantry ingredients ({ing_text}) for rapid amino acid delivery."
            cals = cals_per_meal
            prot = prot_per_meal
            carbs = carbs_per_meal
            fat = fat_per_meal

        recipes.append({
            "meal_slot": slot_name,
            "name": name.upper(),
            "calories": cals,
            "protein_g": prot,
            "carbs_g": carbs,
            "fat_g": fat,
            "used_ingredients": ingredients[:4] if ingredients else ["Pantry Staples"],
            "instructions": inst
        })

    return {
        "plan_summary": f"Calculated {len(recipes)}-meal protocol for {fitness_goals} ({body_type}) utilizing available pantry inventory.",
        "target_totals": {
            "calories": target_calories,
            "protein_g": target_protein,
            "carbs_g": target_carbs,
            "fat_g": target_fat
        },
        "meals": recipes
    }


def generate_strategist_meal_suggestion(
    prompt: Optional[str],
    calories: int,
    protein_g: float,
    carbs_g: float,
    fat_g: float,
    fitness_goals: str = "Hypertrophy"
) -> Dict[str, Any]:
    """
    Synthesizes custom meal protocol targeted to exact remaining macro targets and optional user prompt.
    """
    calories = max(100, int(calories))
    protein = round(max(10.0, float(protein_g)), 1)
    carbs = round(max(5.0, float(carbs_g)), 1)
    fat = round(max(3.0, float(fat_g)), 1)
    user_query = (prompt or "").strip()

    # 1. Try Hugging Face Open-Source LLM
    hf_system = (
        "You are an elite sports nutrition strategist and culinary chef. Create a single high-protein meal recipe "
        "tailored precisely to the user's macro targets and preferences. "
        "Output strict JSON with format: "
        '{"name": "MEAL NAME", "calories": int, "protein": float, "carbs": float, "fat": float, "instructions": "Step 1: ... Step 2: ..."}. '
        "Do not include code markdown or any conversational filler, only raw JSON."
    )
    user_prompt = (
        f"Goal: {fitness_goals}. "
        f"Target Macros: {calories} kcal, {protein}g protein, {carbs}g carbs, {fat}g fat. "
        f"User Meal Request: '{user_query if user_query else 'High protein nutrient dense meal'}'."
    )

    hf_response = _call_huggingface_llm(hf_system, user_prompt)
    if hf_response:
        data = _extract_and_parse_json(hf_response)
        if data and "name" in data and "instructions" in data:
            name_val = str(data.get("name", "Custom Anabolic Bowl")).upper()
            inst_val = str(data.get("instructions", "Cook lean protein with fresh carbs and healthy fats."))
            cal_val = int(data.get("calories", calories))
            p_val = round(float(data.get("protein", protein)), 1)
            c_val = round(float(data.get("carbs", carbs)), 1)
            f_val = round(float(data.get("fat", fat)), 1)
            return {
                "name": name_val,
                "calories": cal_val,
                "protein": p_val,
                "protein_g": p_val,
                "carbs": c_val,
                "carbs_g": c_val,
                "fat": f_val,
                "fat_g": f_val,
                "instructions": inst_val
            }

    # 2. Dynamic Semantic Fallback Engine based on prompt keywords and macros
    q = user_query.lower()
    
    # Calculate realistic ingredient weights based on macro targets
    chicken_g = int((protein / 0.31))
    turkey_g = int((protein / 0.30))
    salmon_g = int((protein / 0.20))
    beef_g = int((protein / 0.26))
    tofu_g = int((protein / 0.10))
    rice_g = max(50, int(carbs / 0.28))
    potato_g = max(80, int(carbs / 0.17))
    oats_g = max(30, int(carbs / 0.66))
    oil_tbsp = max(1, round(fat / 13.5, 1))

    if "shake" in q or "smoothie" in q or "quick" in q or "liquid" in q or "post-workout" in q:
        scoops = max(1, round(protein / 24.0, 1))
        name = "Rapid Whey Glycogen Recovery Shake"
        instructions = f"Blend {scoops} scoops whey protein isolate with 250ml almond milk, 1 medium banana ({carbs*0.5:.0f}g carbs), {max(20, int(carbs*0.4))}g rolled oats, and 1 tbsp peanut butter. Blend on high for 45s for immediate amino uptake hitting ~{protein}g protein."
        cal_val = calories
    elif "salmon" in q or "fish" in q or "tuna" in q or "seafood" in q:
        name = "Crisp Atlantic Salmon & Roasted Sweet Potato"
        instructions = f"Pan-sear {salmon_g}g fresh salmon fillet skin-down in {oil_tbsp} tbsp olive oil for 4 mins each side. Serve with {potato_g}g roasted sweet potato cubes and steamed asparagus for clean omega-3s and complex glycogen replenishment."
        cal_val = calories
    elif "steak" in q or "beef" in q or "burger" in q:
        name = "Lean Angus Beef & Golden Potato Skillet"
        instructions = f"Brown {beef_g}g extra-lean ground beef (90/10) with smoked paprika, garlic powder, and diced onions. Air-fry {potato_g}g diced russet potatoes at 200°C for 15 mins. Toss together and garnish with fresh parsley."
        cal_val = calories
    elif "egg" in q or "breakfast" in q or "scramble" in q or "omelet" in q or "toast" in q:
        egg_whites_count = max(3, int(protein / 3.6))
        name = "Anabolic Egg White & Sourdough Scramble"
        instructions = f"Scramble {egg_whites_count} egg whites with 1 whole egg, baby spinach, and cherry tomatoes. Serve alongside 2 toasted artisanal sourdough slices and {min(50, int(fat*3))}g sliced avocado."
        cal_val = calories
    elif "tofu" in q or "vegan" in q or "plant" in q or "vegetarian" in q or "paneer" in q:
        name = "Crispy Golden Tofu & Quinoa Power Bowl"
        instructions = f"Press and cube {tofu_g}g firm tofu. Pan-sear in sesame oil with soy sauce and garlic until golden crisp. Serve over {max(50, int(carbs*2))}g cooked quinoa, steamed edamame, and broccoli with a drizzle of sriracha."
        cal_val = calories
    elif "oat" in q or "pancake" in q or "oatmeal" in q:
        name = "Proats & Wild Berry Anabolic Power Bowl"
        instructions = f"Cook {oats_g}g rolled oats with 200ml water or milk. Stir in {round(protein/24, 1)} scoops whey isolate once warm. Top with fresh blueberries, cinnamon, and a drizzle of honey."
        cal_val = calories
    elif "pasta" in q or "italian" in q:
        pasta_g = max(60, int(carbs / 0.31))
        name = "High-Protein Turkey Bolognese & Penne"
        instructions = f"Simmer {turkey_g}g lean ground turkey in marinara sauce with basil and oregano. Toss with {pasta_g}g al dente penne pasta and top with 1 tbsp grated parmesan."
        cal_val = calories
    elif "salad" in q or "wrap" in q or "greens" in q:
        name = "Loaded Anabolic Grilled Chicken Salad"
        instructions = f"Grill {chicken_g}g seasoned chicken breast strips. Toss with mixed greens, sliced cucumbers, cherry tomatoes, {potato_g}g boiled baby potatoes, and {oil_tbsp} tbsp olive oil vinaigrette."
        cal_val = calories
    else:
        name = f"Garlic Herb Seared Chicken & Jasmine Rice ({fitness_goals.upper()})"
        instructions = f"Pan-sear {chicken_g}g diced chicken breast in olive oil with minced garlic and herbs. Serve over {rice_g}g warm jasmine rice and steamed broccoli for optimal protein synthesis."
        cal_val = calories

    return {
        "name": name.upper(),
        "calories": cal_val,
        "protein": protein,
        "protein_g": protein,
        "carbs": carbs,
        "carbs_g": carbs,
        "fat": fat,
        "fat_g": fat,
        "instructions": instructions
    }
