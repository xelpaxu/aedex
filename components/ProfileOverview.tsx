import UserAvatar from "@/components/UserAvatar";
import { useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { ChevronRight, Settings, ClipboardList, Bell } from "lucide-react-native";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useProfile } from "@/context/AccessContext";
import { Text, useAccountTheme as useTheme, AccountHeader } from "@/components/AccountUI";
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
    <AccountHeader title="Profile" onBack={() => router.canGoBack() ? router.back() : router.replace(tanod ? "/(root)/(tanod-tabs)/map" : "/(root)/(tabs)/map")} action="Edit" onAction={() => router.push("/edit-profile")} />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 116 + insets.bottom, maxWidth: 620, width: "100%", alignSelf: "center" }}>
      <View style={{ alignItems: "center", gap: 10, paddingBottom: 32 }}>
        <UserAvatar size={88} />
        <Text style={{ color: C.text, fontSize: 27, fontWeight: "600", textAlign: "center", marginTop: 6 }}>{profile?.fullName || user?.fullName || "Your account"}</Text>
        <Text style={{ color: C.textSub, fontSize: 15 }}>{tanod ? "Barangay tanod" : "Community member"}</Text>
      </View>
      <Text accessibilityRole="header" style={{ color: C.textSub, fontSize: 15, fontWeight: "600", paddingBottom: 12 }}>Personal information</Text>
      <View style={{ borderTopWidth: 0.5, borderColor: C.border }}>{[{ label: "Email", value: user?.primaryEmailAddress?.emailAddress || profile?.email || "Not set" }, { label: "Phone", value: profile?.phone || "Not added" }, { label: tanod ? "Assigned barangay" : "Barangay", value: community }].map((detail, index) => <View key={detail.label} style={{ paddingVertical: 18, paddingHorizontal: 0, backgroundColor: "transparent", gap: 7, borderTopWidth: index ? 0.5 : 0, borderColor: C.border }}><Text style={{ color: C.textSub, fontSize: 13 }}>{detail.label}</Text><Text selectable style={{ color: C.text, fontSize: 16, lineHeight: 24 }}>{detail.value}</Text></View>)}</View>
      <View style={{ marginTop: 32 }}>
        <Text accessibilityRole="header" style={{ color: C.textSub, fontSize: 15, fontWeight: "600", paddingBottom: 8 }}>Activity & preferences</Text>
        <View style={{ borderTopWidth: 0.5, borderColor: C.border }}>{actions.map(({ title, icon: Icon, onPress }) => <Pressable key={title} accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 16, minHeight: 64, paddingVertical: 18, borderBottomWidth: 1, borderColor: C.border, paddingHorizontal: 0, backgroundColor: pressed ? C.surfaceRaised : "transparent" })}><Icon color={C.actionText} size={21} /><Text style={{ flex: 1, color: C.text, fontSize: 16 }}>{title}</Text><ChevronRight color={C.textDim} size={18} /></Pressable>)}</View>
      </View>
    </ScrollView>
  </SafeAreaView>;
}
