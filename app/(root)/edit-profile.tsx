import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  ArrowLeft,
  Check,
  MapPin,
  ShieldCheck,
  UserRound,
} from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import { useProfile } from "@/context/AccessContext";
import { useTheme } from "@/context/ThemeContext";
import {
  PILOT_BARANGAYS,
  hasPilotBarangay,
  hasTanodAccess,
} from "@/constants/access";
export default function EditProfile({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const profile = useProfile();
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const { colors: C } = useTheme();
  const saveProfile = useMutation(api.users.updateProfile);
  const [firstName, setFirstName] = useState(
      profile?.firstName || user?.firstName || "",
    ),
    [lastName, setLastName] = useState(
      profile?.lastName || user?.lastName || "",
    ),
    [phone, setPhone] = useState(profile?.phone || ""),
    [barangay, setBarangay] = useState(
      hasPilotBarangay(profile?.barangay) ? profile!.barangay! : "",
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const mandatory =
    !profile?.profileComplete || !hasPilotBarangay(profile.barangay);
  const officer = profile?.role === "tanod";
  const teams = useQuery(
    api.users.getTeamsByBarangay,
    officer && profile?.assignedBarangay
      ? { barangay: profile.assignedBarangay }
      : "skip",
  );
  const accent = officer ? C.warn : C.accent;
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  async function updatePhoto() {
    setError("");
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError("Allow photo library access to update your picture.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });
      if (result.canceled || !result.assets[0]?.base64 || !user) return;
      setUploading(true);
      await user.setProfileImage({
        file: `data:${result.assets[0].mimeType || "image/jpeg"};base64,${result.assets[0].base64}`,
      });
    } catch {
      setError("Could not update your photo. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setError("");
    setSaved(false);
    if (!firstName.trim() || !lastName.trim() || !hasPilotBarangay(barangay)) {
      setError("Enter your name and choose one of the three pilot barangays.");
      return;
    }
    setBusy(true);
    try {
      await saveProfile({ firstName, lastName, phone, barangay });
      setSaved(true);
      if (!embedded || mandatory) router.replace("/(root)");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not save your profile. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  const inputStyle = {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceRaised,
    borderRadius: 12,
    padding: 14,
    color: C.text,
    fontSize: 15,
  };
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: C.bg }}
      edges={embedded ? ["top"] : ["top", "bottom"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 12,
            gap: 12,
            borderBottomWidth: 1,
            borderColor: C.border,
          }}
        >
          {!mandatory && !embedded && (
            <Pressable
              accessibilityLabel="Back"
              hitSlop={12}
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/(root)")
              }
            >
              <ArrowLeft color={C.text} size={22} />
            </Pressable>
          )}
          <Text
            style={{ fontWeight: "700", fontSize: 18, color: C.text, flex: 1 }}
          >
            Your profile
          </Text>
          <Text style={{ fontSize: 11, color: accent, fontWeight: "700" }}>
            {officer ? "TANOD" : "COMMUNITY"}
          </Text>
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, gap: 24, paddingBottom: 40, maxWidth: 640, width: "100%", alignSelf: "center" }}
        >
          <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
            {user?.imageUrl ? (
              <Image
                source={{ uri: user.imageUrl }}
                style={{ width: 60, height: 60, borderRadius: 20 }}
              />
            ) : (
              <UserRound color={accent} size={40} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 22, fontWeight: "700", color: C.text }}>
                {mandatory
                  ? "Let’s get you set up"
                  : profile?.fullName || "Your account"}
              </Text>
              <Text style={{ fontSize: 13, color: C.textSub, marginTop: 4 }}>
                {user?.primaryEmailAddress?.emailAddress || profile?.email}
              </Text>
            </View>
          </View>
          <Pressable accessibilityRole="button" disabled={uploading} onPress={updatePhoto} style={{ alignSelf: "flex-start", minHeight: 44, justifyContent: "center", paddingHorizontal: 16, borderRadius: 12, backgroundColor: officer ? C.warnGlow : C.accentGlow }}>
            <Text style={{ color: accent, fontWeight: "600" }}>
              {uploading ? "Updating photo�" : "Change profile photo"}
            </Text>
          </Pressable>
          {mandatory && (
            <View
              style={{
                backgroundColor: C.accentGlow,
                padding: 16,
                borderRadius: 14,
              }}
            >
              <Text style={{ color: C.text, fontWeight: "600" }}>
                Choose your barangay to continue
              </Text>
              <Text style={{ color: C.textSub, lineHeight: 20, marginTop: 5 }}>
                Your reports are sent to the barangay you select below. This
                pilot covers three barangays.
              </Text>
            </View>
          )}
          {officer && (
            <View
              style={{
                backgroundColor: C.surface,
                padding: 16,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: C.border,
                gap: 6,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <ShieldCheck color={accent} size={18} />
                <Text style={{ color: C.text, fontWeight: "700" }}>
                  Official assignment
                </Text>
              </View>
              <Text style={{ color: C.text }}>
                {teams?.find((t) => t._id === profile?.teamId)?.name ||
                  "Contact your LGU administrator"}
              </Text>
              <Text style={{ color: C.textSub, fontSize: 13 }}>
                {profile?.assignedBarangay || "Unassigned"} ·{" "}
                {profile?.tanodStatus || "Awaiting LGU review"}
              </Text>
              <Text style={{ color: C.textSub, fontSize: 12, lineHeight: 18 }}>
                Your LGU manages this assignment.{" "}
                {hasTanodAccess(profile)
                  ? ""
                  : "Officer tools are unavailable until your access is active."}
              </Text>
            </View>
          )}
          <View style={{ gap: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: C.text }}>
              Personal details
            </Text>
            {[
              ["First name", firstName, setFirstName],
              ["Last name", lastName, setLastName],
              ["Phone (optional)", phone, setPhone],
            ].map(([label, value, setter]) => (
              <View key={String(label)} style={{ gap: 6 }}>
                <Text style={{ fontSize: 13, color: C.textSub }}>
                  {String(label)}
                </Text>
                <TextInput
                  accessibilityLabel={String(label)}
                  style={inputStyle}
                  value={value as string}
                  onChangeText={setter as (s: string) => void}
                  editable={!busy}
                  keyboardType={
                    String(label).startsWith("Phone") ? "phone-pad" : "default"
                  }
                  autoCapitalize={
                    String(label).startsWith("Phone") ? "none" : "words"
                  }
                />
              </View>
            ))}
          </View>
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: C.text }}>
              Reporting barangay
            </Text>
            <Text style={{ fontSize: 13, color: C.textSub, lineHeight: 20 }}>
              New reports will use this barangay. Changing it won’t move your
              previous reports.
              {officer ? " This does not change your official team." : ""}
            </Text>
            {PILOT_BARANGAYS.map((b) => (
              <Pressable
                key={b}
                accessibilityRole="radio"
                accessibilityState={{ checked: barangay === b }}
                onPress={() => setBarangay(b)}
                disabled={busy}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 16,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: barangay === b ? accent : C.border,
                  backgroundColor: barangay === b ? C.surfaceRaised : C.surface,
                }}
              >
                <MapPin color={barangay === b ? accent : C.textSub} size={20} />
                <Text
                  style={{
                    flex: 1,
                    fontSize: 15,
                    fontWeight: "600",
                    color: C.text,
                  }}
                >
                  Barangay {b}
                </Text>
                {barangay === b && <Check color={accent} size={20} />}
              </Pressable>
            ))}
          </View>
          {saved && (
            <Text style={{ color: C.safe }}>
              Profile saved. Future reports will use Barangay {barangay}.
            </Text>
          )}
          {!!error && (
            <Text
              accessibilityRole="alert"
              style={{ color: C.danger, lineHeight: 20 }}
            >
              {error}
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={save}
            style={{
              backgroundColor: accent,
              borderRadius: 14,
              padding: 16,
              alignItems: "center",
            }}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                style={{
                  color: officer ? "#111827" : "#fff",
                  fontWeight: "700",
                  fontSize: 15,
                }}
              >
                {mandatory ? "Save & continue" : "Save changes"}
              </Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => void signOut()}
            style={{ alignItems: "center", padding: 10 }}
          >
            <Text style={{ color: C.textSub }}>Sign out</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
