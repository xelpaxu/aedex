import UserAvatar from "@/components/UserAvatar";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { TextInput } from "@/components/Typography";
import {
  Check,
  MapPin,
  ShieldCheck,
} from "lucide-react-native";
import { api } from "@/convex/_generated/api";
import { useProfile } from "@/context/AccessContext";
import { Text, useAccountTheme as useTheme, AccountHeader } from "@/components/AccountUI";
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
  const accent = C.accent;
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
    borderWidth: 0,
    borderColor: C.border,
    backgroundColor: "transparent",
    borderRadius: 0,
    paddingVertical: 14,
    paddingHorizontal: 0,
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
        <AccountHeader title={mandatory ? "Complete profile" : "Edit profile"} onBack={!mandatory && !embedded ? () => router.canGoBack() ? router.back() : router.replace("/(root)") : undefined} action={busy ? "Saving..." : "Done"} onAction={save} disabled={busy || uploading} />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 24, gap: 28, paddingBottom: 40, maxWidth: 640, width: "100%", alignSelf: "center" }}
        >
          <View style={{ alignItems: "center", gap: 12, paddingTop: 12, paddingBottom: 8 }}>
            <UserAvatar size={88} />
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: uploading, busy: uploading }} disabled={uploading || busy} onPress={updatePhoto} style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 8, opacity: pressed || uploading ? 0.6 : 1 })}>
              {uploading && <ActivityIndicator color={C.actionText} size="small" />}<Text style={{ color: C.actionText, fontSize: 15, fontWeight: "600" }}>{uploading ? "Updating photo..." : "Change photo"}</Text>
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
                backgroundColor: "transparent",
                paddingVertical: 18,
                borderTopWidth: 0.5,
                borderBottomWidth: 0.5,
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
          <View style={{ gap: 0 }}>
            <Text style={{ fontSize: 17, fontWeight: "600", color: C.text, paddingBottom: 16 }}>
              Name & contact
            </Text>
            {[
              ["First name", firstName, setFirstName],
              ["Last name", lastName, setLastName],
              ["Phone (optional)", phone, setPhone],
            ].map(([label, value, setter]) => (
              <View key={String(label)} style={{ borderTopWidth: 0.5, borderColor: C.border, paddingTop: 12 }}>
                <Text style={{ fontSize: 13, color: C.textSub }}>
                  {String(label)}
                </Text>
                <TextInput
                  accessibilityLabel={String(label)}
                  style={[inputStyle, { fontFamily: Platform.OS === "ios" ? "System" : "sans-serif" }]}
                  value={value as string}
                  onChangeText={setter as (s: string) => void}
                  editable={!busy && !uploading}
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
          <View style={{ gap: 0 }}>
            <Text style={{ fontSize: 17, fontWeight: "600", color: C.text, paddingBottom: 16 }}>
              Reporting barangay
            </Text>
            <Text style={{ fontSize: 13, color: C.textSub, lineHeight: 20, paddingBottom: 16 }}>
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
                disabled={busy || uploading}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 18,
                  borderRadius: 0,
                  borderTopWidth: 0.5,
                  borderColor: C.border,
                  backgroundColor: "transparent",
                }}
              >
                <MapPin color={barangay === b ? C.actionText : C.textSub} size={20} />
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
                {barangay === b && <Check color={C.actionText} size={20} />}
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
                  color: "#fff",
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
