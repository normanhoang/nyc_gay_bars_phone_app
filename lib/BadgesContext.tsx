import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { badges, computeVisitedIds, type Badge } from "./stats";
import { useVisits } from "./VisitsContext";

const BADGE_DATES_KEY = "@gaybars/badgeDates";

export type BadgeWithDate = Badge & {
  /** ISO date-time of when the badge was first observed as earned. */
  earnedAt?: string;
};

type BadgesContextValue = {
  /** All badges in definition order, with earn dates where earned. */
  badges: BadgeWithDate[];
};

const BadgesContext = createContext<BadgesContextValue | undefined>(undefined);

export function BadgesProvider({ children }: { children: ReactNode }) {
  const { visits, hydrated: visitsHydrated, isVisited } = useVisits();
  const [earnedAt, setEarnedAt] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);

  // Load persisted earn dates once on mount.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(BADGE_DATES_KEY);
        if (active && raw) {
          const parsed = JSON.parse(raw) as Record<string, string>;
          if (parsed && typeof parsed === "object") setEarnedAt(parsed);
        }
      } catch (e) {
        console.warn("Failed to load badge dates from storage", e);
      } finally {
        if (active) setHydrated(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const visitedIds = useMemo(() => computeVisitedIds(isVisited), [isVisited]);
  const allBadges = useMemo(
    () => badges(visits, visitedIds),
    [visits, visitedIds],
  );

  // Reconcile earn dates with the computed badge states: stamp newly earned
  // badges, drop stamps for badges that reverted (e.g. history cleared).
  useEffect(() => {
    if (!hydrated || !visitsHydrated) return;
    setEarnedAt((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const b of allBadges) {
        if (b.earned && !next[b.id]) {
          next[b.id] = new Date().toISOString();
          changed = true;
        } else if (!b.earned && next[b.id]) {
          delete next[b.id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [hydrated, visitsHydrated, allBadges]);

  // Persist on every change, but only after the initial load.
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(BADGE_DATES_KEY, JSON.stringify(earnedAt)).catch(
      (e) => console.warn("Failed to save badge dates to storage", e),
    );
  }, [earnedAt, hydrated]);

  const value = useMemo<BadgesContextValue>(
    () => ({
      badges: allBadges.map((b) => ({ ...b, earnedAt: earnedAt[b.id] })),
    }),
    [allBadges, earnedAt],
  );

  return (
    <BadgesContext.Provider value={value}>{children}</BadgesContext.Provider>
  );
}

export function useBadges(): BadgesContextValue {
  const ctx = useContext(BadgesContext);
  if (!ctx) throw new Error("useBadges must be used within a BadgesProvider");
  return ctx;
}
