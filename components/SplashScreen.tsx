import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, StatusBar, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import BrandMascot from "./BrandMascot";

/** A short startup introduction, never used as an authentication/loading screen. */
export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [ready, setReady] = useState(false);
  const entrance = useRef(new Animated.Value(0)).current;
  const { width, height } = useWindowDimensions();
  const size = Math.min(width * 0.78, height * 0.4, 320);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (!active) return;
      if (reduced) entrance.setValue(1);
      else Animated.timing(entrance, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }).catch(() => entrance.setValue(1));
    const readyTimer = setTimeout(() => setReady(true), 950);
    const finishTimer = setTimeout(onFinish, 1800);
    return () => {
      active = false;
      clearTimeout(readyTimer); clearTimeout(finishTimer);
      entrance.stopAnimation();
    };
  }, [entrance, onFinish]);
  return <LinearGradient colors={["#071222", "#102B47", "#0B0E14"]} style={styles.screen}>
    <StatusBar barStyle="light-content" backgroundColor="#071222"/>
    <View style={styles.orbit}/>
    <Animated.View style={{ alignItems: "center", opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }] }}>
      <Text style={styles.eyebrow}>YOUR COMMUNITY. OUR MISSION.</Text>
      <BrandMascot pose={ready ? "success" : "normal"} size={size}/>
      <Text style={styles.brand}>AEDEX<Text style={{ color: "#28C9F5" }}>.</Text></Text>
      <Text style={styles.subtitle}>Small actions. Safer communities.</Text>
      <View style={styles.track}><View style={[styles.progress, { width: ready ? "100%" : "38%" }]}/></View>
      <Text style={styles.status} accessibilityLiveRegion="polite">{ready ? "Ready when you are" : "Welcome to AEDEX"}</Text>
    </Animated.View>
    <Text style={styles.footer}>VECTOR SURVEILLANCE & FIELD RESPONSE</Text>
  </LinearGradient>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  orbit: { position: "absolute", width: 320, height: 320, borderRadius: 160, borderWidth: 1, borderColor: "#4F8EF725", backgroundColor: "#00BFFF08" },
  eyebrow: { color: "#9CB8D5", fontSize: 10, letterSpacing: 2, marginBottom: 22, textAlign: "center" },
  brand: { color: "#F6FAFF", fontFamily: "Manrope_700Bold", fontSize: 46, letterSpacing: 5, marginTop: 20 },
  subtitle: { color: "#B0C3D8", fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 8, textAlign: "center" },
  track: { width: 100, height: 3, backgroundColor: "#FFFFFF18", borderRadius: 3, marginTop: 30, overflow: "hidden" },
  progress: { height: 3, backgroundColor: "#28C9F5", borderRadius: 3 },
  status: { color: "#8BA5C1", fontSize: 11, marginTop: 12 },
  footer: { position: "absolute", bottom: 32, color: "#7794B1", fontSize: 8, letterSpacing: 1.3, textAlign: "center" },
});
