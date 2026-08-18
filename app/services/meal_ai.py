import random


def generate_meal_suggestion(
    body_type: str, fitness_goals: str, remaining_macros: dict
) -> dict:
    # Pre-written healthy recipes that we can "pretend" the AI generated
    mock_recipes = [
        {
            "recipe_name": "Garlic Butter Shrimp with Broccoli & Rice",
            "prep_time_minutes": 20,
            "macros": {
                "calories": 520,
                "protein_g": 38.0,
                "carbs_g": 45.0,
                "fat_g": 14.0,
            },
            "ingredients": [
                "200g Tiger Shrimp (peeled)",
                "1.5 cups Broccoli Florets",
                "1 cup Cooked Jasmine Rice",
                "1 tbsp Garlic Butter",
                "Lemon juice and red pepper flakes",
            ],
            "instructions": [
                "Melt garlic butter in a hot pan and sear shrimp for 2-3 minutes per side.",
                "Steam the broccoli florets in a separate pot until vibrant green.",
                "Plate the warm jasmine rice, top with garlic shrimp, and serve with steamed broccoli on the side.",
            ],
        },
        {
            "recipe_name": "High-Protein Turkey Taco Bowl",
            "prep_time_minutes": 15,
            "macros": {
                "calories": 480,
                "protein_g": 42.0,
                "carbs_g": 30.0,
                "fat_g": 11.0,
            },
            "ingredients": [
                "200g Lean Ground Turkey",
                "0.5 cup Black Beans (rinsed)",
                "1/4 cup Shredded Cheddar Cheese",
                "Salsa and shredded romaine lettuce",
                "Taco seasoning packet",
            ],
            "instructions": [
                "Brown the ground turkey in a pan, stirring in taco seasoning and a splash of water.",
                "Assemble shredded lettuce and black beans in a bowl.",
                "Add the hot turkey, top with cheddar cheese and fresh salsa, and mix well.",
            ],
        },
    ]

    # Instantly return a random recipe
    return random.choice(mock_recipes)
