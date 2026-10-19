import { useTheme } from "@/context/ThemeContext";
import { Stack } from "expo-router";
import { useProfile } from "@/context/AccessContext";
import { hasPilotBarangay, hasTanodAccess } from "@/constants/access";
export default function AppLayout() {
  const profile = useProfile();
  const { colors } = useTheme();
  const password = !!profile?.mustChangePassword;
  const complete =
    !!profile?.profileComplete &&
    hasPilotBarangay(profile.barangay) &&
    !password;
  const tanod = hasTanodAccess(profile);
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={password}>
        <Stack.Screen name="password-setup" />
      </Stack.Protected>
      <Stack.Protected guard={complete}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={!tanod}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Protected guard={tanod}>
          <Stack.Screen name="(tanod-tabs)" />
        </Stack.Protected>
        <Stack.Screen name="capture" options={{headerShown:true,title:"New report",headerStyle:{backgroundColor:colors.bg},headerTintColor:colors.text}} />
        <Stack.Screen name="settings" />
        <Stack.Screen name="results" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="community-feed" />
      </Stack.Protected>
      <Stack.Protected guard={!password}>
        <Stack.Screen name="edit-profile" />
      </Stack.Protected>
    </Stack>
  );
}
