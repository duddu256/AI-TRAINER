import os
import re
import logging
import threading
from typing import Dict, Optional

import requests

logger = logging.getLogger("auratrainer.usda")

# USDA FoodData Central search API. DEMO_KEY works without sign-up but is limited to
# roughly 30 requests/hour per IP, so production should set USDA_API_KEY
# (free from https://fdc.nal.usda.gov/api-key-signup).
FDC_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search"
USDA_TIMEOUT_SECONDS = 4.0

# Foundation and SR Legacy are lab-analysed generic foods reported per 100g;
# Branded/Survey entries are per-serving or mixed dishes and match generic queries badly.
FDC_DATA_TYPES = "Foundation,SR Legacy"

# FDC nutrient numbers. Energy may be reported as 208 (kcal), or on Foundation foods
# only as Atwater energy (958 specific, 957 general).
_ENERGY_NUMBERS = ("208", "958", "957")
_PROTEIN, _FAT, _CARBS = "203", "204", "205"

_STOPWORDS = {"raw", "cooked", "boiled", "fresh", "whole", "plain", "with", "and", "of", "the", "a"}

# Per-process cache: the same staple ("rice", "egg") is looked up constantly.
_cache: Dict[str, Optional[Dict[str, float]]] = {}
_cache_lock = threading.Lock()
_CACHE_MAX = 512


def _tokens(text: str) -> set:
    return {t for t in re.findall(r"[a-z]+", text.lower()) if t not in _STOPWORDS and len(t) > 2}


def _nutrient_map(food: dict) -> Dict[str, float]:
    values: Dict[str, float] = {}
    for n in food.get("foodNutrients", []) or []:
        number = str(n.get("nutrientNumber", ""))
        unit = str(n.get("unitName", "")).upper()
        value = n.get("value")
        if value is None or number in values:
            continue
        if number in _ENERGY_NUMBERS and unit != "KCAL":
            continue
        values[number] = float(value)
    return values


def _parse_food(food: dict) -> Optional[Dict[str, float]]:
    nutrients = _nutrient_map(food)
    kcal = next((nutrients[n] for n in _ENERGY_NUMBERS if n in nutrients), None)
    protein, fat, carbs = nutrients.get(_PROTEIN), nutrients.get(_FAT), nutrients.get(_CARBS)
    if protein is None or fat is None or carbs is None:
        return None
    if kcal is None:
        kcal = protein * 4 + carbs * 4 + fat * 9
    return {
        "calories": kcal,
        "protein_g": protein,
        "carbs_g": carbs,
        "fat_g": fat,
        "description": str(food.get("description", "")),
        "fdc_id": food.get("fdcId"),
    }


def lookup_per_100g(query: str) -> Optional[Dict[str, float]]:
    """
    Returns macros per 100g for the best FoodData Central match to `query`
    ({calories, protein_g, carbs_g, fat_g, description, fdc_id}), or None when there is
    no confident match, the API is unreachable or the key is rate-limited.
    A match must share at least one meaningful word with the query, so "paneer" never
    silently resolves to an unrelated food.
    """
    key = query.strip().lower()
    if not key:
        return None
    with _cache_lock:
        if key in _cache:
            return _cache[key]

    result = None
    try:
        resp = requests.get(
            FDC_SEARCH_URL,
            params={
                "api_key": os.getenv("USDA_API_KEY") or "DEMO_KEY",
                "query": key,
                "dataType": FDC_DATA_TYPES,
                "pageSize": 5,
            },
            timeout=USDA_TIMEOUT_SECONDS,
        )
        resp.raise_for_status()
        query_tokens = _tokens(key)
        for food in resp.json().get("foods", []) or []:
            if query_tokens and not (query_tokens & _tokens(str(food.get("description", "")))):
                continue
            parsed = _parse_food(food)
            if parsed:
                result = parsed
                break
    except Exception as e:
        # Network / quota failures are not cached, so the next request retries.
        logger.warning(f"USDA lookup failed for '{key}': {e}")
        return None

    with _cache_lock:
        if len(_cache) >= _CACHE_MAX:
            _cache.clear()
        _cache[key] = result
    return result
