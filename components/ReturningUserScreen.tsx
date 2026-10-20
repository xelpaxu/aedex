import { useAuth, useUser } from "@clerk/clerk-expo";
import React, { useState } from "react";
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { ArrowRight, UsersRound } from "lucide-react-native";
import { useTheme } from "../context/ThemeContext";
import BrandMascot from "./BrandMascot";

export default function ReturningUserScreen({ onContinue }: { onContinue: () => void }) {
  const { signOut } = useAuth();
  const { user } = useUser();
  const { colors: C, isDark } = useTheme();
  const { width, height } = useWindowDimensions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const name = user?.username || user?.firstName || user?.fullName || user?.primaryEmailAddress?.emailAddress?.split("@")[0] || "your account";
  async function switchAccount() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      // Clear the saved session before exposing login for a different account.
      await signOut();
    } catch {
      setError("We couldn't sign out. Check your connection and try again.");
      setBusy(false);
    }
  }
  return <View style={{ flex: 1, backgroundColor: C.bg }}>
    <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={C.bg}/>
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.card}>
        <Text style={[styles.brand, { color: C.text }]}>AEDEX<Text style={{ color: C.accent }}>.</Text></Text>
        <View style={{ alignItems: "center", marginVertical: 20 }}>
          <BrandMascot pose={error ? "error" : "login"} size={Math.min(width * 0.7, height * 0.34, 280)}/>
        </View>
        <Text style={[styles.title, { color: C.text }]}>Welcome back, {name}!</Text>
        <Text style={[styles.subtitle, { color: C.textSub }]}>Your community is waiting. Continue with your saved account or sign in as someone else.</Text>
        <View style={[styles.account, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={[styles.avatar, { backgroundColor: C.accentGlow }]}><Text style={{ color: C.accent, fontSize: 20, fontFamily: "Inter_700Bold" }}>{name.charAt(0).toUpperCase()}</Text></View>
          <View style={{ flex: 1 }}><Text style={[styles.name, { color: C.text }]}>{user?.fullName || name}</Text><Text style={{ color: C.textSub, fontSize: 12, marginTop: 4 }}>{user?.primaryEmailAddress?.emailAddress || "Saved account"}</Text></View>
        </View>
        {error ? <Text accessibilityRole="alert" style={{ color: C.danger, marginBottom: 16, lineHeight: 20 }}>{error}</Text> : null}
        <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={onContinue} style={[styles.button, { backgroundColor: C.accent, opacity: busy ? 0.5 : 1 }]}>
          <Text style={styles.buttonText}>Continue as {name}</Text><ArrowRight size={18} color="#FFFFFF"/>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={switchAccount} style={[styles.button, { borderWidth: 1, borderColor: C.border, marginTop: 12 }]}>
          {busy ? <ActivityIndicator color={C.text}/> : <UsersRound size={18} color={C.text}/>}
          <Text style={[styles.buttonText, { color: C.text }]}>{busy ? "Signing out..." : "Log in to another account"}</Text>
        </TouchableOpacity>
        <Text style={[styles.footnote, { color: C.textDim }]}>You choose which account to use.</Text>
      </View>
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({
  screen: { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24, paddingVertical: 48 },
  card: { width: "100%", maxWidth: 420 },
  brand: { fontFamily: "Manrope_700Bold", fontSize: 23, letterSpacing: 3, textAlign: "center" },
  title: { fontFamily: "Manrope_700Bold", fontSize: 27, textAlign: "center" },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 22, textAlign: "center", marginTop: 10 },
  account: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 18, borderWidth: 1, marginVertical: 24 },
  avatar: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  name: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  button: { minHeight: 54, paddingHorizontal: 18, paddingVertical: 15, borderRadius: 16, flexDirection: "row", gap: 10, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 14, flexShrink: 1, textAlign: "center" },
  footnote: { fontSize: 11, textAlign: "center", marginTop: 24 },
});
