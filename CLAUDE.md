# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code. Expo APIs change significantly between SDK versions.

## Commands

```bash
npm start          # Start Expo dev server (shows QR code for Expo Go)
npm run ios        # Start with iOS simulator
npm run android    # Start with Android emulator
npm run web        # Start for browser
```

There is no lint or test script configured. To verify changes:

```bash
npx tsc --noEmit                          # type-check (strict mode)
npx expo export --platform ios --output-dir /tmp/exp   # full bundle compile — catches Metro/Babel/resolution errors tsc can't
```

When adding new Expo/React Native packages, always use `npx expo install <package>` instead of `npm install` — this resolves the SDK 54 compatible version automatically. Some packages (e.g. NativeWind) trip npm's peer-dependency resolver because Expo pins `react`; add `--legacy-peer-deps` when a plain `npm install` fails with an `ERESOLVE` error.

## Stack

- **Expo SDK 54** — targeted at Expo Go 54.x on device
- **React Native 0.81** / **React 19.1**
- **Expo Router 6** — file-based routing via the `app/` directory
- **NativeWind 4** — Tailwind CSS utility classes (`className`) on React Native components, backed by Tailwind v3
- **TypeScript** in strict mode

## What this app is

A tracker for **NYC gay bars**: browse bars in a list or map view, log how many (and what kind of) drinks you've had at each bar, and review a history of past visits. The bar list is a curated static dataset (gaycities.com blocks scraping).

## Architecture

### Routing (`app/`)
Expo Router maps files in `app/` to routes automatically. `_layout.tsx` at each level defines the navigator wrapping its siblings. The root layout (`app/_layout.tsx`) mounts `VisitsProvider` (inside `GestureHandlerRootView` + `SafeAreaProvider`) so all screens share state, imports `global.css`, then renders a `<Stack>`.

- `app/(tabs)/` is a bottom-tab group with two tabs: `index.tsx` (**Explore** — List/Map toggle) and `history.tsx` (**History**).
- `app/bar/[id].tsx` is a stack screen presented as a **modal** for logging drinks at a single bar.

New screens are created by adding files to `app/`. Nested layouts work by adding a subdirectory with its own `_layout.tsx`.

### Data (`lib/`)
- `lib/types.ts` — `Bar`, `Visit`, `DrinkEntry`.
- `lib/bars.ts` — the curated `BARS` array (name, neighborhood, address, lat/lng), `NYC_REGION`, and `getBarById`.
- `lib/drinks.ts` — `PRESET_DRINKS` and `drinkEmoji`.

### State (`lib/VisitsContext.tsx`)
All app state lives in a single React Context (`VisitsProvider`). It holds `visits: Visit[]` in `useState`, **persisted to AsyncStorage** (`@gaybars/visits`) — hydrated on mount, saved on every change. The context exposes `logDrink`, `removeDrink`, `getTodayVisit`, `getVisitsForBar`, and `clearVisit`. A visit aggregates drinks per type for one calendar day; `logDrink`/`removeDrink` find-or-create today's visit for a bar. `getDrinkTotal(visit)` is exported separately.

Screens consume state via the `useVisits()` hook.

### Styling
NativeWind lets you use `className` on any React Native core component. The Tailwind config scans `app/**` and `components/**`. All Tailwind directives live in `global.css`, which is imported once in `app/_layout.tsx`.

Do not use `StyleSheet.create` for new code — use `className` instead. Conditional classes must use fully-spelled-out class names in ternaries (not string concatenation), so NativeWind's static scanner can detect them.

### Maps
The map view uses `react-native-maps`, which **works in Expo Go on SDK 54** with no native setup (Apple Maps on iOS, no API key). Do not switch to `expo-maps` — it requires a custom dev build and would break the Expo Go target. `MapView` needs explicit dimensions via `style`, not `className`.

### Key config files
- `babel.config.js` — sets `jsxImportSource: "nativewind"`, includes the `nativewind/babel` preset, and lists `react-native-worklets/plugin` **last** (reanimated v4 moved its babel plugin into `react-native-worklets`)
- `metro.config.js` — wraps default Expo config with `withNativeWind`, pointing at `global.css`
- `tailwind.config.js` — includes `nativewind/preset`, sets content paths, and defines the `primary`/`ink` color palette
- `nativewind-env.d.ts` — provides TypeScript types for `className` prop
- `babel-preset-expo` is pinned as a direct devDependency so Babel can resolve it from the project root (npm nests it under `expo/` otherwise)
