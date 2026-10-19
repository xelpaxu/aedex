import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useAuth } from "@clerk/clerk-expo";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import React, { createContext, useContext, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useTheme } from "./ThemeContext";
const AccessContext = createContext<Doc<"users"> | null>(null);
export const useProfile = () => useContext(AccessContext);
export function AccessProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const profile = useQuery(api.users.getMe, isAuthenticated ? {} : "skip");
  const ensure = useMutation(api.users.ensureMobileProfile);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const { colors: C } = useTheme();
  useEffect(() => {
    let active = true;
    if (isAuthenticated && profile === null) {
      setError("");
      ensure({}).catch(() => {
        if (active) setError("We could not load your account. Please retry.");
      });
    }
    return () => {
      active = false;
    };
  }, [isAuthenticated, profile, ensure, attempt]);
  if (!isLoaded || (isSignedIn && (isLoading || !isAuthenticated || !profile)))
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 28,
          gap: 16,
          backgroundColor: C.bg,
        }}
      >
        {!error && <ActivityIndicator color={C.accent} />}
        <Text style={{ color: C.text, textAlign: "center" }}>
          {error ||
            (!isLoading && isSignedIn && !isAuthenticated
              ? "Unable to connect your session. Sign out and try again."
              : "Loading your account…")}
        </Text>
        {error && (
          <Pressable onPress={() => setAttempt((n) => n + 1)}>
            <Text style={{ color: C.accent }}>Retry</Text>
          </Pressable>
        )}
        {isSignedIn && (
          <Pressable onPress={() => void signOut()}>
            <Text style={{ color: C.textSub }}>Sign out</Text>
          </Pressable>
        )}
      </View>
    );
  return (
    <AccessContext.Provider value={profile || null}>
      {children}
    </AccessContext.Provider>
  );
}
