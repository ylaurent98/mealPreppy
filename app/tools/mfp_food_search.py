#!/usr/bin/env python3
"""
Local helper for importing MyFitnessPal food data into Mealpreppy.

Usage:
  python tools/mfp_food_search.py "banana" --limit 5
"""

from __future__ import annotations

import argparse
import json
from typing import Any

import myfitnesspal


def as_float(value: Any) -> float:
    try:
        if value is None:
            return 0.0
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def get_attr(obj: Any, name: str, fallback: Any = "") -> Any:
    return getattr(obj, name, fallback)


def to_result(item: Any) -> dict[str, Any]:
    return {
        "mfpId": str(get_attr(item, "mfp_id", "")),
        "name": str(get_attr(item, "name", "")),
        "brand": str(get_attr(item, "brand", "")),
        "serving": str(get_attr(item, "serving", "")),
        "nutritionPerServing": {
            "calories": as_float(get_attr(item, "calories", 0)),
            "protein": as_float(get_attr(item, "protein", 0)),
            "carbs": as_float(
                get_attr(item, "carbohydrates", get_attr(item, "carbs", 0)),
            ),
            "fat": as_float(get_attr(item, "fat", 0)),
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("query", help="Food query to search")
    parser.add_argument("--limit", type=int, default=5, help="Max results")
    args = parser.parse_args()

    client = myfitnesspal.Client()
    items = client.get_food_search_results(args.query)[: max(1, args.limit)]
    payload = [to_result(item) for item in items]
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
