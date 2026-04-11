# Mealpreppy App

Frontend MVP for the Mealpreppy meal planning app.

## What Is Built

- default recipe library
- dated weekly recipe versions
- editable ingredients, servings, and manual macros
- `Make` action that creates individual meal boxes
- drag-and-drop weekly planner for breakfast, lunch, dinner, and snack
- standalone snack / extra items
- partial portion tracking
- grouped shopping list
- saved history view
- average calorie / protein stats

## Tech

- React
- TypeScript
- Vite
- localStorage persistence for the MVP frontend

## Run

```bash
npm install
npm run dev
```

Then open the local URL Vite prints in the terminal.

## Build

```bash
npm run build
```

## Notes

- This frontend currently stores data in the browser so you can use it immediately.
- The database work is already drafted separately in `../db/`.
- Accounts, auth, and the live backend are still future steps.
