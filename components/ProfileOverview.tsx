import UserAvatar from "@/components/UserAvatar";
import { useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { ArrowLeft, ChevronRight, MapPin, Settings, UserRound, ClipboardList, Bell, ShieldCheck } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useProfile } from "@/context/AccessContext";
import { useTheme } from "@/context/ThemeContext";
import { hasTanodAccess } from "@/constants/access";

export default function ProfileOverview() {
  const profile = useProfile();
  const { user } = useUser();
  const { colors: C } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tanod = hasTanodAccess(profile);
  const accent = tanod ? C.warn : C.accent;
  const actions = [
    { title: "Personal details", sub: "Your photo, contact details and barangay", icon: UserRound, onPress: () => router.push("/edit-profile") },
    { title: tanod ? "My assignments" : "My reports", sub: tanod ? "Review your team's response work" : "Follow your reports and response updates", icon: ClipboardList, onPress: () => router.push(tanod ? "/(root)/(tanod-tabs)/reports" : "/(root)/(tabs)/reports") },
    { title: "Notifications", sub: "Stay connected to community updates", icon: Bell, onPress: () => router.push("/notifications") },
    { title: "Settings", sub: "Appearance, app updates and account", icon: Settings, onPress: () => router.push("/settings") },
  ];
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 26, maxWidth: 680, width: "100%", alignSelf: "center", paddingBottom: 110 + insets.bottom }}>
        <View style={s.row}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to map" onPress={() => router.canGoBack() ? router.back() : router.replace(tanod ? "/(root)/(tanod-tabs)/map" : "/(root)/(tabs)/map")} style={[s.icon, { backgroundColor: C.surface }]}><ArrowLeft color={C.text} size={21} /></Pressable>
          <View style={{ flex: 1 }}><Text style={[s.eyebrow, { color: accent }]}>ACCOUNT</Text><Text style={[s.title, { color: C.text }]}>Profile</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push("/settings")} style={[s.icon, { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1 }]}><Settings color={C.text} size={21} /></Pressable>
        </View>
        <View style={[s.hero, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={s.row}>
            <View style={[s.avatar, { borderColor: accent, backgroundColor: C.surfaceRaised }]}>
              <UserAvatar size={72} />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={[s.eyebrow, { color: accent }]}>{tanod ? "BARANGAY TANOD" : "COMMUNITY MEMBER"}</Text>
              <Text style={{ color: C.text, fontSize: 23, fontWeight: "700" }}>{profile?.fullName || user?.fullName || "Your account"}</Text>
              <Text style={{ color: C.textSub, fontSize: 12 }} numberOfLines={2}>{user?.primaryEmailAddress?.emailAddress || profile?.email}</Text>
            </View>
          </View>
          <View style={[s.row, { borderTopWidth: 1, borderColor: C.border, paddingTop: 18 }]}>
            <MapPin color={accent} size={18} /><View style={{ flex: 1 }}><Text style={{ color: C.textDim, fontSize: 11 }}>YOUR COMMUNITY</Text><Text style={{ color: C.text, fontWeight: "600", marginTop: 4 }}>{(tanod ? profile?.assignedBarangay : profile?.barangay) || "Choose your barangay"}</Text></View>
            <Pressable accessibilityRole="button" onPress={() => router.push("/edit-profile")} style={{ backgroundColor: accent, paddingHorizontal: 16, paddingVertical: 16, borderRadius: 13 }}><Text style={{ color: tanod ? "#111827" : "#FFFFFF", fontWeight: "700", fontSize: 12 }}>Edit profile</Text></Pressable>
          </View>
        </View>
        <View style={{ gap: 12 }}>
          <Text style={{ color: C.text, fontSize: 17, fontWeight: "700" }}>Account & activity</Text>
          <View style={{ borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, borderRadius: 24, overflow: "hidden" }}>
            {actions.map(({ title, sub, icon: Icon, onPress }, index) => <Pressable key={title} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.row, { padding: 16, opacity: pressed ? 0.65 : 1, borderTopWidth: index ? 1 : 0, borderColor: C.border }]}>
              <View style={[s.icon, { backgroundColor: tanod ? C.warnGlow : C.accentGlow }]}><Icon color={accent} size={20} /></View>
              <View style={{ flex: 1, gap: 4 }}><Text style={{ color: C.text, fontWeight: "600", fontSize: 14 }}>{title}</Text><Text style={{ color: C.textSub, fontSize: 13, lineHeight: 20 }}>{sub}</Text></View><ChevronRight size={17} color={C.textDim} />
            </Pressable>)}
          </View>
        </View>
        <View style={[s.row, { justifyContent: "center" }]}><ShieldCheck size={16} color={C.textDim} /><Text style={{ color: C.textDim, fontSize: 12 }}>AEDEX · Community dengue surveillance</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  title: { fontSize: 32, fontFamily: "Manrope_700Bold", marginTop: 5, letterSpacing: -0.7 },
  hero: { borderRadius: 28, padding: 24, borderWidth: 1, gap: 22 },
  avatar: { width: 80, height: 80, borderRadius: 27, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  icon: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center" },
});
