import "../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BadgesProvider } from "../lib/BadgesContext";
import { VisitsProvider } from "../lib/VisitsContext";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <VisitsProvider>
          <BadgesProvider>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: "#0b0b12" },
                headerTintColor: "#ffffff",
                contentStyle: { backgroundColor: "#0b0b12" },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="bar/[id]"
                options={{ presentation: "modal", title: "" }}
              />
              <Stack.Screen
                name="log/[day]"
                options={{ presentation: "modal", title: "Pick a bar" }}
              />
            </Stack>
          </BadgesProvider>
        </VisitsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
