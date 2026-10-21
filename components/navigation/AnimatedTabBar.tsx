import { useTheme } from "@/context/ThemeContext";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { ClipboardList, Map, ScanLine } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Keyboard, Platform, Pressable, View, useWindowDimensions } from "react-native";
import { Text } from "@/components/Typography";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const tabs = [
  { name: "map", label: "Map", Icon: Map },
  { name: "capture", label: "Capture", Icon: ScanLine },
  { name: "reports", label: "Reports", Icon: ClipboardList },
];
const CIRCLE_SIZE = 58;

export default function AnimatedTabBar({ state, descriptors, navigation, tanod = false }: BottomTabBarProps & { tanod?: boolean }) {
  const { colors: C } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [barWidth, setBarWidth] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(Keyboard.isVisible());
  const [reduceMotion, setReduceMotion] = useState(true);
  const activeName = state.routes[state.index].name;
  const activeIndex = tabs.findIndex((tab) => tab.name === activeName);
  const position = useRef(new Animated.Value(Math.max(activeIndex, 0))).current;
  const scales = useRef(tabs.map((_, index) => new Animated.Value(index === activeIndex ? 1.4 : 1))).current;
  const lifts = useRef(tabs.map((_, index) => new Animated.Value(index === activeIndex ? -12 : 0))).current;
  const accent = tanod ? C.warn : C.accent;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const motion = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setKeyboardVisible(false));
    return () => { mounted = false; motion.remove(); show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    const target = Math.max(activeIndex, 0);
    if (reduceMotion) {
      position.stopAnimation();
      position.setValue(target);
      scales.forEach((scale, index) => {
        scale.stopAnimation();
        scale.setValue(index === activeIndex ? 1.4 : 1);
      });
      lifts.forEach((lift, index) => { lift.stopAnimation(); lift.setValue(index === activeIndex ? -12 : 0); });
      return;
    }
    const animation = Animated.parallel([
      Animated.spring(position, { toValue: target, damping: 24, stiffness: 240, mass: 0.9, useNativeDriver: true }),
      ...lifts.map((lift, index) => Animated.spring(lift, { toValue: index === activeIndex ? -12 : 0, damping: 18, stiffness: 260, mass: 0.8, useNativeDriver: true })),
      ...scales.map((scale, index) => Animated.spring(scale, {
        toValue: index === activeIndex ? 1.4 : 1,
        damping: 17, stiffness: 280, mass: 0.7, useNativeDriver: true,
      })),
    ]);
    animation.start();
    return () => animation.stop();
  }, [activeIndex, position, reduceMotion, scales, lifts]);

  const slotWidth = barWidth / tabs.length;
  return (
    <View
      onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
      style={{
        display: keyboardVisible ? "none" : "flex",
        position: "absolute", left: Math.max(24, insets.left + 12, (width - 420) / 2),
        right: Math.max(24, insets.right + 12, (width - 420) / 2),
        bottom: Math.max(insets.bottom, 12), height: 80, borderRadius: 40,
        backgroundColor: C.surface, borderWidth: 1, borderColor: C.borderBright,
        shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.16, shadowRadius: 24, elevation: 6,
      }}
    >
      {barWidth > 0 && activeIndex >= 0 && <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute", top: -12, left: (slotWidth - CIRCLE_SIZE) / 2 - 1,
          width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2,
          backgroundColor: tanod ? C.warnGlow : C.accentGlow,
          borderWidth: 1, borderColor: accent,
          transform: [{ translateX: Animated.multiply(position, slotWidth) }],
        }}
      />}
      <View style={{ flex: 1, flexDirection: "row", paddingTop: 5, paddingBottom: 7 }}>
        {tabs.map(({ name, label, Icon }, index) => {
          const route = state.routes.find((item) => item.name === name);
          if (!route) return null;
          const focused = activeIndex === index;
          const options = descriptors[route.key].options;
          return <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            accessibilityState={{ selected: focused }}
            testID={options.tabBarButtonTestID}
            onPress={() => {
              const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
            }}
            onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
            style={({ pressed }) => ({ flex: 1, alignItems: "center", opacity: pressed ? 0.65 : 1 })}
          >
            <View style={{ width: 48, height: 44, alignItems: "center", justifyContent: "center" }}>
              <Animated.View style={{ transform: [{ translateY: lifts[index] }, { scale: scales[index] }] }}>
                <Icon color={focused ? accent : C.textSub} size={22} strokeWidth={focused ? 2.5 : 1.8} />
              </Animated.View>
            </View>
            <Text maxFontSizeMultiplier={1.3} style={{ marginTop: 3, fontSize: 12, lineHeight: 16, fontFamily: "Inter_600SemiBold", color: focused ? accent : C.textSub }}>{label}</Text>
          </Pressable>;
        })}
      </View>
    </View>
  );
}
