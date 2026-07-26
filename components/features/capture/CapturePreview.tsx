import { api } from "@/convex/_generated/api";
import { useAction, useConvexAuth } from "convex/react";
import { BlurView } from "expo-blur";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import {
  AlertCircle,
  ChevronRight,
  Clock,
  MapPin,
  RotateCcw,
  Sparkles,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Colour tokens (mirror ResultsScreen) ────────────────────────────────────
const C = {
  bg: "#0B0E14",
  surface: "#111520",
  surfaceRaised: "#161C2D",
  border: "#1E2640",
  borderBright: "#2E3A5C",
  text: "#E8EDF8",
  textSub: "#697A9B",
  textDim: "#3C4A66",
  accent: "#4F8EF7",
  accentGlow: "#4F8EF720",
  danger: "#FF4D6A",
  safe: "#00C896",
  warn: "#F5A623",
  scanLine: "#4F8EF7",
};

interface Metadata {
  timestamp: string;
  location: string;
  lat: number;
  lng: number;
}

interface CapturePreviewProps {
  image: string;
  metadata: Metadata | null;
  onReset: () => void;
}

// ─── Corner bracket SVG-style corners via Views ───────────────────────────────
const CornerBracket = ({
  position,
}: {
  position: "tl" | "tr" | "bl" | "br";
}) => {
  const isRight = position === "tr" || position === "br";
  const isBottom = position === "bl" || position === "br";
  return (
    <View
      style={[
        styles.corner,
        isRight ? { right: 0 } : { left: 0 },
        isBottom ? { bottom: 0 } : { top: 0 },
      ]}
    >
      {/* Horizontal arm */}
      <View
        style={[
          styles.cornerH,
          isRight ? { right: 0 } : { left: 0 },
          isBottom ? { bottom: 0 } : { top: 0 },
        ]}
      />
      {/* Vertical arm */}
      <View
        style={[
          styles.cornerV,
          isRight ? { right: 0 } : { left: 0 },
          isBottom ? { bottom: 0 } : { top: 0 },
        ]}
      />
    </View>
  );
};

// ─── Step indicator ───────────────────────────────────────────────────────────
const StepDot = ({ n, active }: { n: number; active: boolean }) => (
  <View style={[styles.stepDot, active && styles.stepDotActive]}>
    <Text style={[styles.stepDotText, active && styles.stepDotTextActive]}>
      {n}
    </Text>
  </View>
);

export default function CapturePreview({
  image,
  metadata,
  onReset,
}: CapturePreviewProps) {
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState(false);
  const [description, setDescription] = useState("");
  const [focused, setFocused] = useState(false);

  const scanAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fade in on mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, []);

  // Scan line loop while analyzing
  useEffect(() => {
    if (analyzing) {
      Animated.loop(
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ).start();

      // Pulse the button
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.92,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      scanAnim.stopAnimation();
      scanAnim.setValue(0);
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [analyzing]);

  const { isAuthenticated } = useConvexAuth();
  const runAnalysis = useAction(api.analysis.processAndSaveReport);

  const handleAnalyze = async () => {
    if (!isAuthenticated) {
      Alert.alert("Not Logged In", "Please sign in again to submit reports.");
      return;
    }
    setAnalyzing(true);
    try {
      const base64Image = await FileSystem.readAsStringAsync(image, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const reportId = await runAnalysis({
        image: base64Image,
        description,
        lat: metadata?.lat || 0,
        lng: metadata?.lng || 0,
        locationName: metadata?.location || "Unknown",
      });
      router.push({ pathname: "/results", params: { reportId } });
    } catch (err) {
      console.error("Analysis Error:", err);
      Alert.alert(
        "Upload Failed",
        "Could not process the image. Please try again.",
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const scanTranslate = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 380],
  });

  const canSubmit = description.trim().length > 0 && !analyzing;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <Animated.View style={[styles.root, { opacity: fadeAnim }]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── TOP NAV ── */}
          <View style={styles.topNav}>
            <TouchableOpacity
              onPress={onReset}
              style={styles.navBackBtn}
              disabled={analyzing}
            >
              <RotateCcw
                color={analyzing ? C.textDim : C.textSub}
                size={15}
                strokeWidth={2.5}
              />
            </TouchableOpacity>

            <View style={styles.navCenter}>
              <View style={styles.navStatusDot} />
              <Text style={styles.navTitle}>EVIDENCE REVIEW</Text>
            </View>

            {/* Step breadcrumb */}
            <View style={styles.stepRow}>
              <StepDot n={1} active={false} />
              <View style={styles.stepLine} />
              <StepDot n={2} active />
            </View>
          </View>

          {/* ── IMAGE VIEWER ── */}
          <View style={styles.imageCard}>
            {/* Corner brackets — tactical feel */}
            <CornerBracket position="tl" />
            <CornerBracket position="tr" />
            <CornerBracket position="bl" />
            <CornerBracket position="br" />

            <Image
              source={{ uri: image }}
              style={styles.previewImage}
              resizeMode="cover"
            />

            {/* Scan line overlay */}
            {analyzing && (
              <>
                <Animated.View
                  style={[
                    styles.scanLine,
                    { transform: [{ translateY: scanTranslate }] },
                  ]}
                />
                <View style={styles.scanningBanner}>
                  <ActivityIndicator color={C.accent} size="small" />
                  <Text style={styles.scanningText}>PROCESSING IMAGE</Text>
                </View>
              </>
            )}

            {/* Crosshair center mark */}
            {!analyzing && (
              <View style={styles.crosshairWrap} pointerEvents="none">
                <View style={styles.crosshairH} />
                <View style={styles.crosshairV} />
                <View style={styles.crosshairDot} />
              </View>
            )}

            {/* Metadata strip — blurred glass at bottom */}
            <BlurView intensity={70} tint="dark" style={styles.metaStrip}>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Clock color={C.accent} size={11} strokeWidth={2.5} />
                  <Text style={styles.metaText}>
                    {metadata?.timestamp ?? "—"}
                  </Text>
                </View>
                <View style={styles.metaDivider} />
                <View style={[styles.metaItem, { flex: 1 }]}>
                  <MapPin color={C.accent} size={11} strokeWidth={2.5} />
                  <Text style={styles.metaText} numberOfLines={1}>
                    {metadata?.location ?? "Location unavailable"}
                  </Text>
                </View>
              </View>
            </BlurView>
          </View>

          {/* ── DESCRIPTION SECTION ── */}
          <View style={styles.section}>
            {/* Label row */}
            <View style={styles.sectionLabelRow}>
              <View style={styles.sectionDash} />
              <Text style={styles.sectionLabel}>SITE DESCRIPTION</Text>
            </View>

            <View
              style={[
                styles.inputWrapper,
                focused && styles.inputWrapperFocused,
              ]}
            >
              {/* Left accent */}
              <View
                style={[
                  styles.inputAccent,
                  focused && styles.inputAccentActive,
                ]}
              />
              <TextInput
                style={styles.textInput}
                placeholder={
                  "Describe the stagnant water,\ncontainer type, or environment…"
                }
                placeholderTextColor={C.textDim}
                multiline
                numberOfLines={4}
                value={description}
                onChangeText={setDescription}
                editable={!analyzing}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                textAlignVertical="top"
              />
            </View>

            {/* Character nudge */}
            {description.length === 0 && (
              <View style={styles.nudgeRow}>
                <AlertCircle color={C.textDim} size={11} strokeWidth={2} />
                <Text style={styles.nudgeText}>Required before submission</Text>
              </View>
            )}
          </View>

          {/* ── SUBMIT BUTTON ── */}
          <Animated.View
            style={[styles.submitWrap, { transform: [{ scale: pulseAnim }] }]}
          >
            <Pressable
              style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
              onPress={handleAnalyze}
              disabled={!canSubmit}
            >
              {analyzing ? (
                <View style={styles.submitInner}>
                  <ActivityIndicator color="#0B0E14" size="small" />
                  <Text style={styles.submitText}>ANALYZING…</Text>
                </View>
              ) : (
                <View style={styles.submitInner}>
                  <Sparkles
                    color={canSubmit ? C.bg : C.textDim}
                    size={16}
                    strokeWidth={2.5}
                    fill={canSubmit ? C.bg : C.textDim}
                  />
                  <Text
                    style={[
                      styles.submitText,
                      !canSubmit && styles.submitTextDisabled,
                    ]}
                  >
                    ANALYZE WITH AI
                  </Text>
                  <ChevronRight
                    color={canSubmit ? C.bg : C.textDim}
                    size={16}
                    strokeWidth={3}
                  />
                </View>
              )}
            </Pressable>
          </Animated.View>

          {/* ── DISCARD LINK ── */}
          <TouchableOpacity
            style={styles.discardBtn}
            onPress={onReset}
            disabled={analyzing}
          >
            <Text
              style={[styles.discardText, analyzing && { color: C.textDim }]}
            >
              Discard & retake
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const CORNER_SIZE = 20;
const CORNER_THICK = 2;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 24 },

  // ── Top nav
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingBottom: 20,
  },
  navBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  navCenter: { flexDirection: "row", alignItems: "center", gap: 7 },
  navStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.safe,
    shadowColor: C.safe,
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 5,
  },
  navTitle: {
    color: C.text,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2.5,
  },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  stepLine: { width: 14, height: 1, backgroundColor: C.border },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
    shadowColor: C.accent,
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  stepDotText: { fontSize: 9, fontWeight: "800", color: C.textSub },
  stepDotTextActive: { color: C.bg },

  // ── Image card
  imageCard: {
    width: "100%",
    height: 390,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    position: "relative",
    marginBottom: 24,
  },
  previewImage: { width: "100%", height: "100%" },

  // Corner brackets
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    zIndex: 10,
  },
  cornerH: {
    position: "absolute",
    height: CORNER_THICK,
    width: CORNER_SIZE,
    backgroundColor: C.accent,
  },
  cornerV: {
    position: "absolute",
    width: CORNER_THICK,
    height: CORNER_SIZE,
    backgroundColor: C.accent,
  },

  // Scan line
  scanLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: C.scanLine,
    zIndex: 10,
    shadowColor: C.scanLine,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 8,
  },
  scanningBanner: {
    position: "absolute",
    top: 16,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(11,14,20,0.82)",
    borderWidth: 1,
    borderColor: C.accent + "40",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    zIndex: 20,
  },
  scanningText: {
    color: C.accent,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.8,
  },

  // Crosshair
  crosshairWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  crosshairH: {
    position: "absolute",
    width: 22,
    height: 1,
    backgroundColor: C.accent + "70",
  },
  crosshairV: {
    position: "absolute",
    width: 1,
    height: 22,
    backgroundColor: C.accent + "70",
  },
  crosshairDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.accent,
    shadowColor: C.accent,
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 6,
  },

  // Metadata strip
  metaStrip: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 7 },
  metaDivider: {
    width: 1,
    height: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  metaText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.2,
  },

  // ── Section
  section: { marginBottom: 20 },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionDash: {
    width: 20,
    height: 2,
    backgroundColor: C.accent,
    borderRadius: 1,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    color: C.textSub,
  },

  // Input
  inputWrapper: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    minHeight: 110,
  },
  inputWrapperFocused: { borderColor: C.accent + "60" },
  inputAccent: { width: 3, backgroundColor: C.border },
  inputAccentActive: { backgroundColor: C.accent },
  textInput: {
    flex: 1,
    padding: 16,
    fontSize: 13.5,
    color: C.text,
    lineHeight: 21,
    fontWeight: "400",
  },

  nudgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    paddingLeft: 4,
  },
  nudgeText: { fontSize: 10, color: C.textDim, fontWeight: "500" },

  // ── Submit
  submitWrap: { marginTop: 4 },
  submitBtn: {
    height: 58,
    backgroundColor: C.accent,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.accent,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  submitBtnDisabled: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitInner: { flexDirection: "row", alignItems: "center", gap: 10 },
  submitText: {
    color: C.bg,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.8,
  },
  submitTextDisabled: { color: C.textDim },

  // Discard
  discardBtn: {
    marginTop: 18,
    alignItems: "center",
  },
  discardText: {
    color: C.textSub,
    fontSize: 13,
    fontWeight: "500",
    textDecorationLine: "underline",
    textDecorationColor: C.textDim,
  },
});
