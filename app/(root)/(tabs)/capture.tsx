import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as MediaLibrary from "expo-media-library";
import { useRouter } from "expo-router";
import { Camera, Check, Images, Upload, Zap } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import CapturePreviewComponent from "../../../components/features/capture/CapturePreview";

const { width, height } = Dimensions.get("window");

// ─── Colour tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#0B0E14",
  surface: "#111520",
  surfaceRaised: "#161C2D",
  border: "#1E2640",
  text: "#E8EDF8",
  textSub: "#697A9B",
  textDim: "#3C4A66",
  accent: "#4F8EF7",
  accentGlow: "#4F8EF720",
  safe: "#00C896",
};

const THUMB_GAP = 10;
const THUMB_SIZE = (width - 40 - THUMB_GAP * 3) / 4;

// ─── Reusable label ───────────────────────────────────────────────────────────
const SectionLabel = ({ children }: { children: string }) => (
  <View style={sl.row}>
    <View style={sl.dash} />
    <Text style={sl.text}>{children}</Text>
  </View>
);
const sl = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  dash: { width: 20, height: 2, backgroundColor: C.accent, borderRadius: 1 },
  text: { fontSize: 10, fontWeight: "800", letterSpacing: 2, color: C.textSub },
});

// ─── Photo thumbnail ──────────────────────────────────────────────────────────
const Thumb = ({ uri, onPress }: { uri: string; onPress: () => void }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.93,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(onPress);
  };
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable onPress={press}>
        <Image source={{ uri }} style={thumbStyles.img} resizeMode="cover" />
        <View style={thumbStyles.shimmer} />
      </Pressable>
    </Animated.View>
  );
};
const thumbStyles = StyleSheet.create({
  img: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 10,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
    backgroundColor: "rgba(79,142,247,0.06)",
  },
});

