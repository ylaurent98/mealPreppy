# Mealpreppy

Mealpreppy is a meal prep planning app with versioned weekly recipes, draggable meal boxes, shopping lists, history, and stats.

## Project Layout

- `app/`
  React + TypeScript frontend MVP
- `db/`
  PostgreSQL schema, migration snapshot, and deterministic recipe seed SQL
- `docs/`
  product specification and seed recipe notes

## Run The Frontend

```bash
cd app
npm install
npm run dev
```

## Build The Frontend

```bash
cd app
npm run build
```

## Database Files

Run these in order when you are ready to stand up the backend database:

1. `db/migrations/0001_initial_schema.sql`
2. `db/seeds/001_seed_default_recipes.sql`

## Current State

- The frontend MVP is runnable now.
- It persists in browser localStorage.
- The backend database design exists, but it is not connected to the frontend yet.
- Auth and accounts are not implemented yet.
