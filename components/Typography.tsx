import { createContext, forwardRef, useContext } from "react";
import {
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  type TextProps,
  type TextInputProps,
  type TextStyle,
} from "react-native";

const families = {
  400: "Inter_400Regular",
  500: "Inter_500Medium",
  600: "Inter_600SemiBold",
  700: "Inter_700Bold",
  800: "Inter_800ExtraBold",
  900: "Inter_900Black",
};
const FontContext = createContext<TextStyle>({ fontFamily: families[400] });

function resolveFont(style: TextStyle, inherited: TextStyle): TextStyle {
  if (style.fontFamily && !style.fontFamily.startsWith("Inter_")) return style;
  if (style.fontWeight) {
    const weight = style.fontWeight === "bold" ? 700 : style.fontWeight === "normal" ? 400 : Number(style.fontWeight);
    const key = Math.max(400, Math.min(900, Math.round(weight / 100) * 100)) as keyof typeof families;
    return { fontFamily: families[key], fontWeight: "normal" };
  }
  return { fontFamily: style.fontFamily ?? inherited.fontFamily, fontWeight: "normal" };
}

/** Shared Inter typography, including real font files for each supported weight. */
export const Text = forwardRef<NativeText, TextProps>(function Text({ style, children, ...props }, ref) {
  const inherited = useContext(FontContext);
  const font = resolveFont(StyleSheet.flatten(style) ?? {}, inherited);
  return <FontContext.Provider value={font}>
    <NativeText ref={ref} {...props} style={[style, font]}>{children}</NativeText>
  </FontContext.Provider>;
});

export const TextInput = forwardRef<NativeTextInput, TextInputProps>(function TextInput({ style, ...props }, ref) {
  const font = resolveFont(StyleSheet.flatten(style) ?? {}, { fontFamily: families[400] });
  return <NativeTextInput ref={ref} {...props} style={[style, font]} />;
});
