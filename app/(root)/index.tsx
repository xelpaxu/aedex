import { useQuery } from "convex/react";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { api } from "@/convex/_generated/api";
import { useTheme } from "../../context/ThemeContext";

export default function Index() {
  const currentUser = useQuery(api.users.getMe);
  const { colors } = useTheme();

  // Loading state while verifying identity with Convex backend
  if (currentUser === undefined) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  // If user has not completed their profile setup yet, send to complete-profile
  if (currentUser && !currentUser.profileComplete) {
    return <Redirect href="/(auth)/complete-profile" />;
  }

  // Verified active Tanod officer
  if (currentUser?.role === "tanod") {
    // If Tanod membership is suspended or revoked by LGU, fall back to Community map
    if (
      currentUser.tanodStatus === "suspended" ||
      currentUser.tanodStatus === "revoked"
    ) {
      return <Redirect href="/(root)/(tabs)/map" />;
    }
    return <Redirect href="/(root)/(tanod-tabs)/dashboard" />;
  }

  // Default: Resident / Community interface
  return <Redirect href="/(root)/(tabs)/map" />;
}
