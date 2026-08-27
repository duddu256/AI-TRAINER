import os
import re
import json
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

# Ensure environment variables are loaded
load_dotenv()

# Comprehensive nutrient database including Global & Indian Standards (per 100g or standard unit/piece)
FOOD_DATABASE = {
    # --- INDIAN BREADS, GRAINS & STAPLES ---
    "roti": {"cals": 100, "p": 3.2, "c": 20.0, "f": 0.4, "unit": 1, "name": "Whole Wheat Roti (Phulka)"},
    "rotis": {"cals": 100, "p": 3.2, "c": 20.0, "f": 0.4, "unit": 1, "name": "Whole Wheat Rotis"},
    "phulka": {"cals": 90, "p": 3.0, "c": 19.0, "f": 0.3, "unit": 1, "name": "Soft Phulka"},
    "phulkas": {"cals": 90, "p": 3.0, "c": 19.0, "f": 0.3, "unit": 1, "name": "Soft Phulkas"},
    "chapati": {"cals": 105, "p": 3.3, "c": 21.0, "f": 0.5, "unit": 1, "name": "Whole Wheat Chapati"},
    "chapatis": {"cals": 105, "p": 3.3, "c": 21.0, "f": 0.5, "unit": 1, "name": "Whole Wheat Chapatis"},
    "plain paratha": {"cals": 220, "p": 4.5, "c": 30.0, "f": 9.5, "unit": 1, "name": "Tawa Paratha"},
    "paratha": {"cals": 220, "p": 4.5, "c": 30.0, "f": 9.5, "unit": 1, "name": "Tawa Paratha"},
    "parathas": {"cals": 220, "p": 4.5, "c": 30.0, "f": 9.5, "unit": 1, "name": "Tawa Parathas"},
    "aloo paratha": {"cals": 280, "p": 5.0, "c": 40.0, "f": 11.0, "unit": 1, "name": "Aloo Paratha"},
    "paneer paratha": {"cals": 330, "p": 13.0, "c": 36.0, "f": 14.0, "unit": 1, "name": "High-Protein Paneer Paratha"},
    "naan": {"cals": 280, "p": 7.0, "c": 45.0, "f": 8.0, "unit": 1, "name": "Tandoori Naan"},
    "butter naan": {"cals": 310, "p": 7.0, "c": 45.0, "f": 11.5, "unit": 1, "name": "Butter Naan"},
    "puri": {"cals": 130, "p": 2.0, "c": 14.0, "f": 7.5, "unit": 1, "name": "Crispy Puri"},
    "poori": {"cals": 130, "p": 2.0, "c": 14.0, "f": 7.5, "unit": 1, "name": "Crispy Poori"},
    "dosa": {"cals": 168, "p": 4.0, "c": 29.0, "f": 4.0, "unit": 1, "name": "Crispy Plain Dosa"},
    "masala dosa": {"cals": 280, "p": 5.5, "c": 45.0, "f": 9.0, "unit": 1, "name": "Mysore Masala Dosa"},
    "idli": {"cals": 58, "p": 2.0, "c": 12.0, "f": 0.3, "unit": 1, "name": "Steamed Rice Idli"},
    "idlis": {"cals": 58, "p": 2.0, "c": 12.0, "f": 0.3, "unit": 1, "name": "Steamed Rice Idlis"},
    "poha": {"cals": 180, "p": 3.5, "c": 35.0, "f": 3.0, "unit": 100, "name": "Kanda Poha"},
    "upma": {"cals": 160, "p": 4.0, "c": 26.0, "f": 4.5, "unit": 100, "name": "Rava Upma"},
    "dal khichdi": {"cals": 145, "p": 5.0, "c": 24.0, "f": 3.0, "unit": 100, "name": "Moong Dal Khichdi"},
    "khichdi": {"cals": 145, "p": 5.0, "c": 24.0, "f": 3.0, "unit": 100, "name": "Dal Khichdi"},
    "jeera rice": {"cals": 140, "p": 2.8, "c": 29.0, "f": 1.5, "unit": 100, "name": "Fragrant Jeera Rice"},
    "basmati rice": {"cals": 130, "p": 3.0, "c": 28.0, "f": 0.4, "unit": 100, "name": "Cooked Basmati Rice"},
    "jasmine rice": {"cals": 130, "p": 2.7, "c": 28.0, "f": 0.3, "unit": 100, "name": "Cooked Jasmine Rice"},
    "white rice": {"cals": 130, "p": 2.7, "c": 28.0, "f": 0.3, "unit": 100, "name": "Cooked White Rice"},
    "brown rice": {"cals": 111, "p": 2.6, "c": 23.0, "f": 0.9, "unit": 100, "name": "Cooked Brown Rice"},
    "rice": {"cals": 130, "p": 2.7, "c": 28.0, "f": 0.3, "unit": 100, "name": "Cooked Rice"},
    "chicken biryani": {"cals": 200, "p": 14.0, "c": 22.0, "f": 6.0, "unit": 100, "name": "Hyderabadi Chicken Biryani"},
    "mutton biryani": {"cals": 235, "p": 13.0, "c": 21.0, "f": 11.0, "unit": 100, "name": "Dum Mutton Biryani"},
    "veg biryani": {"cals": 160, "p": 4.0, "c": 28.0, "f": 4.0, "unit": 100, "name": "Vegetable Biryani"},
    "biryani": {"cals": 200, "p": 14.0, "c": 22.0, "f": 6.0, "unit": 100, "name": "Biryani"},
    "sambar": {"cals": 65, "p": 3.0, "c": 10.0, "f": 1.5, "unit": 100, "name": "South Indian Sambar"},
    "rasam": {"cals": 35, "p": 1.0, "c": 6.0, "f": 0.5, "unit": 100, "name": "Pepper Rasam"},

    # --- INDIAN VEGETARIAN PROTEINS, DALS & LEGUMES ---
    "paneer": {"cals": 265, "p": 18.3, "c": 4.0, "f": 20.8, "unit": 100, "name": "Fresh Malai Paneer"},
    "low fat paneer": {"cals": 180, "p": 25.0, "c": 4.0, "f": 6.0, "unit": 100, "name": "Low-Fat Paneer"},
    "paneer bhurji": {"cals": 220, "p": 15.0, "c": 6.0, "f": 15.0, "unit": 100, "name": "Spiced Paneer Bhurji"},
    "paneer tikka": {"cals": 210, "p": 16.0, "c": 5.0, "f": 14.0, "unit": 100, "name": "Tandoori Paneer Tikka"},
    "palak paneer": {"cals": 190, "p": 10.0, "c": 6.0, "f": 14.0, "unit": 100, "name": "Palak Paneer"},
    "soya chunks": {"cals": 345, "p": 52.0, "c": 33.0, "f": 0.5, "unit": 100, "name": "High-Protein Soya Chunks"},
    "soya nuggets": {"cals": 345, "p": 52.0, "c": 33.0, "f": 0.5, "unit": 100, "name": "Soya Nuggets"},
    "mealmaker": {"cals": 345, "p": 52.0, "c": 33.0, "f": 0.5, "unit": 100, "name": "Mealmaker Soya Chunks"},
    "soya": {"cals": 345, "p": 52.0, "c": 33.0, "f": 0.5, "unit": 100, "name": "Soya Chunks"},
    "sattu": {"cals": 385, "p": 26.0, "c": 60.0, "f": 5.0, "unit": 100, "name": "Roasted Chana Sattu"},
    "chana sattu": {"cals": 385, "p": 26.0, "c": 60.0, "f": 5.0, "unit": 100, "name": "Chana Sattu Powder"},
    "besan chilla": {"cals": 140, "p": 7.0, "c": 18.0, "f": 4.5, "unit": 1, "name": "Besan Chilla (Cheela)"},
    "besan cheela": {"cals": 140, "p": 7.0, "c": 18.0, "f": 4.5, "unit": 1, "name": "Besan Cheela"},
    "besan": {"cals": 387, "p": 22.4, "c": 58.0, "f": 6.7, "unit": 100, "name": "Gram Flour (Besan)"},
    "yellow dal": {"cals": 116, "p": 9.0, "c": 20.0, "f": 0.4, "unit": 100, "name": "Tadka Yellow Dal"},
    "toor dal": {"cals": 116, "p": 9.0, "c": 20.0, "f": 0.4, "unit": 100, "name": "Cooked Toor Dal"},
    "arhar dal": {"cals": 116, "p": 9.0, "c": 20.0, "f": 0.4, "unit": 100, "name": "Cooked Arhar Dal"},
    "moong dal": {"cals": 105, "p": 8.0, "c": 19.0, "f": 0.3, "unit": 100, "name": "Cooked Moong Dal"},
    "sprouted moong": {"cals": 30, "p": 3.0, "c": 6.0, "f": 0.2, "unit": 100, "name": "Sprouted Green Moong"},
    "moong sprouts": {"cals": 30, "p": 3.0, "c": 6.0, "f": 0.2, "unit": 100, "name": "Moong Sprouts"},
    "masoor dal": {"cals": 116, "p": 9.0, "c": 20.0, "f": 0.4, "unit": 100, "name": "Cooked Red Masoor Dal"},
    "chana dal": {"cals": 130, "p": 8.5, "c": 22.0, "f": 1.5, "unit": 100, "name": "Cooked Chana Dal"},
    "dal": {"cals": 116, "p": 9.0, "c": 20.0, "f": 0.4, "unit": 100, "name": "Cooked Dal"},
    "chole": {"cals": 164, "p": 8.9, "c": 27.4, "f": 2.6, "unit": 100, "name": "Punjabi Chole"},
    "chana": {"cals": 164, "p": 8.9, "c": 27.4, "f": 2.6, "unit": 100, "name": "Boiled White Chana (Chickpeas)"},
    "kala chana": {"cals": 160, "p": 9.5, "c": 26.0, "f": 2.5, "unit": 100, "name": "Boiled Black Chana"},
    "rajma": {"cals": 140, "p": 9.0, "c": 23.0, "f": 0.6, "unit": 100, "name": "Punjabi Rajma (Kidney Beans)"},
    "tofu": {"cals": 83, "p": 10.0, "c": 2.0, "f": 5.0, "unit": 100, "name": "Firm Tofu"},
    "edamame": {"cals": 121, "p": 11.9, "c": 8.9, "f": 5.2, "unit": 100, "name": "Steamed Edamame"},

    # --- INDIAN MEATS, POULTRY, FISH & EGGS ---
    "chicken breast": {"cals": 165, "p": 31.0, "c": 0.0, "f": 3.6, "unit": 100, "name": "Chicken Breast"},
    "chicken": {"cals": 165, "p": 31.0, "c": 0.0, "f": 3.6, "unit": 100, "name": "Chicken Breast"},
    "chicken tikka": {"cals": 160, "p": 28.0, "c": 2.0, "f": 4.5, "unit": 100, "name": "Tandoori Chicken Tikka"},
    "tandoori chicken": {"cals": 170, "p": 27.0, "c": 2.0, "f": 6.0, "unit": 100, "name": "Tandoori Chicken"},
    "chicken curry": {"cals": 180, "p": 22.0, "c": 4.0, "f": 8.0, "unit": 100, "name": "Desi Chicken Curry"},
    "butter chicken": {"cals": 240, "p": 18.0, "c": 8.0, "f": 15.0, "unit": 100, "name": "Butter Chicken"},
    "mutton curry": {"cals": 240, "p": 20.0, "c": 3.0, "f": 16.0, "unit": 100, "name": "Desi Mutton Curry"},
    "mutton": {"cals": 240, "p": 20.0, "c": 3.0, "f": 16.0, "unit": 100, "name": "Goat Meat (Mutton)"},
    "goat meat": {"cals": 240, "p": 20.0, "c": 3.0, "f": 16.0, "unit": 100, "name": "Goat Meat"},
    "fish curry": {"cals": 150, "p": 18.0, "c": 4.0, "f": 7.0, "unit": 100, "name": "Traditional Fish Curry"},
    "surmai": {"cals": 130, "p": 22.0, "c": 0.0, "f": 4.0, "unit": 100, "name": "Surmai (Kingfish) Fillet"},
    "rohu": {"cals": 105, "p": 17.0, "c": 0.0, "f": 3.5, "unit": 100, "name": "Rohu Fish Fillet"},
    "katla": {"cals": 105, "p": 17.0, "c": 0.0, "f": 3.5, "unit": 100, "name": "Katla Fish Fillet"},
    "pomfret": {"cals": 115, "p": 19.0, "c": 0.0, "f": 4.0, "unit": 100, "name": "Pomfret Fish"},
    "prawns": {"cals": 99, "p": 24.0, "c": 0.2, "f": 0.3, "unit": 100, "name": "Desi Prawns Masala"},
    "shrimp": {"cals": 99, "p": 24.0, "c": 0.2, "f": 0.3, "unit": 100, "name": "Shrimp"},
    "egg bhurji": {"cals": 160, "p": 13.0, "c": 3.0, "f": 11.0, "unit": 1, "name": "Desi Egg Bhurji (2 Eggs)"},
    "egg curry": {"cals": 175, "p": 13.0, "c": 6.0, "f": 11.0, "unit": 1, "name": "Dhaba Egg Curry (2 Eggs)"},
    "boiled egg": {"cals": 72, "p": 6.3, "c": 0.4, "f": 4.8, "unit": 1, "name": "Boiled Egg"},
    "boiled eggs": {"cals": 72, "p": 6.3, "c": 0.4, "f": 4.8, "unit": 1, "name": "Boiled Eggs"},
    "whole egg": {"cals": 72, "p": 6.3, "c": 0.4, "f": 4.8, "unit": 1, "name": "Whole Egg"},
    "whole eggs": {"cals": 72, "p": 6.3, "c": 0.4, "f": 4.8, "unit": 1, "name": "Whole Eggs"},
    "egg": {"cals": 72, "p": 6.3, "c": 0.4, "f": 4.8, "unit": 1, "name": "Whole Egg"},
    "eggs": {"cals": 72, "p": 6.3, "c": 0.4, "f": 4.8, "unit": 1, "name": "Whole Eggs"},
    "egg white": {"cals": 17, "p": 3.6, "c": 0.2, "f": 0.1, "unit": 1, "name": "Egg White"},
    "egg whites": {"cals": 17, "p": 3.6, "c": 0.2, "f": 0.1, "unit": 1, "name": "Egg Whites"},
    "salmon": {"cals": 208, "p": 20.0, "c": 0.0, "f": 13.0, "unit": 100, "name": "Atlantic Salmon"},
    "tuna": {"cals": 130, "p": 28.0, "c": 0.0, "f": 1.2, "unit": 100, "name": "Tuna Fillet"},
    "ground beef": {"cals": 215, "p": 26.0, "c": 0.0, "f": 12.0, "unit": 100, "name": "Lean Beef"},
    "steak": {"cals": 240, "p": 27.0, "c": 0.0, "f": 14.0, "unit": 100, "name": "Sirloin Steak"},

    # --- INDIAN DAIRY & BEVERAGES ---
    "curd": {"cals": 60, "p": 3.5, "c": 4.5, "f": 3.0, "unit": 100, "name": "Fresh Dahi (Curd)"},
    "dahi": {"cals": 60, "p": 3.5, "c": 4.5, "f": 3.0, "unit": 100, "name": "Fresh Dahi"},
    "greek yogurt": {"cals": 59, "p": 10.0, "c": 3.6, "f": 0.4, "unit": 100, "name": "Non-Fat Greek Yogurt"},
    "yogurt": {"cals": 60, "p": 3.5, "c": 4.5, "f": 3.0, "unit": 100, "name": "Curd (Dahi)"},
    "chaas": {"cals": 35, "p": 2.5, "c": 3.5, "f": 1.0, "unit": 200, "name": "Masala Chaas (Buttermilk 200ml)"},
    "buttermilk": {"cals": 35, "p": 2.5, "c": 3.5, "f": 1.0, "unit": 200, "name": "Buttermilk (Chaas 200ml)"},
    "lassi": {"cals": 150, "p": 4.0, "c": 24.0, "f": 4.0, "unit": 200, "name": "Sweet Lassi (200ml)"},
    "ghee": {"cals": 112, "p": 0.0, "c": 0.0, "f": 12.7, "unit": 1, "name": "Pure Desi Ghee (1 tbsp)"},
    "desi ghee": {"cals": 112, "p": 0.0, "c": 0.0, "f": 12.7, "unit": 1, "name": "Desi Ghee (1 tbsp)"},
    "butter": {"cals": 102, "p": 0.1, "c": 0.0, "f": 11.5, "unit": 1, "name": "White Butter (1 tbsp)"},
    "milk": {"cals": 120, "p": 7.5, "c": 11.0, "f": 4.5, "unit": 240, "name": "Cow Milk (1 glass)"},
    "cow milk": {"cals": 120, "p": 7.5, "c": 11.0, "f": 4.5, "unit": 240, "name": "Fresh Cow Milk (1 glass)"},
    "buffalo milk": {"cals": 220, "p": 9.5, "c": 12.0, "f": 15.0, "unit": 240, "name": "Buffalo Milk (1 glass)"},
    "almond milk": {"cals": 30, "p": 1.0, "c": 1.0, "f": 2.5, "unit": 240, "name": "Almond Milk (1 glass)"},
    "chai": {"cals": 75, "p": 2.0, "c": 10.0, "f": 2.5, "unit": 1, "name": "Masala Chai (1 cup)"},
    "masala chai": {"cals": 75, "p": 2.0, "c": 10.0, "f": 2.5, "unit": 1, "name": "Masala Chai (1 cup)"},
    "tea": {"cals": 75, "p": 2.0, "c": 10.0, "f": 2.5, "unit": 1, "name": "Milk Tea (1 cup)"},

    # --- INDIAN FRUITS & VEGETABLES ---
    "mango": {"cals": 60, "p": 0.8, "c": 15.0, "f": 0.4, "unit": 100, "name": "Sweet Mango"},
    "papaya": {"cals": 43, "p": 0.5, "c": 11.0, "f": 0.3, "unit": 100, "name": "Fresh Papaya"},
    "guava": {"cals": 68, "p": 2.6, "c": 14.0, "f": 1.0, "unit": 100, "name": "Guava (Amrood)"},
    "chikoo": {"cals": 83, "p": 0.4, "c": 20.0, "f": 1.1, "unit": 100, "name": "Chikoo (Sapodilla)"},
    "sapodilla": {"cals": 83, "p": 0.4, "c": 20.0, "f": 1.1, "unit": 100, "name": "Chikoo"},
    "pomegranate": {"cals": 83, "p": 1.7, "c": 19.0, "f": 1.2, "unit": 100, "name": "Pomegranate (Anar)"},
    "anar": {"cals": 83, "p": 1.7, "c": 19.0, "f": 1.2, "unit": 100, "name": "Anar"},
    "banana": {"cals": 105, "p": 1.3, "c": 27.0, "f": 0.3, "unit": 1, "name": "Banana (Kela)"},
    "kela": {"cals": 105, "p": 1.3, "c": 27.0, "f": 0.3, "unit": 1, "name": "Kela (Banana)"},
    "apple": {"cals": 95, "p": 0.5, "c": 25.0, "f": 0.3, "unit": 1, "name": "Apple (Seb)"},
    "watermelon": {"cals": 30, "p": 0.6, "c": 7.6, "f": 0.2, "unit": 100, "name": "Watermelon (Tarbooz)"},
    "palak": {"cals": 23, "p": 2.9, "c": 3.6, "f": 0.4, "unit": 100, "name": "Fresh Palak (Spinach)"},
    "spinach": {"cals": 23, "p": 2.9, "c": 3.6, "f": 0.4, "unit": 100, "name": "Baby Spinach"},
    "bhindi": {"cals": 33, "p": 1.9, "c": 7.5, "f": 0.2, "unit": 100, "name": "Bhindi (Okra)"},
    "okra": {"cals": 33, "p": 1.9, "c": 7.5, "f": 0.2, "unit": 100, "name": "Okra (Bhindi)"},
    "gobhi": {"cals": 25, "p": 1.9, "c": 5.0, "f": 0.3, "unit": 100, "name": "Phool Gobhi (Cauliflower)"},
    "cauliflower": {"cals": 25, "p": 1.9, "c": 5.0, "f": 0.3, "unit": 100, "name": "Cauliflower"},
    "broccoli": {"cals": 34, "p": 2.8, "c": 7.0, "f": 0.4, "unit": 100, "name": "Steamed Broccoli"},
    "aloo": {"cals": 77, "p": 2.0, "c": 17.0, "f": 0.1, "unit": 100, "name": "Aloo (Potato)"},
    "potato": {"cals": 77, "p": 2.0, "c": 17.0, "f": 0.1, "unit": 100, "name": "Boiled Russet Potato"},
    "sweet potato": {"cals": 86, "p": 1.6, "c": 20.0, "f": 0.1, "unit": 100, "name": "Shakarkandi (Sweet Potato)"},
    "baingan": {"cals": 25, "p": 1.0, "c": 6.0, "f": 0.2, "unit": 100, "name": "Baingan Bharta (Eggplant)"},
    "karela": {"cals": 17, "p": 1.0, "c": 3.7, "f": 0.2, "unit": 100, "name": "Karela (Bitter Gourd)"},
    "methi": {"cals": 49, "p": 4.4, "c": 6.0, "f": 0.9, "unit": 100, "name": "Fresh Methi Leaves"},
    "cucumber": {"cals": 15, "p": 0.7, "c": 3.6, "f": 0.1, "unit": 100, "name": "Kheera (Cucumber)"},
    "kheera": {"cals": 15, "p": 0.7, "c": 3.6, "f": 0.1, "unit": 100, "name": "Kheera (Cucumber)"},

    # --- SUPPLEMENTS, NUTS & GLOBAL STAPLES ---
    "whey protein": {"cals": 120, "p": 24.0, "c": 3.0, "f": 1.5, "unit": 1, "name": "Whey Protein Scoop"},
    "whey": {"cals": 120, "p": 24.0, "c": 3.0, "f": 1.5, "unit": 1, "name": "Whey Protein Scoop"},
    "protein powder": {"cals": 120, "p": 24.0, "c": 3.0, "f": 1.5, "unit": 1, "name": "Protein Powder Scoop"},
    "oats": {"cals": 389, "p": 16.9, "c": 66.3, "f": 6.9, "unit": 100, "name": "Rolled Oats"},
    "oatmeal": {"cals": 150, "p": 5.0, "c": 27.0, "f": 2.5, "unit": 100, "name": "Cooked Oatmeal"},
    "peanut butter": {"cals": 95, "p": 4.0, "c": 3.0, "f": 8.0, "unit": 1, "name": "Peanut Butter (1 tbsp)"},
    "peanuts": {"cals": 160, "p": 7.0, "c": 5.0, "f": 14.0, "unit": 28, "name": "Roasted Peanuts (1 oz)"},
    "almonds": {"cals": 164, "p": 6.0, "c": 6.0, "f": 14.0, "unit": 28, "name": "Badam (Almonds 1 oz)"},
    "badam": {"cals": 164, "p": 6.0, "c": 6.0, "f": 14.0, "unit": 28, "name": "Badam (Almonds)"},
    "kaju": {"cals": 157, "p": 5.0, "c": 9.0, "f": 12.0, "unit": 28, "name": "Kaju (Cashews 1 oz)"},
    "cashews": {"cals": 157, "p": 5.0, "c": 9.0, "f": 12.0, "unit": 28, "name": "Cashews (1 oz)"},
    "walnuts": {"cals": 185, "p": 4.3, "c": 3.9, "f": 18.5, "unit": 28, "name": "Akhrot (Walnuts 1 oz)"},
    "akhrot": {"cals": 185, "p": 4.3, "c": 3.9, "f": 18.5, "unit": 28, "name": "Akhrot (Walnuts)"},
    "olive oil": {"cals": 119, "p": 0.0, "c": 0.0, "f": 13.5, "unit": 1, "name": "Olive Oil (1 tbsp)"},
    "mustard oil": {"cals": 120, "p": 0.0, "c": 0.0, "f": 13.6, "unit": 1, "name": "Mustard Oil (1 tbsp)"},
    "oil": {"cals": 119, "p": 0.0, "c": 0.0, "f": 13.5, "unit": 1, "name": "Cooking Oil (1 tbsp)"},
    "sourdough bread": {"cals": 120, "p": 4.5, "c": 24.0, "f": 1.0, "unit": 1, "name": "Sourdough Bread Slice"},
    "bread": {"cals": 80, "p": 4.0, "c": 15.0, "f": 1.0, "unit": 1, "name": "Bread Slice"},
    "toast": {"cals": 80, "p": 4.0, "c": 15.0, "f": 1.0, "unit": 1, "name": "Toast Slice"},
    "pizza": {"cals": 285, "p": 12.0, "c": 36.0, "f": 10.0, "unit": 1, "name": "Pizza Slice"},
    "burger": {"cals": 540, "p": 30.0, "c": 45.0, "f": 26.0, "unit": 1, "name": "Burger"},
    "sandwich": {"cals": 350, "p": 22.0, "c": 38.0, "f": 12.0, "unit": 1, "name": "Sandwich"},
}

