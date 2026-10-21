import { useState } from "react";
import { useAction } from "convex/react";
import { useAuth } from "@clerk/clerk-expo";
import { api } from "@/convex/_generated/api";
import { useTheme } from "@/context/ThemeContext";
import { ScrollView, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { Text, TextInput } from "@/components/Typography";
import { SafeAreaView } from "react-native-safe-area-context";
export default function PasswordSetup() {
  const { colors: C } = useTheme();
  const { signOut } = useAuth();
  const change = useAction(api.tanodActions.changeInitialPassword);
  const [current, setCurrent] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function save() {
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      await change({ currentPassword: current, newPassword: password });
      setCurrent("");
      setPassword("");
      setConfirm("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Password update failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 24, gap: 18 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ color: C.accent, fontWeight: "700" }}>
            TANOD ACCOUNT SETUP
          </Text>
          <Text style={{ fontSize: 28, fontWeight: "700", color: C.text }}>
            Make this account yours
          </Text>
          <Text style={{ color: C.textSub, lineHeight: 22 }}>
            Replace the temporary password provided by your LGU with a password
            only you know.
          </Text>
          {[
            ["Current / temporary password", current, setCurrent],
            ["New password (12+ characters)", password, setPassword],
            ["Confirm new password", confirm, setConfirm],
          ].map(([label, value, setter]) => (
            <TextInput
              key={String(label)}
              accessibilityLabel={String(label)}
              placeholder={String(label)}
              placeholderTextColor={C.textSub}
              value={value as string}
              onChangeText={setter as (s: string) => void}
              secureTextEntry
              autoCapitalize="none"
              editable={!busy}
              style={{
                backgroundColor: C.surface,
                borderColor: C.border,
                borderWidth: 1,
                borderRadius: 14,
                padding: 16,
                color: C.text,
              }}
            />
          ))}
          {!!error && (
            <Text accessibilityRole="alert" style={{ color: C.danger }}>
              {error}
            </Text>
          )}
          <Pressable
            disabled={busy}
            onPress={save}
            style={{ backgroundColor: C.accent, padding: 16, borderRadius: 14 }}
          >
            <Text
              style={{ color: "white", fontWeight: "700", textAlign: "center" }}
            >
              {busy ? "Saving…" : "Save password & continue"}
            </Text>
          </Pressable>
          <Pressable onPress={() => void signOut()}>
            <Text style={{ color: C.textSub, textAlign: "center" }}>
              Sign out
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
