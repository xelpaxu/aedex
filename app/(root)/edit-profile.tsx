import UserAvatar from "@/components/UserAvatar";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { Text, TextInput } from "@/components/Typography";
import {
  ArrowLeft,
  Check,
  MapPin,
  ShieldCheck,
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
      if (mandatory) router.replace("/(root)");
      else if (!embedded) {
        if (router.canGoBack()) router.back();
        else router.replace("/(root)");
      }
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
    backgroundColor: C.surface,
    borderRadius: 10,
    padding: 14,
    color: C.text,
    fontSize: 16,
    minHeight: 54,
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
            paddingHorizontal: 16,
            paddingVertical: 6,
            gap: 12,
            borderBottomWidth: 1,
            borderColor: C.border,
          }}
        >
          {!mandatory && !embedded && (
            <Pressable
              accessibilityLabel="Back"
              accessibilityRole="button"
              style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}
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
            {mandatory ? "Complete profile" : "Edit profile"}
          </Text>
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 24, gap: 28, paddingBottom: 40, maxWidth: 640, width: "100%", alignSelf: "center" }}
        >
          <View style={{ alignItems: "center", gap: 12, paddingTop: 12, paddingBottom: 8 }}>
            <UserAvatar size={88} />
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: uploading, busy: uploading }} disabled={uploading || busy} onPress={updatePhoto} style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 8, opacity: pressed || uploading ? 0.6 : 1 })}>
              {uploading && <ActivityIndicator color={C.accent} size="small" />}<Text style={{ color: C.accent, fontSize: 15, fontWeight: "600" }}>{uploading ? "Updating photo..." : "Change photo"}</Text>
            </Pressable>
          </View>
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
                backgroundColor: C.surfaceRaised,
                padding: 18,
                borderRadius: 12,
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
          <View style={{ gap: 18 }}>
            <Text style={{ fontSize: 18, fontWeight: "600", color: C.text }}>
              Name & contact
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
            <Text style={{ fontSize: 18, fontWeight: "600", color: C.text }}>
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
                  borderRadius: 10,
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
            disabled={busy || uploading}
            accessibilityState={{ disabled: busy || uploading, busy }}
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
          {mandatory && <Pressable
            accessibilityRole="button"
            onPress={() => void signOut()}
            style={{ alignItems: "center", padding: 10 }}
          >
            <Text style={{ color: C.textSub }}>Sign out</Text>
          </Pressable>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
