import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  ChevronRight,
  UserRound,
  Sun,
  Moon,
  LogOut,
  RefreshCw,
} from "lucide-react-native";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { useProfile } from "@/context/AccessContext";
import { useUpdate } from "@/context/UpdateProvider";
import { getCurrentVersionName } from "@/services/update_service";
export default function Settings() {
  const { colors: C, theme, setTheme } = useTheme();
  const profile = useProfile();
  const { signOut } = useAuth();
  const router = useRouter();
  const { state, checkNow } = useUpdate();
  const checking = state.phase === "checking";
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 24 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Pressable
            accessibilityLabel="Back"
            hitSlop={12}
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/(root)")
            }
          >
            <ArrowLeft color={C.text} />
          </Pressable>
          <Text style={{ fontSize: 22, fontWeight: "700", color: C.text }}>
            Settings
          </Text>
        </View>
        <Pressable
          onPress={() => router.push("/edit-profile")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            padding: 18,
            backgroundColor: C.surface,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: C.border,
          }}
        >
          <UserRound color={C.accent} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontWeight: "700", fontSize: 16 }}>
              {profile?.fullName || "Your profile"}
            </Text>
            <Text style={{ color: C.textSub, marginTop: 4 }}>
              {profile?.barangay} · Edit personal details
            </Text>
          </View>
          <ChevronRight color={C.textSub} />
        </Pressable>
        <View style={{ gap: 12 }}>
          <Text style={{ color: C.text, fontWeight: "700", fontSize: 16 }}>
            Appearance
          </Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {(["light", "dark"] as const).map((mode) => (
              <Pressable
                key={mode}
                accessibilityRole="radio"
                accessibilityState={{ checked: theme === mode }}
                onPress={() => setTheme(mode)}
                style={{
                  flex: 1,
                  padding: 20,
                  gap: 12,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: theme === mode ? C.accent : C.border,
                  backgroundColor: C.surface,
                }}
              >
                {mode === "light" ? (
                  <Sun color={C.accent} />
                ) : (
                  <Moon color={C.accent} />
                )}
                <Text style={{ color: C.text, fontWeight: "600" }}>
                  {mode === "light" ? "Light" : "Dark"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View
          style={{
            padding: 18,
            backgroundColor: C.surface,
            borderRadius: 16,
            gap: 5,
          }}
        >
          <Text style={{ color: C.text, fontWeight: "600" }}>About Aedex</Text>
          <Text style={{ color: C.textSub }}>
            Version {getCurrentVersionName()}
          </Text>
          <Text style={{ color: C.textSub, fontSize: 13 }}>
            Community dengue surveillance · Pilot program
          </Text>
        </View>
        <Pressable
          onPress={() => void checkNow()}
          disabled={checking}
          style={{
            padding: 18,
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            borderRadius: 16,
            backgroundColor: C.surface,
            opacity: checking ? 0.6 : 1,
          }}
        >
          {checking ? (
            <ActivityIndicator size="small" color={C.accent} />
          ) : (
            <RefreshCw color={C.accent} size={20} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontWeight: "600" }}>
              Check for updates
            </Text>
            <Text style={{ color: C.textSub, fontSize: 13 }}>
              {checking ? "Checking…" : "AEDEX updates itself automatically"}
            </Text>
          </View>
        </Pressable>
        <Pressable
          onPress={() => void signOut()}
          style={{
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            borderRadius: 14,
            backgroundColor: C.dangerGlow,
          }}
        >
          <LogOut color={C.danger} size={20} />
          <Text style={{ color: C.danger, fontWeight: "600" }}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
