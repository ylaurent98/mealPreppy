# MyFitnessPal Local Import

`python-myfitnesspal` uses local browser cookies. This means it works on your own machine after you sign in to MyFitnessPal in your browser.

## 1) Install helper dependency

```bash
pip install -r requirements-mfp.txt
```

## 2) Search foods

```bash
python tools/mfp_food_search.py "banana" --limit 5
```

## 3) Paste into Mealpreppy

1. Open `Ingredients DB`.
2. Use the `MyFitnessPal Import (Local)` box.
3. Paste one JSON result or the full array.
4. Click `Use for draft ingredient`.
5. Adjust grams-per-unit if needed, then save ingredient.

## Notes

- Imported macros are from the serving data returned by MyFitnessPal.
- You should set `unit` grams accurately for precise recipe calculations.
