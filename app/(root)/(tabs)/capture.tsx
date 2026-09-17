import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as MediaLibrary from "expo-media-library";
import { Camera, Check, Images, Upload } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import CapturePreviewComponent from "../../../components/features/capture/CapturePreview";
import { ThemeColors, useTheme } from "../../../context/ThemeContext";

const { width } = Dimensions.get("window");

const THUMB_GAP = 10;
const THUMB_SIZE = (width - 40 - THUMB_GAP * 3) / 4;

// ─── Reusable label ───────────────────────────────────────────────────────────
const SectionLabel = ({
  children,
  C,
}: {
  children: string;
  C: ThemeColors;
}) => (
  <View style={sl.row}>

    <Text accessibilityRole="header" style={[sl.text, { color: C.text }]}>{children}</Text>
  </View>
);
const sl = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  text: { fontSize: 16, fontWeight: "600" },
});

// ─── Photo thumbnail ──────────────────────────────────────────────────────────
const Thumb = ({
  uri,
  onPress,
  C,
}: {
  uri: string;
  onPress: () => void;
  C: ThemeColors;
}) => {
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
        <Image
          source={{ uri }}
          style={[
            thumbStyles.img,
            { backgroundColor: C.surface, borderColor: C.border },
          ]}
          resizeMode="cover"
        />

      </Pressable>
    </Animated.View>
  );
};
const thumbStyles = StyleSheet.create({
  img: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 10,
    borderWidth: 1,
  },
});

// ─── Success toast ────────────────────────────────────────────────────────────
const SuccessToast = ({
  visible,
  C,
}: {
  visible: boolean;
  C: ThemeColors;
}) => {
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
  }, [visible, opacity, translateY]);

  return (
    <Animated.View
      style={[
        toastStyles.wrap,
        {
          backgroundColor: C.surface,
          borderColor: C.safe + "50",
          shadowColor: C.safe,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={[toastStyles.dot, { backgroundColor: C.safe }]}>
        <Check color="#FFFFFF" size={12} strokeWidth={3.5} />
      </View>
      <Text style={[toastStyles.text, { color: C.safe }]}>Image queued</Text>
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
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CaptureScreen() {
  const { colors: C } = useTheme();
  const [showToast, setShowToast] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [recentPhotos, setRecentPhotos] = useState<string[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [showPreview, setShowPreview] = useState(false);

  // Stagger fade-in for children
  const fadeAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;
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
  }, [fadeAnims]);

  useEffect(() => {
    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync(false, [
        "photo",
      ]);

      if (status === "granted") {
        const media = await MediaLibrary.getAssetsAsync({
          first: 8,
          mediaType: [MediaLibrary.MediaType.photo],
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


  const styles = useMemo(() => createStyles(C), [C]);

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
      <SuccessToast visible={showToast} C={C} />

      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
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

            <Text style={styles.headerTitle}>Capture</Text>
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose a site photo"
            style={styles.dropZone}
            onPress={openGallery}
          >
            <View style={styles.dropIconWrap}>
              <Upload color={C.accent} size={28} strokeWidth={1.8} />
            </View>

            <Text style={styles.dropTitle}>Add a site photo</Text>
            <Text style={styles.dropSub}>
              Choose a photo to check for mosquito breeding sites.
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
          <Pressable accessibilityRole="button" style={styles.actionBtn} onPress={openGallery}>
            <View style={styles.actionIconBg}>
              <Images color={C.accent} size={16} strokeWidth={2} />
            </View>
            <View>
              <Text style={styles.actionBtnLabel}>Gallery</Text>
              <Text style={styles.actionBtnSub}>Choose a photo</Text>
            </View>
          </Pressable>

          <View style={styles.actionDivider} />

          <Pressable accessibilityRole="button" style={styles.actionBtn} onPress={openCamera}>
            <View style={styles.actionIconBg}>
              <Camera color={C.accent} size={16} strokeWidth={2} />
            </View>
            <View>
              <Text style={styles.actionBtnLabel}>Camera</Text>
              <Text style={styles.actionBtnSub}>Take a photo</Text>
            </View>
          </Pressable>
        </Animated.View>

        {/* ── RECENT PHOTOS ── */}
        {recentPhotos.length > 0 && (
          <Animated.View style={[{ opacity: fadeAnims[3] }]}>
            <SectionLabel C={C}>Recent captures</SectionLabel>
            <View style={styles.thumbGrid}>
              {recentPhotos.slice(0, 8).map((uri, i) => (
                <Thumb
                  key={i}
                  uri={uri}
                  onPress={() => handleSelection(uri)}
                  C={C}
                />
              ))}
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (C: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    inner: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 110 },

    // Header
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 22,
      paddingTop: 8,
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
    headerTitle: {
      fontSize: 24,
      fontWeight: "700",
      letterSpacing: 0.3,
      color: C.text,
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
    dropIconWrap: { marginBottom: 4 },
    dropTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: C.text,
      letterSpacing: 0.2,
    },
    dropSub: {
      fontSize: 13,
      color: C.textSub,
      textAlign: "center",
      paddingHorizontal: 24,
      lineHeight: 17,
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
      paddingHorizontal: 14,
    },
    actionIconBg: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: C.surfaceRaised,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: "center",
      justifyContent: "center",
    },
    actionBtnLabel: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.3,
      color: C.text,
      marginBottom: 2,
    },
    actionBtnSub: { fontSize: 11, color: C.textSub },
    actionDivider: { width: 1, height: 40, backgroundColor: C.border },

    // Thumbs
    thumbGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: THUMB_GAP,
    },
  });