WORD_TO_NUM = {
    "half a": 0.5, "half an": 0.5, "half": 0.5,
    "a": 1.0, "an": 1.0, "one": 1.0, "single": 1.0,
    "two": 2.0, "double": 2.0, "couple": 2.0,
    "three": 3.0, "triple": 3.0, "few": 3.0,
    "four": 4.0, "five": 5.0, "six": 6.0,
    "seven": 7.0, "eight": 8.0, "nine": 9.0, "ten": 10.0,
    "ek": 1.0, "do": 2.0, "teen": 3.0, "char": 4.0, "paanch": 5.0
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
                sanitized = re.sub(r'[\r\n\t]+', ' ', matched_str)
                return json.loads(sanitized, strict=False)
            except Exception:
                pass
    return None


def _call_huggingface_llm(system_prompt: str, user_prompt: str, timeout_seconds: float = 3.0) -> Optional[str]:
    """
    Calls open-source LLM models via Hugging Face Serverless Inference Router.
    Prioritizes top responsive instruct models with tight timeout protection.
    """
    hf_token = os.getenv("HUGGINGFACE_API_KEY") or os.getenv("HF_TOKEN")
    if not hf_token:
        return None

    try:
        from huggingface_hub import InferenceClient
        client = InferenceClient(token=hf_token, timeout=timeout_seconds)

        models = [
            "Qwen/Qwen2.5-Coder-32B-Instruct",
            "Qwen/Qwen2.5-72B-Instruct"
        ]

        for model in models:
            try:
                response = client.chat_completion(
                    model=model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    max_tokens=650,
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
    Parses unstructured food text (e.g. '3 rotis, 150g paneer bhurji, and 1 bowl dal' or '200g chicken breast with rice')
    using Open-Source Hugging Face AI with high-precision Indian & Global semantic fallback.
    """
    cleaned = input_text.strip()
    if not cleaned:
        return {
            "parsed_successfully": False,
            "inferred_name": "UNSPECIFIED MEAL",
            "macros": {"calories": 0, "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 0.0}
        }

    # 1. Try Hugging Face Open-Source Model with 2.5s timeout
    hf_system = (
        "You are an elite sports nutritionist proficient in Global and Indian foods (Rotis, Dals, Paneer, Soya Chunks, Biryanis, etc.). "
        "Output strict JSON with keys: "
        "parsed_successfully (boolean), inferred_name (string), macros (object with integer calories, float protein_g, float carbs_g, float fat_g). "
        "Do not include any extra text, only raw JSON."
    )
    try:
        hf_response = _call_huggingface_llm(hf_system, f"Calculate macros for: '{cleaned}'", timeout_seconds=2.5)
        if hf_response:
            data = _extract_and_parse_json(hf_response)
            if data and "macros" in data and "calories" in data["macros"]:
                cal_val = int(data["macros"]["calories"])
                p_val = round(float(data["macros"].get("protein_g", data["macros"].get("protein", 0))), 1)
                c_val = round(float(data["macros"].get("carbs_g", data["macros"].get("carbs", 0))), 1)
                f_val = round(float(data["macros"].get("fat_g", data["macros"].get("fat", 0))), 1)
                if cal_val > 0 or p_val > 0:
                    return {
                        "parsed_successfully": True,
                        "inferred_name": str(data.get("inferred_name", cleaned[:35])).upper(),
                        "macros": {
                            "calories": cal_val,
                            "protein_g": p_val,
                            "carbs_g": c_val,
                            "fat_g": f_val
                        }
                    }
    except Exception as hf_err:
        print(f"[parse_food_string] HF parsing fallback: {hf_err}")

    # 2. Local Open-Source Semantic Tokenizer & Deep Indian & Global Nutrient Solver
    normalized_input = cleaned.lower()
    for phrase, num in sorted(WORD_TO_NUM.items(), key=lambda x: len(x[0]), reverse=True):
        normalized_input = re.sub(r'\b' + phrase + r'\b', str(num), normalized_input)

    total_cals = 0
    total_protein = 0.0
    total_carbs = 0.0
    total_fat = 0.0
    found_items = []

    # Split on commas, 'and', '+', 'with', 'aur', 'saath', or newlines
    segments = re.split(r'[,+\n]|(?:\band\b)|(?:\bwith\b)|(?:\baur\b)|(?:\bsaath\b)', normalized_input)

    for seg in segments:
        seg = seg.strip()
        if not seg:
            continue

        # Regex extractors for varied units (grams, kg, bowls, katori, glasses, rotis, pieces, scoops, spoons)
        match_grams = re.search(r'(\d+(?:\.\d+)?)\s*(?:g|grams?|gm)\b\s*(?:of\s*)?([a-z\s]+)', seg)
        match_kg = re.search(r'(\d+(?:\.\d+)?)\s*(?:kg|kilos?)\b\s*(?:of\s*)?([a-z\s]+)', seg)
        match_oz = re.search(r'(\d+(?:\.\d+)?)\s*(?:oz|ounces?)\b\s*(?:of\s*)?([a-z\s]+)', seg)
        match_lbs = re.search(r'(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)\b\s*(?:of\s*)?([a-z\s]+)', seg)
        match_tbsp = re.search(r'(\d+(?:\.\d+)?)\s*(?:tbsp|tablespoons?|tbsps?|spoons?|chamach)\b\s*(?:of\s*)?([a-z\s]+)', seg)
        match_tsp = re.search(r'(\d+(?:\.\d+)?)\s*(?:tsp|teaspoons?)\b\s*(?:of\s*)?([a-z\s]+)', seg)
        match_cups = re.search(r'(\d+(?:\.\d+)?)\s*(?:cups?|bowls?|katori|katoris)\b\s*(?:of\s*)?([a-z\s]+)', seg)
        match_glasses = re.search(r'(\d+(?:\.\d+)?)\s*(?:glass|glasses)\b\s*(?:of\s*)?([a-z\s]+)', seg)
        match_ml = re.search(r'(\d+(?:\.\d+)?)\s*(?:ml|milliliters?)\b\s*(?:of\s*)?([a-z\s]+)', seg)
        match_scoops = re.search(r'(\d+(?:\.\d+)?)\s*(?:scoops?|servings?|slices?|pieces?|can|cans|bars?|wraps?|plate|plates)\b\s*(?:of\s*)?([a-z\s]+)', seg)
        match_count = re.search(r'^(\d+(?:\.\d+)?)\s+([a-z\s]+)', seg)

        qty = 1.0
        unit_type = "items"
        item_name = seg

        if match_grams:
            qty = float(match_grams.group(1))
            unit_type = "grams"
            item_name = match_grams.group(2).strip()
        elif match_kg:
            qty = float(match_kg.group(1)) * 1000.0
            unit_type = "grams"
            item_name = match_kg.group(2).strip()
        elif match_oz:
            qty = float(match_oz.group(1)) * 28.35
            unit_type = "grams"
            item_name = match_oz.group(2).strip()
        elif match_lbs:
            qty = float(match_lbs.group(1)) * 453.6
            unit_type = "grams"
            item_name = match_lbs.group(2).strip()
        elif match_ml:
            qty = float(match_ml.group(1))
            unit_type = "ml"
            item_name = match_ml.group(2).strip()
        elif match_glasses:
            qty = float(match_glasses.group(1)) * 240.0
            unit_type = "ml"
            item_name = match_glasses.group(2).strip()
        elif match_tbsp:
            qty = float(match_tbsp.group(1))
            unit_type = "tbsp"
            item_name = match_tbsp.group(2).strip()
        elif match_tsp:
            qty = float(match_tsp.group(1)) * 0.33
            unit_type = "tbsp"
            item_name = match_tsp.group(2).strip()
        elif match_cups:
            qty = float(match_cups.group(1)) * 180.0
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

        # Clean noise words
        item_name = re.sub(r'\b(of|fresh|cooked|raw|baked|grilled|steamed|seared|whole|slices?|pieces?|desi|boiled|fried|tadka|ghar ka)\b', '', item_name).strip()

        # Match against food database prioritizing longest matching keys
        matched_food = None
        for key in sorted(FOOD_DATABASE.keys(), key=lambda k: len(k), reverse=True):
            if key in item_name or item_name in key:
                matched_food = (key, FOOD_DATABASE[key])
                break

        if matched_food:
            key, val = matched_food
            found_items.append(val["name"])
            multiplier = 1.0

            if val["unit"] == 1:
                # Per item/piece/roti/scoop/tbsp
                multiplier = qty
            elif val["unit"] == 200 or val["unit"] == 240:
                # Liquid volume (glass, cup, or ml)
                if unit_type == "ml":
                    multiplier = qty / float(val["unit"])
                elif unit_type == "grams":
                    multiplier = qty / float(val["unit"])
                else:
                    multiplier = qty
            elif val["unit"] == 28:
                # 1 oz serving (nuts, cheese)
                if unit_type == "grams":
                    multiplier = qty / 28.0
                else:
                    multiplier = qty
            else:
                # 100g base serving
                if unit_type == "grams":
                    multiplier = qty / 100.0
                elif unit_type == "items":
                    multiplier = qty
                else:
                    multiplier = qty

            total_cals += int(val["cals"] * multiplier)
            total_protein += val["p"] * multiplier
            total_carbs += val["c"] * multiplier
            total_fat += val["f"] * multiplier
        else:
            # Fallback estimation for unrecognized ingredient item
            clean_item_name = item_name.strip().title()
            if clean_item_name:
                found_items.append(clean_item_name)
                total_cals += int(150 * qty)
                total_protein += 8.0 * qty
                total_carbs += 18.0 * qty
                total_fat += 4.0 * qty

    inferred_name = " + ".join(found_items[:3]) if found_items else cleaned[:35].title()

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
    Generates a structured full-day nutrition protocol using open-source AI models & pantry inventory (Indian & Global standards).
    """
    ing_text = ", ".join(ingredients) if ingredients else "Paneer, Eggs, Whole Wheat Rotis, Moong Dal, Oats, Spinach, Dahi"

    # 1. Try Hugging Face Open-Source Planner
    hf_system = (
        "You are an elite sports nutritionist proficient in Global and Indian athletic diets. "
        "Output strict JSON with format: "
        '{"plan_summary": "string", "meals": [{"meal_slot": "BREAKFAST / LUNCH / DINNER", "name": "NAME", "calories": int, "protein_g": float, "carbs_g": float, "fat_g": float, "used_ingredients": ["list"], "instructions": "string"}]}'
    )
    user_prompt = (
        f"Create a {meal_count}-meal full-day protocol fitting target {target_calories} kcal, {target_protein}g protein, {target_carbs}g carbs, {target_fat}g fat. "
        f"Goal: {fitness_goals} ({body_type}). Available kitchen/pantry items: {ing_text}."
    )
    try:
        hf_response = _call_huggingface_llm(hf_system, user_prompt, timeout_seconds=3.0)
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
    except Exception as plan_err:
        print(f"[generate_pantry_full_day_plan] HF fallback: {plan_err}")

    # 2. Local Heuristic Engine with Indian & Global Athletic Defaults
    meal_slots = ["BREAKFAST // ANABOLIC MORNING PRIMER", "LUNCH // MIDDAY NITROGEN CORE", "DINNER // SUSTAINED NIGHT RECOVERY"]
    if meal_count == 4:
        meal_slots.append("SNACK // HIGH-PROTEIN FUEL")
    elif meal_count == 2:
        meal_slots = ["BRUNCH // PEAK ANABOLIC WINDOW", "DINNER // RECOVERY SYNTHESIS"]

    cals_per_meal = target_calories // len(meal_slots)
    prot_per_meal = round(target_protein / len(meal_slots), 1)
    carbs_per_meal = round(target_carbs / len(meal_slots), 1)
    fat_per_meal = round(target_fat / len(meal_slots), 1)

    recipes = []
    for idx, slot_name in enumerate(meal_slots):
        if idx == 0:
            name = "Desi Anabolic Breakfast Bowl"
            inst = f"Cook or scramble morning staples ({ing_text[:40]}). Pair with whole wheat toast/phulkas and fresh curd or chaas for quick metabolic activation."
            cals = cals_per_meal
            prot = prot_per_meal
            carbs = carbs_per_meal
            fat = fat_per_meal
        elif idx == 1:
            name = "High-Protein Midday Anabolic Plate"
            inst = f"Combine key protein staples ({ing_text}) with complex carbohydrates (steamed rice or whole wheat rotis) and fresh greens for maximal glycogen storage."
            cals = int(cals_per_meal * 1.05)
            prot = round(prot_per_meal * 1.05, 1)
            carbs = round(carbs_per_meal * 1.1, 1)
            fat = round(fat_per_meal * 0.9, 1)
        elif idx == 2:
            name = "Nighttime Anabolic Recovery Plate"
            inst = f"Prepare slow-digesting protein (Paneer / Soya / Chicken / Fish) with warm rotis/rice and spiced veggies from pantry items ({ing_text})."
            cals = int(cals_per_meal * 0.95)
            prot = round(prot_per_meal * 0.95, 1)
            carbs = round(carbs_per_meal * 0.9, 1)
            fat = round(fat_per_meal * 1.1, 1)
        else:
            name = "Tactical Sattu & Whey Protein Booster"
            inst = f"Quick-prep high-nitrogen shake or roasted nut mix utilizing available pantry ingredients ({ing_text}) for instant amino acid delivery."
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
    Synthesizes custom meal protocol targeted to exact remaining macro targets and optional user prompt (Indian & Global standards).
    """
    calories = max(100, int(calories))
    protein = round(max(10.0, float(protein_g)), 1)
    carbs = round(max(5.0, float(carbs_g)), 1)
    fat = round(max(3.0, float(fat_g)), 1)
    user_query = (prompt or "").strip()

    # 1. Try Hugging Face Open-Source LLM
    hf_system = (
        "You are an elite sports nutrition strategist and culinary chef proficient in Indian and International cuisines. "
        "Create a single meal recipe tailored precisely to the user's macro targets and preferences. "
        "Output strict JSON with format: "
        '{"name": "MEAL NAME", "calories": int, "protein": float, "carbs": float, "fat": float, "instructions": "Step 1: ... Step 2: ..."}. '
        "Do not include code markdown or any conversational filler, only raw JSON."
    )
    user_prompt = (
        f"Goal: {fitness_goals}. "
        f"Target Macros: {calories} kcal, {protein}g protein, {carbs}g carbs, {fat}g fat. "
        f"User Meal Request: '{user_query if user_query else 'High protein nutrient dense Indian or Global meal'}'."
    )

    try:
        hf_response = _call_huggingface_llm(hf_system, user_prompt, timeout_seconds=3.0)
        if hf_response:
            data = _extract_and_parse_json(hf_response)
            if data and "name" in data and "instructions" in data:
                name_val = str(data.get("name", "Custom Anabolic Bowl")).upper()
                inst_val = str(data.get("instructions", "Cook protein with complex carbs and healthy fats."))
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
    except Exception as strat_err:
        print(f"[generate_strategist_meal_suggestion] HF fallback: {strat_err}")

    # 2. Dynamic Semantic Fallback Engine based on prompt keywords and macros (Indian & Global)
    q = user_query.lower()
    
    # Calculate realistic ingredient quantities based on macro targets
    chicken_g = int((protein / 0.31))
    paneer_g = int((protein / 0.18))
    soya_g = int((protein / 0.52))
    salmon_g = int((protein / 0.20))
    egg_whites_count = max(3, int(protein / 3.6))
    roti_count = max(1, int(carbs / 20.0))
    rice_g = max(50, int(carbs / 0.28))
    ghee_tbsp = max(1, round(fat / 12.7, 1))

    if "paneer" in q or "vegetarian" in q or "veg" in q:
        name = "Tandoori Paneer Tikka & Whole Wheat Phulkas"
        instructions = f"Marinate {paneer_g}g low-fat paneer in hung curd, turmeric, red chilli powder, and garam masala. Pan-sear in {ghee_tbsp} tbsp desi ghee until golden. Serve with {roti_count} fresh hot phulkas and mint chutney for ~{protein}g clean vegetarian protein."
        cal_val = calories
    elif "soya" in q or "chunks" in q or "plant" in q:
        name = "High-Protein Soya Chunks & Dal Khichdi Bowl"
        instructions = f"Boil and squeeze {soya_g}g soya chunks. Saute with onions, tomatoes, and cumin. Mix with {rice_g}g cooked moong dal khichdi. Top with fresh coriander for an ultra-high protein ~{protein}g plant meal."
        cal_val = calories
    elif "chana" in q or "chole" in q or "rajma" in q:
        name = "Punjabi Rajma & Jeera Rice Muscle Fuel"
        instructions = f"Simmer 200g boiled rajma/chole in aromatic tomato-onion gravy. Pair with {rice_g}g fragrant jeera rice and a side of fresh cucumber kachumber salad hitting ~{protein}g protein."
        cal_val = calories
    elif "sattu" in q or "chilla" in q or "besan" in q:
        name = "Stuffed Besan Chilla with Paneer & Mint Dahi"
        instructions = f"Whisk 80g besan with water, green chillies, and ajwain. Pour on hot tawa and stuff with 75g grated paneer. Serve with 100g chilled dahi (curd) and roasted cumin."
        cal_val = calories
    elif "bhurji" in q or "egg" in q or "anda" in q:
        name = "Spicy Desi Egg Bhurji & Multigrain Rotis"
        instructions = f"Scramble {egg_whites_count} egg whites + 2 whole eggs with chopped onions, tomatoes, ginger, and green chillies in 1 tbsp desi ghee. Serve hot with {roti_count} soft rotis."
        cal_val = calories
    elif "biryani" in q:
        name = "Anabolic Low-Oil Chicken Biryani"
        instructions = f"Layer {chicken_g}g spiced chicken breast marinated in curd with {rice_g}g basmati rice and saffron water. Dum cook for 15 mins. Serve with cucumber raita."
        cal_val = calories
    elif "fish" in q or "surmai" in q or "rohu" in q or "seafood" in q:
        name = "Tawa Pan-Seared Surmai & Steamed Rice"
        instructions = f"Rub {salmon_g}g fresh surmai/fish fillet with turmeric, red chilli, and lemon juice. Pan-sear on tawa with 1 tbsp coconut/mustard oil. Serve with {rice_g}g steamed rice and dal."
        cal_val = calories
    elif "shake" in q or "smoothie" in q or "lassi" in q:
        name = "High-Protein Sattu & Whey Anabolic Lassi"
        instructions = f"Blend 1 scoop whey protein with 2 tbsp roasted sattu, 150g cold dahi (curd), 1 medium banana, and a pinch of roasted cumin and black salt for instant recovery."
        cal_val = calories
    else:
        name = f"Desi Anabolic Chicken Tikka & Roti Protocol ({fitness_goals.upper()})"
        instructions = f"Pan-sear {chicken_g}g diced chicken breast in 1 tbsp ghee with ginger-garlic paste and spices. Serve with {roti_count} warm whole wheat rotis and a bowl of yellow tadka dal."
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
