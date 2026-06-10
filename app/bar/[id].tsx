import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Linking, Pressable, ScrollView, Text, View } from "react-native";
import DrinkLogger from "../../components/DrinkLogger";
import { getBarById } from "../../lib/bars";
import {
  dayKey,
  formatDayKey,
  getDrinkTotal,
  useVisits,
} from "../../lib/VisitsContext";

export default function BarDetailScreen() {
  const { id, day } = useLocalSearchParams<{ id: string; day?: string }>();
  const router = useRouter();
  const bar = id ? getBarById(id) : undefined;
  const targetDay = day ?? dayKey();
  const isTargetToday = targetDay === dayKey();
  const {
    getVisitFor,
    logDrink,
    removeDrink,
    isVisited,
    setVisited,
    getVisitsForBar,
  } = useVisits();

  if (!bar) {
    return (
      <View className="flex-1 items-center justify-center bg-ink px-8">
        <Stack.Screen options={{ title: "Not found" }} />
        <Text className="text-base text-white">Bar not found.</Text>
      </View>
    );
  }

  const visit = getVisitFor(bar.id, targetDay);
  const total = visit ? getDrinkTotal(visit) : 0;
  const visited = isVisited(bar.id);

  const openDirections = () => {
    const { latitude: lat, longitude: lng, name } = bar;
    const apple = `https://maps.apple.com/?daddr=${lat},${lng}&q=${encodeURIComponent(
      name,
    )}`;
    const google = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Alert.alert("Get directions", `Open directions to ${name} in:`, [
      { text: "Apple Maps", onPress: () => Linking.openURL(apple) },
      { text: "Google Maps", onPress: () => Linking.openURL(google) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const toggleVisited = () => {
    if (!visited) {
      setVisited(bar.id, true);
      return;
    }
    const drinkDays = getVisitsForBar(bar.id).length;
    if (drinkDays > 0) {
      Alert.alert(
        "Mark as never visited?",
        `This will remove ${drinkDays} logged drink-day${
          drinkDays === 1 ? "" : "s"
        } for ${bar.name}.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => setVisited(bar.id, false),
          },
        ],
      );
    } else {
      setVisited(bar.id, false);
    }
  };

  return (
    <View className="flex-1 bg-ink">
      <Stack.Screen
        options={{
          title: bar.name,
          headerRight: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              className="active:opacity-60"
            >
              <Ionicons
                name="close"
                size={24}
                color="#ffffff"
                style={{ marginLeft: 5 }}
              />
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text className="text-2xl font-extrabold text-white">{bar.name}</Text>
        <Text className="mt-1 text-sm font-semibold text-primary">
          {bar.neighborhood}
        </Text>

        <Pressable
          onPress={openDirections}
          className="mt-2 flex-row items-start active:opacity-70"
        >
          <Ionicons name="location-outline" size={16} color="#9ca3af" />
          <Text className="ml-1 flex-1 text-sm text-gray-400">
            {bar.address}
          </Text>
        </Pressable>

        {bar.description ? (
          <Text className="mt-3 text-sm leading-5 text-gray-300">
            {bar.description}
          </Text>
        ) : null}

        <Pressable
          onPress={toggleVisited}
          className="mt-5 flex-row items-center justify-between rounded-2xl bg-ink-card px-4 py-3 active:opacity-80"
        >
          <View className="flex-1 pr-3">
            <Text className="text-base font-semibold text-white">Visited</Text>
            <Text className="mt-0.5 text-xs text-gray-400">
              {visited ? "You've been here" : "Tap if you've been here"}
            </Text>
          </View>
          <Ionicons
            name={visited ? "checkbox" : "square-outline"}
            size={28}
            color={visited ? "#22c55e" : "#6b7280"}
          />
        </Pressable>

        <View className="mt-4 mb-4 flex-row items-center justify-between rounded-2xl bg-primary/15 px-4 py-3">
          <Text className="flex-1 pr-3 text-sm font-medium text-white">
            {isTargetToday
              ? "Today's drinks"
              : `Drinks on ${formatDayKey(targetDay)}`}
          </Text>
          <Text className="text-2xl font-extrabold text-primary">{total}</Text>
        </View>

        <Text className="mb-3 text-base font-bold text-white">Log a drink</Text>
        <DrinkLogger
          visit={visit}
          onLog={(type) => logDrink(bar.id, type, targetDay)}
          onRemove={(type) => removeDrink(bar.id, type, targetDay)}
        />
      </ScrollView>
    </View>
  );
}
