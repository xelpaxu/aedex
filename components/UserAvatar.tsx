import { useUser } from "@clerk/clerk-expo";
import { useState } from "react";
import { Image, View } from "react-native";
import { Text } from "@/components/Typography";
import { useProfile } from "@/context/AccessContext";
import { useTheme } from "@/context/ThemeContext";

export default function UserAvatar({ size = 44 }: { size?: number }) {
  const { user } = useUser();
  const profile = useProfile();
  const { colors: C } = useTheme();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const name = profile?.fullName?.trim() || user?.fullName?.trim() || user?.firstName || "Aedex";
  const words = name.split(/\s+/);
  const initials = (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase();
  const uri = user?.hasImage ? user.imageUrl : undefined;
  return <View accessible={false} style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", backgroundColor: C.accentGlow, alignItems: "center", justifyContent: "center" }}>
    {uri && failedUri !== uri ? <Image accessible={false} source={{ uri }} onError={() => setFailedUri(uri)} style={{ width: size, height: size }} /> : <Text style={{ color: C.text, fontFamily: "Inter_700Bold", fontSize: size * 0.34 }}>{initials}</Text>}
  </View>;
}
