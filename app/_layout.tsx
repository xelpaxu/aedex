// app/_layout.tsx
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
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
import React, { useEffect, useSyncExternalStore } from "react";
import { ActivityIndicator, StatusBar, Text, View } from "react-native";
import SplashScreenView from "../components/SplashScreen";
import ReturningUserScreen from "../components/ReturningUserScreen";
import BrandMascot from "../components/BrandMascot";
import { startupState } from "../lib/startupState";
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

function SessionGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const state = useSyncExternalStore(startupState.subscribe, startupState.getSnapshot, startupState.getSnapshot);
  const { colors } = useTheme();
  useEffect(() => {
    if (isLoaded) startupState.resolveAuth(!!isSignedIn);
  }, [isLoaded, isSignedIn]);
  if (!isLoaded || !state.authReady) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.accent}/>
      <Text style={{ color: colors.textSub, marginTop: 12 }}>Checking your saved session...</Text>
    </View>;
  }
  // Only a session restored on launch asks for confirmation. A fresh login
  // proceeds directly, and signing out cannot reopen the startup animation.
  if (isSignedIn && state.needsChoice)
    return <ReturningUserScreen onContinue={startupState.continueSession}/>;
  return <AccessProvider><RootLayoutNav/></AccessProvider>;
}

function AppShell() {
  const state = useSyncExternalStore(startupState.subscribe, startupState.getSnapshot, startupState.getSnapshot);
  if (!state.splashDone) return <SplashScreenView onFinish={startupState.finishSplash}/>;
  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={PUBLISHABLE_KEY}>
      <ConvexProviderWithClerk client={getConvexClient()} useAuth={useAuth}>
        <SessionGate/>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
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

  // Splash state lives above authentication; Clerk changes cannot replay it.
  return <ThemeProvider><UpdateProvider><AppShell/></UpdateProvider></ThemeProvider>;
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
          <BrandMascot pose="error" size={180}/>
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
