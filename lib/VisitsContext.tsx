import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Visit } from "./types";

const STORAGE_KEY = "@gaybars/visits";
const VISITED_KEY = "@gaybars/visited";

type VisitsContextValue = {
  /** All visits, most recent first. */
  visits: Visit[];
  /** True until the persisted state has been loaded from storage. */
  hydrated: boolean;
  /** Log a drink at a bar. `day` is a dayKey; defaults to today. */
  logDrink: (barId: string, type: string, day?: string) => void;
  removeDrink: (barId: string, type: string, day?: string) => void;
  /** A bar's visit on a given day (default today), or undefined if none. */
  getVisitFor: (barId: string, day?: string) => Visit | undefined;
  getVisitsForBar: (barId: string) => Visit[];
  /** All visits on a given local day (see dayKey), most recent first. */
  getVisitsForDay: (day: string) => Visit[];
  clearVisit: (visitId: string) => void;
  /** Clear logged drink history. If includeVisited, also wipe all-time visited marks. */
  clearHistory: (includeVisited: boolean) => void;
  /** All-time "I've been here" flag (true if marked or any drink logged). */
  isVisited: (barId: string) => boolean;
  /** Toggle the visited flag. Setting false also clears the bar's drink-days. */
  setVisited: (barId: string, visited: boolean) => void;
};

const VisitsContext = createContext<VisitsContextValue | undefined>(undefined);

/** Local day identifier (YYYY-M-D) so "a day" follows the user's calendar. */
export function dayKey(date: Date | string = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Noon local time on the given day, so the ISO string round-trips dayKey. */
export function dayKeyToDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m, d, 12);
}

/** Human-readable form of a dayKey, e.g. "Tuesday, June 9, 2026". */
export function formatDayKey(key: string): string {
  return dayKeyToDate(key).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function isFutureDay(key: string): boolean {
  return dayKeyToDate(key).getTime() > dayKeyToDate(dayKey()).getTime();
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function VisitsProvider({ children }: { children: ReactNode }) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [visitedBars, setVisitedBars] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted state once on mount.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [rawVisits, rawVisited] = await AsyncStorage.multiGet([
          STORAGE_KEY,
          VISITED_KEY,
        ]).then((pairs) => pairs.map(([, v]) => v));
        if (active && rawVisits) {
          const parsed = JSON.parse(rawVisits) as Visit[];
          if (Array.isArray(parsed)) setVisits(parsed);
        }
        if (active && rawVisited) {
          const parsed = JSON.parse(rawVisited) as string[];
          if (Array.isArray(parsed)) setVisitedBars(parsed);
        }
      } catch (e) {
        console.warn("Failed to load state from storage", e);
      } finally {
        if (active) setHydrated(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Persist on every change, but only after the initial load so we don't
  // overwrite stored data with the empty initial state.
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(visits)).catch((e) =>
      console.warn("Failed to save visits to storage", e),
    );
  }, [visits, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(VISITED_KEY, JSON.stringify(visitedBars)).catch((e) =>
      console.warn("Failed to save visited bars to storage", e),
    );
  }, [visitedBars, hydrated]);

  const logDrink = useCallback((barId: string, rawType: string, day?: string) => {
    const type = rawType.trim();
    if (!type) return;
    const targetDay = day ?? dayKey();
    if (isFutureDay(targetDay)) return;
    setVisits((prev) => {
      const idx = prev.findIndex(
        (v) => v.barId === barId && dayKey(v.date) === targetDay,
      );
      if (idx === -1) {
        const visit: Visit = {
          id: makeId(),
          barId,
          date:
            targetDay === dayKey()
              ? new Date().toISOString()
              : dayKeyToDate(targetDay).toISOString(),
          drinks: [{ type, count: 1 }],
        };
        return [visit, ...prev];
      }
      const visit = prev[idx];
      const drinks = [...visit.drinks];
      const di = drinks.findIndex(
        (d) => d.type.toLowerCase() === type.toLowerCase(),
      );
      if (di === -1) drinks.push({ type, count: 1 });
      else drinks[di] = { ...drinks[di], count: drinks[di].count + 1 };
      const updated = { ...visit, drinks };
      const next = [...prev];
      next[idx] = updated;
      return next;
    });
  }, []);

  const removeDrink = useCallback((barId: string, rawType: string, day?: string) => {
    const type = rawType.trim();
    if (!type) return;
    const targetDay = day ?? dayKey();
    setVisits((prev) => {
      const idx = prev.findIndex(
        (v) => v.barId === barId && dayKey(v.date) === targetDay,
      );
      if (idx === -1) return prev;
      const visit = prev[idx];
      const di = visit.drinks.findIndex(
        (d) => d.type.toLowerCase() === type.toLowerCase(),
      );
      if (di === -1) return prev;
      const drinks = [...visit.drinks];
      const nextCount = drinks[di].count - 1;
      if (nextCount <= 0) drinks.splice(di, 1);
      else drinks[di] = { ...drinks[di], count: nextCount };

      const next = [...prev];
      if (drinks.length === 0) {
        // No drinks left — drop the visit entirely.
        next.splice(idx, 1);
      } else {
        next[idx] = { ...visit, drinks };
      }
      return next;
    });
  }, []);

  const getVisitFor = useCallback(
    (barId: string, day: string = dayKey()) =>
      visits.find((v) => v.barId === barId && dayKey(v.date) === day),
    [visits],
  );

  const getVisitsForBar = useCallback(
    (barId: string) => visits.filter((v) => v.barId === barId),
    [visits],
  );

  const getVisitsForDay = useCallback(
    (day: string) => visits.filter((v) => dayKey(v.date) === day),
    [visits],
  );

  const clearVisit = useCallback((visitId: string) => {
    setVisits((prev) => prev.filter((v) => v.id !== visitId));
  }, []);

  const clearHistory = useCallback((includeVisited: boolean) => {
    setVisits([]);
    if (includeVisited) setVisitedBars([]);
  }, []);

  const isVisited = useCallback(
    (barId: string) =>
      visitedBars.includes(barId) || visits.some((v) => v.barId === barId),
    [visitedBars, visits],
  );

  const setVisited = useCallback((barId: string, visited: boolean) => {
    if (visited) {
      setVisitedBars((prev) =>
        prev.includes(barId) ? prev : [...prev, barId],
      );
    } else {
      // "Never been here": clear the manual mark and any logged drink-days.
      setVisitedBars((prev) => prev.filter((id) => id !== barId));
      setVisits((prev) => prev.filter((v) => v.barId !== barId));
    }
  }, []);

  const value = useMemo<VisitsContextValue>(
    () => ({
      visits,
      hydrated,
      logDrink,
      removeDrink,
      getVisitFor,
      getVisitsForBar,
      getVisitsForDay,
      clearVisit,
      clearHistory,
      isVisited,
      setVisited,
    }),
    [
      visits,
      hydrated,
      logDrink,
      removeDrink,
      getVisitFor,
      getVisitsForBar,
      getVisitsForDay,
      clearVisit,
      clearHistory,
      isVisited,
      setVisited,
    ],
  );

  return (
    <VisitsContext.Provider value={value}>{children}</VisitsContext.Provider>
  );
}

export function useVisits(): VisitsContextValue {
  const ctx = useContext(VisitsContext);
  if (!ctx) throw new Error("useVisits must be used within a VisitsProvider");
  return ctx;
}

/** Total number of drinks across all types in a visit. */
export function getDrinkTotal(visit: Visit): number {
  return visit.drinks.reduce((sum, d) => sum + d.count, 0);
}
