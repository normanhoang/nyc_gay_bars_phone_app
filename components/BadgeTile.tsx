import { Text, View } from "react-native";
import type { BadgeWithDate } from "../lib/BadgesContext";

type Props = {
  badge: BadgeWithDate;
  /** Show the earned date under the description (all-badges popup). */
  showDate?: boolean;
};

function formatEarnedAt(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BadgeTile({ badge, showDate = false }: Props) {
  return (
    <View
      className={
        badge.earned
          ? "mb-3 w-[48%] items-center rounded-2xl bg-ink-card p-4"
          : "mb-3 w-[48%] items-center rounded-2xl bg-ink-card p-4 opacity-40"
      }
    >
      <Text className="text-3xl">{badge.emoji}</Text>
      <Text className="mt-2 text-center text-sm font-semibold text-white">
        {badge.title}
      </Text>
      <Text className="mt-1 text-center text-xs text-gray-400">
        {badge.description}
      </Text>
      {showDate && badge.earned && badge.earnedAt ? (
        <Text className="mt-1 text-center text-[10px] font-semibold text-primary">
          Earned {formatEarnedAt(badge.earnedAt)}
        </Text>
      ) : null}
    </View>
  );
}
