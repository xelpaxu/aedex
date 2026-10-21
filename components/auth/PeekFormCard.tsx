import { useTheme } from "@/context/ThemeContext";
import { Image } from "expo-image";
import { type PropsWithChildren, useState } from "react";
import { View } from "react-native";

/** The artwork's paws sit at 91.5% of its height, directly on the card edge. */
export default function PeekFormCard({ children }: PropsWithChildren) {
  const { colors: C } = useTheme();
  const [width, setWidth] = useState(280);
  const imageWidth = Math.min(240, width * 0.8);
  const imageHeight = imageWidth * (705 / 1024);

  return <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
    <View pointerEvents="none" style={{ height: imageHeight * 0.915 }} />
    <View style={{
      padding: 20, paddingTop: 30, borderRadius: 24,
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    }}>
      {children}
    </View>
    <Image
      source={require("../../assets/images/login_peek.png")}
      contentFit="contain"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{ position: "absolute", top: 0, right: 8, width: imageWidth, height: imageHeight }}
    />
  </View>;
}
