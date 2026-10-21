import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
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
import { Text } from "@/components/Typography";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { useProfile } from "@/context/AccessContext";
import { hasTanodAccess } from "@/constants/access";
import { useUpdate } from "@/context/UpdateProvider";
import { getCurrentVersionName } from "@/services/update_service";

export default function Settings() {
  const { colors: C, theme, setTheme } = useTheme();
  const profile = useProfile();
  const tanod = hasTanodAccess(profile);
  const accent = tanod ? C.warn : C.accent;
  const accentGlow = tanod ? C.warnGlow : C.accentGlow;
  const { signOut } = useAuth();
  const router = useRouter();
  const { state, checkNow } = useUpdate();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const [checked, setChecked] = useState(false);
  const checking = state.phase === "checking";
  const section = {
    color: C.text,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 14,
  };
  const row = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
    padding: 17,
    minHeight: 84,
  };
  const panel = {
    backgroundColor: C.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden" as const,
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 36,
          gap: 28,
          maxWidth: 640,
          width: "100%",
          alignSelf: "center",
        }}
      >
        <View style={{ gap: 20 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/(root)")
            }
            style={{
              alignSelf: "flex-start",
              padding: 14,
              backgroundColor: C.surface,
              borderRadius: 18,
            }}
          >
            <ArrowLeft color={C.text} size={20} />
          </Pressable>
          <View style={{ gap: 6 }}>
            <Text
              style={{
                color: C.text,
                fontFamily: "Inter_700Bold",
                fontSize: 32,
              }}
            >
              Settings
            </Text>
            <Text style={{ color: C.textSub, fontSize: 14 }}>
              Your account, your community, your preferences.
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View your profile"
          onPress={() =>
            router.push(
              tanod ? "/(root)/(tanod-tabs)/profile" : "/(root)/(tabs)/profile",
            )
          }
          style={[
            panel,
            {
              padding: 20,
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
            },
          ]}
        >
          <View
            style={{
              width: 54,
              height: 54,
              borderRadius: 24,
              backgroundColor: accentGlow,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: accent,
                fontFamily: "Inter_700Bold",
                fontSize: 22,
              }}
            >
              {profile?.fullName?.trim().charAt(0).toUpperCase() || "A"}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <Text
              style={{
                color: C.text,
                fontFamily: "Inter_600SemiBold",
                fontSize: 17,
              }}
            >
              {profile?.fullName || "Your profile"}
            </Text>
            <Text style={{ color: C.textSub, fontSize: 12 }}>
              {(tanod ? profile?.assignedBarangay : profile?.barangay) || "Community member"}
            </Text>
            <Text style={{ color: accent, fontSize: 12 }}>
              {tanod ? "Tanod profile" : "View your profile"}
            </Text>
          </View>
          <ChevronRight color={C.textDim} size={20} />
        </Pressable>
        <View>
          <Text style={section}>Appearance</Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {(["light", "dark"] as const).map((mode) => {
              const active = theme === mode;
              return (
                <Pressable
                  key={mode}
                  accessibilityRole="radio"
                  accessibilityLabel={`${mode} appearance`}
                  accessibilityState={{ checked: active }}
                  onPress={() => setTheme(mode)}
                  style={{
                    flex: 1,
                    padding: 12,
                    gap: 14,
                    borderRadius: 24,
                    borderWidth: 2,
                    borderColor: active ? accent : C.border,
                    backgroundColor: C.surface,
                  }}
                >
                  <View
                    style={{
                      height: 88,
                      padding: 10,
                      borderRadius: 10,
                      backgroundColor: mode === "light" ? "#EEF4F2" : "#0B1414",
                      gap: 8,
                    }}
                  >
                    <View
                      style={{
                        width: "48%",
                        height: 5,
                        borderRadius: 3,
                        backgroundColor:
                          mode === "light" ? "#607A72" : "#A0B7B3",
                      }}
                    />
                    <View style={{ flex: 1, flexDirection: "row", gap: 6 }}>
                      <View
                        style={{
                          width: "28%",
                          borderRadius: 5,
                          backgroundColor:
                            mode === "light" ? "#CCEBE3" : "#184B44",
                        }}
                      />
                      <View
                        style={{
                          flex: 1,
                          borderRadius: 5,
                          backgroundColor:
                            mode === "light" ? "#fff" : "#203333",
                        }}
                      />
                    </View>
                    <View
                      style={{
                        alignSelf: "center",
                        width: "64%",
                        height: 9,
                        borderRadius: 5,
                        backgroundColor: accent,
                      }}
                    />
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 7,
                    }}
                  >
                    {mode === "light" ? (
                      <Sun size={17} color={C.textSub} />
                    ) : (
                      <Moon size={17} color={C.textSub} />
                    )}
                    <Text
                      style={{
                        flex: 1,
                        color: C.text,
                        fontWeight: "600",
                        fontSize: 13,
                      }}
                    >
                      {mode === "light" ? "Light" : "Dark"}
                    </Text>
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: active ? accent : C.borderBright,
                        backgroundColor: active ? accent : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {active && <Check color={tanod ? "#111827" : "#fff"} size={13} />}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View>
          <Text style={section}>Account & activity</Text>
          <View style={panel}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/edit-profile")}
              style={({ pressed }) => [row, { backgroundColor: pressed ? C.surfaceRaised : "transparent" }]}
            >
              <UserRound color={accent} size={21} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  style={{ color: C.text, fontWeight: "600", fontSize: 14 }}
                >
                  Personal details
                </Text>
                <Text style={{ color: C.textSub, fontSize: 12 }}>
                  Manage your community profile
                </Text>
              </View>
              <ChevronRight color={C.textDim} size={18} />
            </Pressable>
            <View
              style={{ height: 1, backgroundColor: C.border, marginLeft: 52 }}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/notifications")}
              style={({ pressed }) => [row, { backgroundColor: pressed ? C.surfaceRaised : "transparent" }]}
            >
              <Bell color={accent} size={21} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  style={{ color: C.text, fontWeight: "600", fontSize: 14 }}
                >
                  Notifications
                </Text>
                <Text style={{ color: C.textSub, fontSize: 12 }}>
                  Report updates and assignments
                </Text>
              </View>
              <ChevronRight color={C.textDim} size={18} />
            </Pressable>
            {tanod && (
              <>
                <View
                  style={{
                    height: 1,
                    backgroundColor: C.border,
                    marginLeft: 52,
                  }}
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push("/(root)/(tanod-tabs)/dashboard")}
                  style={({ pressed }) => [row, { backgroundColor: pressed ? C.surfaceRaised : "transparent" }]}
                >
                  <LayoutDashboard color={C.warn} size={21} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text
                      style={{ color: C.text, fontWeight: "600", fontSize: 14 }}
                    >
                      Team dashboard
                    </Text>
                    <Text style={{ color: C.textSub, fontSize: 12 }}>
                      Your field operations overview
                    </Text>
                  </View>
                  <ChevronRight color={C.textDim} size={18} />
                </Pressable>
              </>
            )}
          </View>
        </View>
        <View>
          <Text style={section}>About Aedex</Text>
          <View style={panel}>
            <View style={{ padding: 18, gap: 6 }}>
              <Text style={{ color: C.text, fontWeight: "600", fontSize: 14 }}>
                Community dengue surveillance
              </Text>
              <Text style={{ color: C.textSub, fontSize: 12 }}>
                Version {getCurrentVersionName()} / Pilot program
              </Text>
            </View>
            <View style={{ height: 1, backgroundColor: C.border }} />
            <Pressable
              accessibilityRole="button"
              disabled={checking}
              onPress={async () => {
                setError("");
                try {
                  await checkNow();
                  setChecked(true);
                } catch {
                  setError("Could not check for updates. Try again.");
                }
              }}
              style={({ pressed }) => [row, { backgroundColor: pressed ? C.surfaceRaised : "transparent" }]}
            >
              {checking ? (
                <ActivityIndicator color={accent} />
              ) : (
                <RefreshCw size={20} color={accent} />
              )}
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  style={{ color: C.text, fontSize: 14, fontWeight: "600" }}
                >
                  {checking ? "Checking for updates..." : "Check for updates"}
                </Text>
                <Text style={{ color: C.textSub, fontSize: 12 }}>
                  {checked && state.phase === "idle"
                    ? "Update check complete"
                    : "Keep Aedex up to date"}
                </Text>
              </View>
              <ChevronRight color={C.textDim} size={18} />
            </Pressable>
          </View>
        </View>
        {!!error && (
          <Text accessibilityRole="alert" style={{ color: C.danger }}>
            {error}
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          disabled={signingOut}
          onPress={async () => {
            setSigningOut(true);
            setError("");
            try {
              await signOut();
            } catch {
              setError("Could not sign out. Please try again.");
              setSigningOut(false);
            }
          }}
          style={{
            minHeight: 52,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: C.danger + "40",
            backgroundColor: C.dangerGlow,
          }}
        >
          {signingOut ? (
            <ActivityIndicator color={C.danger} />
          ) : (
            <LogOut color={C.danger} size={19} />
          )}
          <Text style={{ color: C.danger, fontWeight: "600" }}>
            {signingOut ? "Signing out..." : "Sign out"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
