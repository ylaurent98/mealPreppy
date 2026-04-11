# Database Setup

## Files

- `schema.sql`
  Canonical snapshot of the current schema.
- `migrations/0001_initial_schema.sql`
  Initial migration-style schema file.
- `seeds/001_seed_default_recipes.sql`
  Deterministic development seed data for a demo user plus the first draft recipes.

## Suggested Run Order

1. Run `migrations/0001_initial_schema.sql`
2. Run `seeds/001_seed_default_recipes.sql`

## Example With psql

```sql
\i db/migrations/0001_initial_schema.sql
\i db/seeds/001_seed_default_recipes.sql
```

## Seed Notes

- Seed user email: `demo@mealpreppy.local`
- Recipe seeds are intentionally partial where your source notes were incomplete.
- Incomplete ingredient lines are preserved and marked with `is_incomplete = true`.
- Shopping-list category defaults are seeded at ingredient level and can still be overridden later.
- Ingredient nutrition values are not fully populated yet; the seed is focused on structure and recipe drafting first.
