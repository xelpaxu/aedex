import { Text as NativeText, Platform, View, Pressable, type TextProps } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { useTheme } from "@/context/ThemeContext";
export function useAccountTheme() {
  const theme = useTheme();
  return { ...theme, colors: { ...theme.colors, actionText: theme.isDark ? "#62CEC3" : theme.colors.accent } };
}
export function Text({ style, ...props }: TextProps) {
  return <NativeText {...props} style={[{ fontFamily: Platform.OS === "ios" ? "System" : "sans-serif" }, style]} />;
}
export function BackButton({ onPress, disabled = false }: { onPress: () => void; disabled?: boolean }) {
  const { colors: C } = useAccountTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel="Back" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => ({ minHeight: 48, minWidth: 72, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", opacity: disabled ? 0.35 : pressed ? 0.5 : 1 })}>
    <ChevronLeft color={C.actionText} size={28} />
    <Text style={{ color: C.actionText, fontSize: 17 }}>Back</Text>
  </Pressable>;
}
export function AccountHeader({ title, onBack, action, onAction, disabled = false }: { title: string; onBack?: () => void; action?: string; onAction?: () => void; disabled?: boolean }) {
  const { colors: C } = useAccountTheme();
  return <View style={{ minHeight: 52, flexDirection: "row", alignItems: "center", paddingHorizontal: 8 }}>
    <View style={{ flex: 1 }}>{onBack && <BackButton onPress={onBack} />}</View>
    <Text accessibilityRole="header" style={{ flex: 2, color: C.text, fontSize: 17, fontWeight: "600", textAlign: "center", paddingVertical: 12 }}>{title}</Text>
    <View style={{ flex: 1, alignItems: "flex-end" }}>{action && <Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{ disabled }} onPress={onAction} style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 8, justifyContent: "center", opacity: disabled ? 0.35 : pressed ? 0.5 : 1 })}><Text style={{ color: C.actionText, fontSize: 17, fontWeight: "600" }}>{action}</Text></Pressable>}</View>
  </View>;
}
