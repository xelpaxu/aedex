import UserAvatar from "@/components/UserAvatar";
import { Text } from "@/components/Typography";
import { useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { ArrowLeft, ChevronRight, Settings, ClipboardList, Bell } from "lucide-react-native";
import { Pressable, ScrollView, View } from "react-native";
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
  const community = (tanod ? profile?.assignedBarangay : profile?.barangay) || "Not set";
  const actions = [
    { title: tanod ? "Team assignments" : "My reports", icon: ClipboardList, onPress: () => router.push(tanod ? "/(root)/(tanod-tabs)/reports" : "/(root)/(tabs)/reports") },
    { title: "Notifications", icon: Bell, onPress: () => router.push("/notifications") },
    { title: "Settings", icon: Settings, onPress: () => router.push("/settings") },
  ];
  return <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: C.bg }}>
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, minHeight: 60, borderBottomWidth: 1, borderColor: C.border }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.canGoBack() ? router.back() : router.replace(tanod ? "/(root)/(tanod-tabs)/map" : "/(root)/(tabs)/map")} style={({ pressed }) => ({ width: 48, height: 48, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.5 : 1 })}><ArrowLeft color={C.text} size={22} /></Pressable>
      <Text accessibilityRole="header" style={{ flex: 1, color: C.text, fontSize: 17, fontWeight: "600" }}>Profile</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Edit profile" onPress={() => router.push("/edit-profile")} style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 12, justifyContent: "center", opacity: pressed ? 0.5 : 1 })}><Text style={{ color: C.accent, fontSize: 15, fontWeight: "600" }}>Edit</Text></Pressable>
    </View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 116 + insets.bottom, maxWidth: 620, width: "100%", alignSelf: "center" }}>
      <Text style={{ color: C.text, fontSize: 32, fontWeight: "700", letterSpacing: -1, marginBottom: 24 }}>Your account</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 18, paddingBottom: 28 }}>
        <UserAvatar size={76} />
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={{ color: C.text, fontSize: 23, lineHeight: 30, fontWeight: "600" }}>{profile?.fullName || user?.fullName || "Your account"}</Text>
          <Text style={{ color: C.textSub, fontSize: 14 }}>{tanod ? "Barangay tanod" : "Community member"}</Text>
          <Text style={{ color: C.textSub, fontSize: 14 }}>{community}</Text>
        </View>
      </View>
      <Pressable accessibilityRole="button" onPress={() => router.push("/edit-profile")} style={({ pressed }) => ({ minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: C.borderBright, backgroundColor: pressed ? C.surfaceRaised : C.surface, alignItems: "center", justifyContent: "center", marginBottom: 32 })}><Text style={{ color: C.text, fontSize: 15, fontWeight: "600" }}>Edit personal details</Text></Pressable>
      <Text accessibilityRole="header" style={{ color: C.textSub, fontSize: 13, fontWeight: "500", paddingBottom: 12 }}>Personal information</Text>
      {[{ label: "Email", value: user?.primaryEmailAddress?.emailAddress || profile?.email || "Not set" }, { label: "Phone", value: profile?.phone || "Not added" }, { label: tanod ? "Assigned barangay" : "Barangay", value: community }].map(detail => <View key={detail.label} style={{ paddingVertical: 18, paddingHorizontal: 16, backgroundColor: C.surface, gap: 7, borderBottomWidth: 1, borderColor: C.border }}><Text style={{ color: C.textSub, fontSize: 13 }}>{detail.label}</Text><Text selectable style={{ color: C.text, fontSize: 16, lineHeight: 24 }}>{detail.value}</Text></View>)}
      <View style={{ marginTop: 32 }}>
        <Text accessibilityRole="header" style={{ color: C.textSub, fontSize: 13, fontWeight: "500", paddingBottom: 8 }}>Activity & preferences</Text>
        {actions.map(({ title, icon: Icon, onPress }) => <Pressable key={title} accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 16, minHeight: 64, paddingVertical: 18, borderBottomWidth: 1, borderColor: C.border, paddingHorizontal: 16, backgroundColor: pressed ? C.surfaceRaised : C.surface })}><Icon color={C.textSub} size={21} /><Text style={{ flex: 1, color: C.text, fontSize: 16 }}>{title}</Text><ChevronRight color={C.textDim} size={18} /></Pressable>)}
      </View>
    </ScrollView>
  </SafeAreaView>;
}
