// app/_layout.tsx
import { ClerkLoaded, ClerkProvider, useAuth } from "@clerk/clerk-expo";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { Manrope_700Bold, useFonts } from "@expo-google-fonts/manrope";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StatusBar, Text, View } from "react-native";
import SplashScreenView from "../components/SplashScreen";
import { ThemeProvider, useTheme } from "../context/ThemeContext";
import { tokenCache } from "../lib/cache";

const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const CONVEX_URL = process.env.EXPO_PUBLIC_CONVEX_URL ?? "";

if (!PUBLISHABLE_KEY) {
  console.warn("Missing Clerk Publishable Key. Check your .env file.");
}

// Keep native splash visible while fonts load
SplashScreen.preventAutoHideAsync();

// ========== FIX: Create Convex client lazily ==========
let convexInstance: ConvexReactClient | null = null;

function getConvexClient() {
  if (!convexInstance) {
    convexInstance = new ConvexReactClient(
      CONVEX_URL || "https://placeholder.convex.cloud",
    );
  }
  return convexInstance;
}

function RootLayoutNav() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const { theme, isDark, colors } = useTheme();

  // ========== FIX: Use ref to prevent multiple redirects ==========
  const hasRedirected = useRef(false);
  const [isReady, setIsReady] = useState(false);

  // ========== FIX: Only run navigation once ==========
  useEffect(() => {
    if (!isLoaded || hasRedirected.current) return;

    const inAuthGroup = segments[0] === "(auth)";

    // Set ready state
    setIsReady(true);

    if (!isSignedIn && !inAuthGroup) {
      hasRedirected.current = true;
      // Use setTimeout to prevent race conditions
      setTimeout(() => {
        router.replace("/(auth)/login");
      }, 50);
    } else if (isSignedIn && inAuthGroup) {
      hasRedirected.current = true;
      setTimeout(() => {
        router.replace("/(root)");
      }, 50);
    }

    // Reset redirect flag after navigation completes
    const timer = setTimeout(() => {
      hasRedirected.current = false;
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, segments]);

  if (!isLoaded || !isReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.bg,
        }}
      >
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.bg} />
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ color: colors.textSub, marginTop: 12, fontSize: 12 }}>
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.bg} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [splashDone, setSplashDone] = useState(false);
  const [appReady, setAppReady] = useState(false);

  // Hide native splash once fonts are ready
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  const onSplashFinish = useCallback(() => {
    setSplashDone(true);
    // ========== FIX: Delay app mount to prevent Convex loops ==========
    setTimeout(() => {
      setAppReady(true);
    }, 300);
  }, []);

  // While fonts are loading, render nothing (native splash stays visible)
  if (!fontsLoaded && !fontError) return null;

  // Fonts loaded but custom splash hasn't finished yet
  if (!splashDone) {
    // ========== FIX: Create Convex client only when needed ==========
    const convex = getConvexClient();

    return (
      <ClerkProvider tokenCache={tokenCache} publishableKey={PUBLISHABLE_KEY}>
        <ClerkLoaded>
          <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
            <SplashScreenView onFinish={onSplashFinish} />
          </ConvexProviderWithClerk>
        </ClerkLoaded>
      </ClerkProvider>
    );
  }

  // ========== FIX: Wait for app to be ready before mounting ==========
  if (!appReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#0B0E14",
        }}
      >
        <ActivityIndicator size="large" color="#4F8EF7" />
        <Text style={{ color: "#697A9B", marginTop: 12, fontSize: 12 }}>
          Initializing...
        </Text>
      </View>
    );
  }

  // Everything ready — show the app
  const convex = getConvexClient();

  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={PUBLISHABLE_KEY}>
      <ClerkLoaded>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <ThemeProvider>
            <RootLayoutNav />
          </ThemeProvider>
        </ConvexProviderWithClerk>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
