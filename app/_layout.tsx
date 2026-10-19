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
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useCallback, useEffect, useState } from "react";
import { StatusBar, Text, View } from "react-native";
import SplashScreenView from "../components/SplashScreen";
import { AccessProvider } from "../context/AccessContext";
import { ThemeProvider, useTheme } from "../context/ThemeContext";
import { UpdateProvider } from "../context/UpdateProvider";
import { tokenCache } from "../lib/cache";

const PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  "pk_test_bXVzaWNhbC1mb3dsLTM4LmNsZXJrLmFjY291bnRzLmRldiQ";
const CONVEX_URL =
  process.env.EXPO_PUBLIC_CONVEX_URL ||
  "https://admired-yak-177.convex.cloud";

if (!PUBLISHABLE_KEY) {
  console.warn("Missing Clerk Publishable Key. Using default fallback.");
}

// Keep native splash visible while fonts load (safely catch to prevent crashes on reload)
SplashScreen.preventAutoHideAsync().catch(() => {});

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
  const { isSignedIn } = useAuth();
  const { isDark, colors } = useTheme();
  return (
    <>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.bg} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Protected guard={!isSignedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={!!isSignedIn}>
          <Stack.Screen name="(root)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

/**
 * Rendered after fonts load. The custom splash plays once, then the router mounts.
 * The update gate lives above this in UpdateProvider, so it stays mounted across
 * the splash-to-app transition and keeps checking while the user works.
 */
function AppShell() {
  const [splashDone, setSplashDone] = useState(false);

  const onSplashFinish = useCallback(() => {
    setSplashDone(true);
  }, []);

  if (!splashDone) return <SplashScreenView onFinish={onSplashFinish} />;

  return <RootLayoutNav />;
}

function RootLayoutContent() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Hide native splash once fonts are ready
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // While fonts are loading, render nothing (native splash stays visible)
  if (!fontsLoaded && !fontError) return null;

  // Providers stay mounted for the whole session. Previously this component
  // returned four different trees, which tore down and rebuilt Clerk and Convex
  // on every splash transition and left no stable place to mount a global gate.
  const convex = getConvexClient();

  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={PUBLISHABLE_KEY}>
      <ClerkLoaded>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <ThemeProvider>
            <UpdateProvider>
              <AccessProvider>
                <AppShell />
              </AccessProvider>
            </UpdateProvider>
          </ThemeProvider>
        </ConvexProviderWithClerk>
      </ClerkLoaded>
    </ClerkProvider>
  );
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("RootErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#0B0E14",
            padding: 24,
          }}
        >
          <StatusBar barStyle="light-content" backgroundColor="#0B0E14" />
          <Text style={{ color: "#EF4444", fontSize: 20, fontWeight: "bold", marginBottom: 12 }}>
            AEDEX Startup Warning
          </Text>
          <Text style={{ color: "#94A3B8", fontSize: 13, textAlign: "center", lineHeight: 20, marginBottom: 20 }}>
            {this.state.error?.message || "An issue occurred while initializing the app interface."}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  return (
    <RootErrorBoundary>
      <RootLayoutContent />
    </RootErrorBoundary>
  );
}
