import { useQuery } from "convex/react";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { api } from "../../../convex/_generated/api";
import { useTheme } from "../../context/ThemeContext";

export default function Index() {
  const currentUser = useQuery(api.users.getMe);
  const { colors } = useTheme();

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

  if (currentUser?.role === "tanod") {
    return <Redirect href="/(root)/(tanod-tabs)/dashboard" />;
  }

  return <Redirect href="/(root)/(tabs)/map" />;
}