// ─── Success toast ────────────────────────────────────────────────────────────
const SuccessToast = ({ visible }: { visible: boolean }) => {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -80,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View
      style={[toastStyles.wrap, { opacity, transform: [{ translateY }] }]}
    >
      <View style={toastStyles.dot}>
        <Check color={C.bg} size={12} strokeWidth={3.5} />
      </View>
      <Text style={toastStyles.text}>IMAGE QUEUED</Text>
    </Animated.View>
  );
};
const toastStyles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 60,
    alignSelf: "center",
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.safe + "50",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    shadowColor: C.safe,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.safe,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { fontSize: 11, fontWeight: "800", letterSpacing: 1.6, color: C.safe },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CaptureScreen() {
  const router = useRouter();
  const [showToast, setShowToast] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [recentPhotos, setRecentPhotos] = useState<string[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [showPreview, setShowPreview] = useState(false);

  // Animated scan line on the drop zone
  const scanAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  // Stagger fade-in for children
  const fadeAnims = [0, 1, 2, 3].map(
    () => useRef(new Animated.Value(0)).current,
  );
  useEffect(() => {
    Animated.stagger(
      80,
      fadeAnims.map((a) =>
        Animated.timing(a, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, []);

  useEffect(() => {
    (async () => {
      // Pass false for the first argument (write permissions)
      // and ['photo'] for the second to avoid the Audio crash
      const { status } = await MediaLibrary.requestPermissionsAsync(false, [
        "photo",
      ]);

      if (status === "granted") {
        const media = await MediaLibrary.getAssetsAsync({
          first: 8,
          mediaType: [MediaLibrary.MediaType.photo], // Use the enum for safety
          sortBy: [MediaLibrary.SortBy.creationTime],
        });
        setRecentPhotos(media.assets.map((a) => a.uri));
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({});
          setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }
      } catch (e) {
        console.warn("Failed to get location:", e);
      }
    })();
  }, []);

  const handleSelection = (uri: string) => {
    setSelectedImage(uri);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      setShowPreview(true);
    }, 1300);
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
    });
    if (!result.canceled) handleSelection(result.assets[0].uri);
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (!result.canceled) handleSelection(result.assets[0].uri);
  };

  const scanTranslate = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 180],
  });

  if (showPreview && selectedImage) {
    return (
      <CapturePreviewComponent
        image={selectedImage}
        metadata={{
          timestamp: new Date().toLocaleString(),
          location: "Detected Location",
          lat: location?.lat ?? 0,
          lng: location?.lng ?? 0,
        }}
        onReset={() => {
          setShowPreview(false);
          setSelectedImage(null);
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      {/* Toast */}
      <SuccessToast visible={showToast} />

      <View style={styles.inner}>
        {/* ── HEADER ── */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnims[0],
              transform: [
                {
                  translateY: fadeAnims[0].interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <View style={styles.headerDot} />
            <Text style={styles.headerTitle}>CAPTURE</Text>
          </View>
          <View style={styles.headerBadge}>
            <Zap color={C.accent} size={10} strokeWidth={2.5} />
            <Text style={styles.headerBadgeText}>AI READY</Text>
          </View>
        </Animated.View>

        {/* ── DROP ZONE ── */}
        <Animated.View
          style={[
            {
              opacity: fadeAnims[1],
              transform: [
                {
                  translateY: fadeAnims[1].interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Pressable style={styles.dropZone} onPress={openGallery}>
            {/* Corner brackets */}
            {(["tl", "tr", "bl", "br"] as const).map((pos) => (
              <View
                key={pos}
                style={[
                  styles.bracket,
                  pos.includes("t") ? { top: 0 } : { bottom: 0 },
                  pos.includes("l") ? { left: 0 } : { right: 0 },
                ]}
              >
                <View
                  style={[
                    styles.bH,
                    pos.includes("r") && { right: 0, left: undefined },
                  ]}
                />
                <View
                  style={[
                    styles.bV,
                    pos.includes("r") && { right: 0, left: undefined },
                  ]}
                />
              </View>
            ))}

            {/* Animated scan line */}
            <Animated.View
              style={[
                styles.dropScan,
                { transform: [{ translateY: scanTranslate }] },
              ]}
            />

            {/* Icon cluster */}
            <View style={styles.dropIconWrap}>
              <View style={styles.dropIconOuter}>
                <View style={styles.dropIconInner}>
                  <Upload color={C.accent} size={22} strokeWidth={2} />
                </View>
              </View>
            </View>

            <Text style={styles.dropTitle}>Drop Evidence Here</Text>
            <Text style={styles.dropSub}>
              Tap to select from gallery · AI will detect breeding sites
            </Text>
          </Pressable>
        </Animated.View>

        {/* ── ACTION BUTTONS ── */}
        <Animated.View
          style={[
            styles.actionRow,
            {
              opacity: fadeAnims[2],
              transform: [
                {
                  translateY: fadeAnims[2].interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Pressable style={styles.actionBtn} onPress={openGallery}>
            <View style={styles.actionIconBg}>
              <Images color={C.accent} size={16} strokeWidth={2} />
            </View>
            <View>
              <Text style={styles.actionBtnLabel}>GALLERY</Text>
              <Text style={styles.actionBtnSub}>Pick existing</Text>
            </View>
          </Pressable>

          <View style={styles.actionDivider} />

          <Pressable style={styles.actionBtn} onPress={openCamera}>
            <View style={styles.actionIconBg}>
              <Camera color={C.accent} size={16} strokeWidth={2} />
            </View>
            <View>
              <Text style={styles.actionBtnLabel}>CAMERA</Text>
              <Text style={styles.actionBtnSub}>Capture live</Text>
            </View>
          </Pressable>
        </Animated.View>

        {/* ── RECENT PHOTOS ── */}
        {recentPhotos.length > 0 && (
          <Animated.View style={[{ opacity: fadeAnims[3] }]}>
            <SectionLabel>RECENT CAPTURES</SectionLabel>
            <View style={styles.thumbGrid}>
              {recentPhotos.slice(0, 8).map((uri, i) => (
                <Thumb key={i} uri={uri} onPress={() => handleSelection(uri)} />
              ))}
            </View>
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}

const BRACKET = 22;
const BRACKET_T = 2;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  inner: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
    paddingTop: 8,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.accent,
    shadowColor: C.accent,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 3,
    color: C.text,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.accentGlow,
    borderWidth: 1,
    borderColor: C.accent + "30",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  headerBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: C.accent,
  },

  // Drop zone
  dropZone: {
    width: "100%",
    height: 200,
    borderRadius: 18,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 14,
    position: "relative",
    gap: 10,
  },
  dropScan: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: C.accent + "60",
    shadowColor: C.accent,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  dropIconWrap: { marginBottom: 4 },
  dropIconOuter: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: C.accentGlow,
    borderWidth: 1,
    borderColor: C.accent + "25",
    alignItems: "center",
    justifyContent: "center",
  },
  dropIconInner: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: C.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  dropTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: C.text,
    letterSpacing: 0.2,
  },
  dropSub: {
    fontSize: 11,
    color: C.textSub,
    textAlign: "center",
    paddingHorizontal: 24,
    lineHeight: 17,
  },

  // Corner brackets
  bracket: { position: "absolute", width: BRACKET, height: BRACKET, zIndex: 5 },
  bH: {
    position: "absolute",
    width: BRACKET,
    height: BRACKET_T,
    backgroundColor: C.accent,
    top: 0,
    left: 0,
  },
  bV: {
    position: "absolute",
    width: BRACKET_T,
    height: BRACKET,
    backgroundColor: C.accent,
    top: 0,
    left: 0,
  },

  // Action row
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 28,
    overflow: "hidden",
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  actionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.accentGlow,
    borderWidth: 1,
    borderColor: C.accent + "25",
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: C.text,
    marginBottom: 2,
  },
  actionBtnSub: { fontSize: 10, color: C.textSub },
  actionDivider: { width: 1, height: 40, backgroundColor: C.border },

  // Thumbs
  thumbGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: THUMB_GAP,
  },
});
