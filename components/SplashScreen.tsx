import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StatusBar, StyleSheet, View, useWindowDimensions } from "react-native";
import { Text } from "@/components/Typography";
import { LinearGradient } from "expo-linear-gradient";
import BrandMascot from "./BrandMascot";

/** A short startup introduction, never used as an authentication/loading screen. */
export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [ready, setReady] = useState(false);
  const entrance = useRef(new Animated.Value(0)).current;
  const poseTransition = useRef(new Animated.Value(0)).current;
  const reduceMotion = useRef(true);
  const readyReached = useRef(false);
  const { width, height } = useWindowDimensions();
  const size = Math.min(width * 0.78, height * 0.4, 320);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (!active) return;
      reduceMotion.current = reduced;
      if (reduced) entrance.setValue(1);
      else Animated.timing(entrance, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }).catch(() => { if (active) entrance.setValue(1); });
    const motionSubscription = AccessibilityInfo.addEventListener("reduceMotionChanged", reduced => {
      reduceMotion.current = reduced;
      if (reduced) {
        entrance.stopAnimation();
        entrance.setValue(1);
        poseTransition.stopAnimation();
        poseTransition.setValue(readyReached.current ? 1 : 0);
      }
    });
    const readyTimer = setTimeout(() => {
      readyReached.current = true;
      setReady(true);
      if (reduceMotion.current) poseTransition.setValue(1);
      else Animated.timing(poseTransition, {
        toValue: 1,
        duration: 420,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, 950);
    const finishTimer = setTimeout(onFinish, 1800);
    return () => {
      active = false;
      clearTimeout(readyTimer); clearTimeout(finishTimer);
      entrance.stopAnimation();
      poseTransition.stopAnimation();
      motionSubscription.remove();
    };
  }, [entrance, onFinish, poseTransition]);
  return <LinearGradient colors={["#061C1B", "#103C38", "#0B1414"]} style={styles.screen}>
    <StatusBar barStyle="light-content" backgroundColor="#061C1B"/>
    <View style={styles.orbit}/>
    <Animated.View style={{ alignItems: "center", opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }] }}>
      <Text style={styles.eyebrow}>YOUR COMMUNITY. OUR MISSION.</Text>
      <View style={{ width: size, height: size }} pointerEvents="none">
        <Animated.View style={{ position: "absolute", opacity: poseTransition.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ scale: poseTransition.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] }) }] }}>
          <BrandMascot pose="normal" size={size}/>
        </Animated.View>
        <Animated.View style={{ position: "absolute", opacity: poseTransition, transform: [{ translateY: poseTransition.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }, { scale: poseTransition.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) }] }}>
          <BrandMascot pose="success" size={size}/>
        </Animated.View>
      </View>
      <Text style={styles.brand}>AEDEX<Text style={{ color: "#5AD5C3" }}>.</Text></Text>
      <Text style={styles.subtitle}>Small actions. Safer communities.</Text>
      <View style={styles.track}><Animated.View style={[styles.progress, { width: 100, transform: [{ translateX: poseTransition.interpolate({ inputRange: [0, 1], outputRange: [-31, 0] }) }, { scaleX: poseTransition.interpolate({ inputRange: [0, 1], outputRange: [0.38, 1] }) }] }]}/></View>
      <Text style={styles.status} accessibilityLiveRegion="polite">{ready ? "Ready when you are" : "Welcome to AEDEX"}</Text>
    </Animated.View>
    <Text style={styles.footer}>VECTOR SURVEILLANCE & FIELD RESPONSE</Text>
  </LinearGradient>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  orbit: { position: "absolute", width: 320, height: 320, borderRadius: 160, borderWidth: 1, borderColor: "#16827A25", backgroundColor: "#2DD4BF08" },
  eyebrow: { color: "#A3C5BC", fontSize: 10, letterSpacing: 2, marginBottom: 22, textAlign: "center" },
  brand: { color: "#F2FAF7", fontFamily: "Inter_700Bold", fontSize: 46, letterSpacing: 5, marginTop: 20 },
  subtitle: { color: "#B2CEC5", fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 8, textAlign: "center" },
  track: { width: 100, height: 3, backgroundColor: "#FFFFFF18", borderRadius: 3, marginTop: 30, overflow: "hidden" },
  progress: { height: 3, backgroundColor: "#5AD5C3", borderRadius: 3 },
  status: { color: "#97BAB0", fontSize: 11, marginTop: 12 },
  footer: { position: "absolute", bottom: 32, color: "#8BACA2", fontSize: 8, letterSpacing: 1.3, textAlign: "center" },
});
