import UserAvatar from "@/components/UserAvatar";
import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import {
  Bell,
  Check,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Moon,
  RefreshCw,
  Sun,
  UserRound,
} from "lucide-react-native";
import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, useAccountTheme as useTheme, AccountHeader } from "@/components/AccountUI";
import { useProfile } from "@/context/AccessContext";
import { hasTanodAccess } from "@/constants/access";
import { useUpdate } from "@/context/UpdateProvider";
import { getCurrentVersionName } from "@/services/update_service";

export default function Settings() {
  const { colors: C, theme, setTheme } = useTheme();
  const profile = useProfile();
  const tanod = hasTanodAccess(profile);
  const { signOut } = useAuth();
  const router = useRouter();
  const { state, checkNow } = useUpdate();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const [checked, setChecked] = useState(false);
  const checking = state.phase === "checking";
  const row = { flexDirection: "row" as const, alignItems: "center" as const, gap: 14, minHeight: 60, paddingVertical: 16, paddingHorizontal: 0 };
  const group = { borderTopWidth: 0.5, borderColor: C.border };
  const heading = { color: C.textSub, fontSize: 15, fontWeight: "600" as const, marginBottom: 10, marginLeft: 0 };
  return <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
    <AccountHeader title="" onBack={() => router.canGoBack() ? router.back() : router.replace("/(root)")} />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 32, maxWidth: 620, width: "100%", alignSelf: "center" }}>
      <View style={{ gap: 8, marginBottom: 4 }}><Text style={{ color: C.text, fontSize: 32, fontWeight: "700", letterSpacing: -0.7 }}>Settings</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="View profile" onPress={() => router.push(tanod ? "/(root)/(tanod-tabs)/profile" : "/(root)/(tabs)/profile")} style={({ pressed }) => [row, { paddingVertical: 4, backgroundColor: pressed ? C.surfaceRaised : "transparent" }]}>
        <UserAvatar size={44} /><View style={{ flex: 1, gap: 6 }}><Text style={{ color: C.text, fontWeight: "600", fontSize: 17 }}>{profile?.fullName || "Your profile"}</Text><Text style={{ color: C.textSub, fontSize: 13 }}>Manage your profile</Text></View><ChevronRight size={18} color={C.textDim} />
      </Pressable>
      <View>
        <Text accessibilityRole="header" style={heading}>Display</Text>
        <View style={{ backgroundColor: C.surfaceRaised, padding: 5, borderRadius: 12, flexDirection: "row", gap: 6 }}>
          {(["light", "dark"] as const).map(mode => <Pressable key={mode} accessibilityRole="radio" accessibilityState={{ checked: theme === mode }} accessibilityLabel={`${mode} appearance`} onPress={() => setTheme(mode)} style={({ pressed }) => ({ flex: 1, minHeight: 50, padding: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 11, borderWidth: 1, borderColor: theme === mode ? C.actionText : "transparent", backgroundColor: theme === mode ? C.surface : pressed ? C.surfaceRaised : "transparent" })}>
            {mode === "light" ? <Sun size={20} color={C.text} /> : <Moon size={20} color={C.text} />}<Text style={{ color: C.text, fontSize: 15, fontWeight: theme === mode ? "600" : "400" }}>{mode === "light" ? "Light" : "Dark"}</Text>{theme === mode && <Check size={16} color={C.actionText} />}
          </Pressable>)}
        </View>
      </View>
      <View>
        <Text accessibilityRole="header" style={heading}>Account & activity</Text>
        <View style={group}>
          {[{ label: "Personal details", icon: UserRound, onPress: () => router.push("/edit-profile") }, { label: "Notifications", icon: Bell, onPress: () => router.push("/notifications") }, ...(tanod ? [{ label: "Team dashboard", icon: LayoutDashboard, onPress: () => router.push("/(root)/(tanod-tabs)/dashboard") }] : [])].map(({ label, icon: Icon, onPress }, index) => <Pressable key={label} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [row, { borderTopWidth: index ? 0.5 : 0, borderColor: C.border, backgroundColor: pressed ? C.surfaceRaised : "transparent" }]}><Icon size={21} color={C.actionText} /><Text style={{ flex: 1, color: C.text, fontSize: 16 }}>{label}</Text><ChevronRight size={18} color={C.textDim} /></Pressable>)}
        </View>
      </View>
      <View>
        <Text accessibilityRole="header" style={heading}>App</Text>
        <View style={group}>
          <View style={row}><Text style={{ flex: 1, color: C.text, fontSize: 16 }}>Version</Text><Text selectable style={{ color: C.textSub, fontSize: 14 }}>{getCurrentVersionName()}</Text></View>
          <Pressable accessibilityRole="button" disabled={checking} accessibilityState={{ disabled: checking, busy: checking }} onPress={async () => { setError(""); try { await checkNow(); setChecked(true); } catch { setError("Could not check for updates. Try again."); } }} style={({ pressed }) => [row, { borderTopWidth: 0.5, borderColor: C.border, backgroundColor: pressed ? C.surfaceRaised : "transparent" }]}>
            {checking ? <ActivityIndicator color={C.actionText} /> : <RefreshCw size={21} color={C.textSub} />}<View style={{ flex: 1, gap: 5 }}><Text style={{ color: C.text, fontSize: 16 }}>{checking ? "Checking for updates..." : "Check for updates"}</Text>{checked && state.phase === "idle" && <Text style={{ color: C.textSub, fontSize: 13 }}>Update check complete</Text>}</View><ChevronRight size={18} color={C.textDim} />
          </Pressable>
        </View>
      </View>
      {!!error && <Text accessibilityRole="alert" style={{ color: C.danger, fontSize: 14 }}>{error}</Text>}
      <Pressable accessibilityRole="button" disabled={signingOut} accessibilityState={{ disabled: signingOut, busy: signingOut }} onPress={async () => { setSigningOut(true); setError(""); try { await signOut(); } catch { setError("Could not sign out. Please try again."); setSigningOut(false); } }} style={({ pressed }) => [row, group, { backgroundColor: pressed ? C.surfaceRaised : "transparent", opacity: signingOut ? 0.6 : 1 }]}>
        {signingOut ? <ActivityIndicator color={C.danger} /> : <LogOut size={21} color={C.danger} />}<Text style={{ color: C.danger, fontSize: 16 }}>{signingOut ? "Signing out..." : "Sign out"}</Text>
      </Pressable>
      <Text style={{ color: C.textDim, fontSize: 12, textAlign: "center" }}>Aedex / Community dengue surveillance</Text>
    </ScrollView>
  </SafeAreaView>;
}
