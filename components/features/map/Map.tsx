import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertTriangle,
  Clock,
  Crosshair,
  Eye,
  EyeOff,
  Map,
  MapPin,
  Satellite,
  Shield,
  User,
  X,
  Zap,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Circle, Marker, PROVIDER_DEFAULT } from "react-native-maps";

const MosquitoMarker = ({
  isCritical,
  isSelected,
}: {
  isCritical: boolean;
  isSelected?: boolean;
}) => {
  const size = isSelected ? 44 : 36;
  const bgColor = isCritical ? C.danger : C.warning;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bgColor + (isSelected ? "CC" : "99"),
        alignItems: "center",
        justifyContent: "center",
        borderWidth: isSelected ? 2 : 1.5,
        borderColor: "#fff",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
      }}
    >
      <Text
        style={{
          fontSize: size * 0.55,
          color: "#fff",
          fontFamily: "System", // forces system font, emoji works
          textAlign: "center",
          includeFontPadding: false,
        }}
      >
        🦟
      </Text>
    </View>
  );
};

// ─── Report shape ─────────────────────────────────────────────────────────────
type Report = Doc<"reports">;

// ─── Derived risk-zone shape ──────────────────────────────────────────────────
interface RiskZone {
  id: string;
  lat: number;
  lng: number;
  radius: number;
  isCritical: boolean;
}

// ─── Colour tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#0B0E14",
  surface: "#111520",
  surfaceRaised: "#161C2D",
  surfaceElevated: "#1A2035",
  border: "#1E2640",
  borderLight: "#252D45",
  text: "#E8EDF8",
  textSub: "#697A9B",
  textDim: "#3C4A66",
  accent: "#4F8EF7",
  accentGlow: "#4F8EF730",
  danger: "#FF4D6A",
  dangerGlow: "#FF4D6A22",
  safe: "#00C896",
  safeGlow: "#00C89622",
  warning: "#fbbf24",
  warningGlow: "#fbbf2422",
  purple: "#8B5CF6",
};

// ─── Map data ─────────────────────────────────────────────────────────────────
const INITIAL_LOCATION = {
  latitude: 10.684,
  longitude: 122.513,
  latitudeDelta: 0.03,
  longitudeDelta: 0.03,
};

const SCREEN_HEIGHT = Dimensions.get("window").height;
const RISK_ZONE_RADIUS = 150;
type MapMode = "vector" | "satellite";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const statusColor = (status: string) => {
  if (status === "CRITICAL") return C.danger;
  if (status === "Active") return C.warning;
  return C.safe;
};

const statusBg = (status: string) => {
  if (status === "CRITICAL") return C.dangerGlow;
  if (status === "Active") return C.warningGlow;
  return C.safeGlow;
};

const relativeTime = () => {
  const mins = Math.floor(Math.random() * 180) + 5;
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
};

// ─── Pill button ──────────────────────────────────────────────────────────────
const PillBtn = ({
  onPress,
  active,
  icon: Icon,
  label,
}: {
  onPress: () => void;
  active?: boolean;
  icon: React.ComponentType<any>;
  label: string;
}) => (
  <Pressable onPress={onPress} style={[pill.btn, active && pill.btnActive]}>
    <Icon color={active ? C.bg : C.textSub} size={13} strokeWidth={2.5} />
    <Text style={[pill.text, active && pill.textActive]}>{label}</Text>
  </Pressable>
);

const pill = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  btnActive: {
    backgroundColor: C.accent,
    shadowColor: C.accent,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
    color: C.textSub,
    letterSpacing: 0.3,
  },
  textActive: { color: C.bg },
});

// ─── Float button ──────────────────────────────────────────────────────────────
const FloatBtn = ({
  onPress,
  icon: Icon,
  active,
  color = C.accent,
}: {
  onPress: () => void;
  icon: React.ComponentType<any>;
  active?: boolean;
  color?: string;
}) => (
  <Pressable
    onPress={onPress}
    style={[
      fb.btn,
      active && { borderColor: color + "60", backgroundColor: color + "18" },
    ]}
  >
    <Icon color={active ? color : C.textSub} size={16} strokeWidth={2.5} />
  </Pressable>
);

const fb = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(17,21,32,0.92)",
    borderWidth: 1,
    borderColor: "rgba(30,38,64,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
});

// ─── Pin marker ───────────────────────────────────────────────────────────────
const PinMarker = ({
  isCritical,
  isSelected,
}: {
  isCritical: boolean;
  isSelected?: boolean;
}) => {
  const color = isCritical ? C.danger : C.warning;
  return (
    <View
      style={[
        pin.outer,
        {
          backgroundColor: color + (isSelected ? "50" : "30"),
          borderColor: color,
          shadowColor: color,
          width: isSelected ? 26 : 18,
          height: isSelected ? 26 : 18,
          borderRadius: isSelected ? 13 : 9,
          borderWidth: isSelected ? 2.5 : 1.5,
        },
      ]}
    >
      <View
        style={[
          pin.inner,
          {
            backgroundColor: color,
            width: isSelected ? 10 : 7,
            height: isSelected ? 10 : 7,
          },
        ]}
      />
    </View>
  );
};

const pin = StyleSheet.create({
  outer: {
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  inner: {
    borderRadius: 6,
  },
});

// ─── Stats HUD ────────────────────────────────────────────────────────────────
const StatsHUD = ({ zones, markers }: { zones: number; markers: number }) => (
  <View style={hud.wrap}>
    <View style={hud.item}>
      <Text style={[hud.num, { color: C.danger }]}>{markers}</Text>
      <Text style={hud.label}>SITES</Text>
    </View>
    <View style={hud.div} />
    <View style={hud.item}>
      <Text style={[hud.num, { color: C.accent }]}>{zones}</Text>
      <Text style={hud.label}>ZONES</Text>
    </View>
  </View>
);

const hud = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(17,21,32,0.92)",
    borderWidth: 1,
    borderColor: "rgba(30,38,64,0.9)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 10,
  },
  item: { alignItems: "center", gap: 2 },
  num: { fontSize: 16, fontWeight: "800" },
  label: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: C.textSub,
  },
  div: { width: 1, height: 24, backgroundColor: C.border },
});

// ─── Status overlay ───────────────────────────────────────────────────────────
const StatusOverlay = ({ message }: { message: string }) => (
  <View style={so.wrap} pointerEvents="none">
    <Text style={so.text}>{message}</Text>
  </View>
);

const so = StyleSheet.create({
  wrap: {
    position: "absolute",
    bottom: 90,
    alignSelf: "center",
    backgroundColor: "rgba(17,21,32,0.92)",
    borderWidth: 1,
    borderColor: "rgba(30,38,64,0.9)",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  text: { color: C.textSub, fontSize: 11, fontWeight: "700" },
});

// ─── Detection tag ────────────────────────────────────────────────────────────
const DetectionTag = ({ label }: { label: string }) => (
  <View style={dt.wrap}>
    <Text style={dt.text}>{label}</Text>
  </View>
);

const dt = StyleSheet.create({
  wrap: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: C.accentGlow,
    borderWidth: 1,
    borderColor: C.accent + "40",
  },
  text: {
    fontSize: 10,
    fontWeight: "700",
    color: C.accent,
    letterSpacing: 0.4,
  },
});

// ─── Bottom Sheet Report Panel ────────────────────────────────────────────────
// Design rationale: Bottom sheet > modal > snackbar for this use case.
//   - Snackbar: too brief, no room for report detail or actions
//   - Modal: blocks entire map, overkill for a map tap action
//   - Bottom sheet: native to mobile maps (Google Maps, Waze), doesn't cover
//     the full map, supports rich content, feels gestural and native
const ReportBottomSheet = ({
  report,
  onClose,
  onViewFullReport,
}: {
  report: Partial<Report> | null;
  onClose: () => void;
  onViewFullReport?: () => void;
}) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (report) {
      setVisible(true);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 220,
          mass: 0.9,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
          easing: Easing.out(Easing.quad),
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 280,
          useNativeDriver: true,
          easing: Easing.in(Easing.quad),
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setVisible(false));
    }
  }, [report]);

  if (!visible && !report) return null;
  if (!report) return null;

  const r = report!;
  const color = statusColor(r.status ?? "");
  const bg = statusBg(r.status ?? "");
  const isCritical = r.status === "CRITICAL";
  const detections: string[] = (r.detections as string[]) ?? [];
  const time = relativeTime();

  return (
    <Modal
      transparent
      animationType="none"
      visible={visible}
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Animated.View
        style={[bs.backdrop, { opacity: backdropAnim }]}
        pointerEvents={report ? "auto" : "none"}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[bs.sheet, { transform: [{ translateY: slideAnim }] }]}
        pointerEvents="box-none"
      >
        {/* Handle */}
        <View style={bs.handleWrap}>
          <View style={bs.handle} />
        </View>

        {/* Header */}
        <View style={bs.header}>
          <View style={bs.headerLeft}>
            {/* Status badge */}
            <View
              style={[
                bs.badge,
                { backgroundColor: bg, borderColor: color + "60" },
              ]}
            >
              {isCritical && <Zap size={9} color={color} strokeWidth={3} />}
              <Text style={[bs.badgeText, { color }]}>{r.status}</Text>
            </View>
            <Text style={bs.accuracy}>
              <Text style={[bs.accuracyNum, { color: C.safe }]}>
                {r.accuracy}%
              </Text>{" "}
              confidence
            </Text>
          </View>
          <Pressable onPress={onClose} style={bs.closeBtn}>
            <X size={16} color={C.textSub} strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* Location row */}
        <View style={bs.locationRow}>
          <MapPin size={13} color={C.accent} strokeWidth={2.5} />
          <Text style={bs.locationText} numberOfLines={1}>
            {r.locationName}
          </Text>
        </View>

        {/* Divider */}
        <View style={bs.divider} />

        <ScrollView
          style={bs.scroll}
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {/* Description */}
          <Text style={bs.sectionLabel}>INCIDENT REPORT</Text>
          <Text style={bs.description}>{r.description}</Text>

          {/* Detections */}
          {detections.length > 0 && (
            <>
              <Text style={[bs.sectionLabel, { marginTop: 16 }]}>
                DETECTED MATERIALS
              </Text>
              <View style={bs.tagsRow}>
                {detections.map((d, i) => (
                  <DetectionTag key={i} label={d} />
                ))}
              </View>
            </>
          )}

          {/* AI Reasoning */}
          {r.reasoning && (
            <>
              <Text style={[bs.sectionLabel, { marginTop: 16 }]}>
                AI ANALYSIS
              </Text>
              <View style={bs.reasoningBox}>
                <View style={bs.reasoningAccent} />
                <Text style={bs.reasoningText}>{r.reasoning}</Text>
              </View>
            </>
          )}

          {/* Meta row */}
          <View style={bs.metaRow}>
            <View style={bs.metaItem}>
              <User size={11} color={C.textDim} strokeWidth={2.5} />
              <Text style={bs.metaText}>{r.userName}</Text>
            </View>
            <View style={bs.metaDot} />
            <View style={bs.metaItem}>
              <Clock size={11} color={C.textDim} strokeWidth={2.5} />
              <Text style={bs.metaText}>{time}</Text>
            </View>
            <View style={bs.metaDot} />
            <View style={bs.metaItem}>
              <Shield size={11} color={C.safe} strokeWidth={2.5} />
              <Text style={[bs.metaText, { color: C.safe }]}>Verified</Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={bs.actions}>
            <Pressable
              style={[bs.actionBtn, bs.actionBtnSecondary]}
              onPress={onViewFullReport}
            >
              <Text style={bs.actionBtnSecondaryText}>View Full Report</Text>
            </Pressable>
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
};

const bs = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(7,9,15,0.6)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: C.border,
    maxHeight: SCREEN_HEIGHT * 0.72,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
  },
  handleWrap: { alignItems: "center", paddingTop: 12, paddingBottom: 4 },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  accuracy: { fontSize: 12, color: C.textSub },
  accuracyNum: { fontWeight: "800" },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.surfaceRaised,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  locationText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.text,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  scroll: { paddingHorizontal: 20 },
  sectionLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: C.textDim,
    letterSpacing: 1.6,
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    color: C.textSub,
    fontWeight: "400",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  reasoningBox: {
    flexDirection: "row",
    backgroundColor: C.surfaceRaised,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  reasoningAccent: {
    width: 3,
    backgroundColor: C.purple,
  },
  reasoningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: C.textSub,
    padding: 12,
    fontStyle: "italic",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    gap: 8,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 10, color: C.textSub, fontWeight: "600" },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: C.textDim,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  actionBtnPrimary: {
    backgroundColor: C.danger,
    shadowColor: C.danger,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  actionBtnPrimaryText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.2,
  },
  actionBtnSecondary: {
    backgroundColor: C.surfaceRaised,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  actionBtnSecondaryText: {
    fontSize: 12,
    fontWeight: "700",
    color: C.textSub,
  },
});

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MapComponent() {
  const router = useRouter();

  const [mode, setMode] = useState<MapMode>("vector");
  const [showZones, setShowZones] = useState(true);
  const [showReports, setShowReports] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Partial<Report> | null>(
    null,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mapRef = useRef<MapView>(null);

  const allReports = useQuery(api.reports.getAllReports);

  // Use Convex data if available; fall back to creative mock reports
  const liveHotspots: Partial<Report>[] =
    allReports?.filter((r: Report) => r.verified && r.status !== "Completed") ??
    [];

  const verifiedHotspots: Partial<Report>[] = liveHotspots ?? [];

  const riskZones: RiskZone[] = verifiedHotspots.map((r) => ({
    id: r._id as string,
    lat: r.lat!,
    lng: r.lng!,
    radius: RISK_ZONE_RADIUS,
    isCritical: r.status === "CRITICAL",
  }));

  const [isFocusMode, setIsFocusMode] = useState(false);

  const params = useLocalSearchParams<{
    focusLat?: string;
    focusLng?: string;
    reportId?: string;
  }>();

  useEffect(() => {
    if (params.focusLat && params.focusLng) {
      setIsFocusMode(true);
    }
  }, [params.focusLat, params.focusLng]);

  // Focus animation (existing)
  useEffect(() => {
    if (!verifiedHotspots.length || !params.focusLat || !params.focusLng)
      return;
    const lat = parseFloat(params.focusLat);
    const lng = parseFloat(params.focusLng);
    if (isNaN(lat) || isNaN(lng)) return;

    mapRef.current?.animateCamera({
      center: { latitude: lat, longitude: lng },
      zoom: 17,
    });

    if (params.reportId) {
      const matchedReport = verifiedHotspots.find(
        (r) => r._id === params.reportId,
      );
      if (matchedReport) {
        setSelectedReport(matchedReport);
        setSelectedId(matchedReport._id as string);
      }
    }
  }, [verifiedHotspots, params.focusLat, params.focusLng, params.reportId]);

  useEffect(() => {
    if (verifiedHotspots.length > 0 && mapRef.current && !isFocusMode) {
      mapRef.current.fitToCoordinates(
        verifiedHotspots.map((r) => ({ latitude: r.lat!, longitude: r.lng! })),
        {
          edgePadding: { top: 80, right: 60, bottom: 80, left: 60 },
          animated: true,
        },
      );
    }
  }, [verifiedHotspots.length, isFocusMode]);

  const handleMarkerPress = useCallback((report: Partial<Report>) => {
    setSelectedReport(report);
    setSelectedId(report._id as string);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedReport(null);
    setSelectedId(null);
  }, []);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, []);

  const isSatellite = mode === "satellite";
  const isLoading = allReports === undefined;

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_DEFAULT}
        initialRegion={INITIAL_LOCATION}
        mapType={isSatellite ? "satellite" : "standard"}
        customMapStyle={isSatellite ? [] : darkMapStyle}
        onPress={handleClose}
      >
        {showZones &&
          riskZones.map((z: RiskZone) => (
            <Circle
              key={`zone-${z.id}`}
              center={{ latitude: z.lat, longitude: z.lng }}
              radius={z.radius}
              fillColor={
                z.isCritical ? "rgba(255,77,106,0.10)" : "rgba(251,191,36,0.10)"
              }
              strokeColor={
                z.isCritical ? "rgba(255,77,106,0.65)" : "rgba(251,191,36,0.65)"
              }
              strokeWidth={1.5}
            />
          ))}

        {showReports &&
          verifiedHotspots.map((r) => (
            <Marker
              key={`marker-${r._id}`}
              coordinate={{ latitude: r.lat!, longitude: r.lng! }}
              tracksViewChanges={true}
              onPress={() => handleMarkerPress(r)}
            >
              {/* Custom view replaces callout — bottom sheet handles detail */}
              <MosquitoMarker
                isCritical={r.status === "CRITICAL"}
                isSelected={selectedId === (r._id as string)}
              />
            </Marker>
          ))}
      </MapView>

      <Animated.View style={[styles.overlays, { opacity: fadeAnim }]}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.modeToggle}>
            <PillBtn
              icon={Map}
              label="Vector"
              active={mode === "vector"}
              onPress={() => setMode("vector")}
            />
            <PillBtn
              icon={Satellite}
              label="Satellite"
              active={mode === "satellite"}
              onPress={() => setMode("satellite")}
            />
          </View>
          <StatsHUD
            zones={showZones ? riskZones.length : 0}
            markers={showReports ? verifiedHotspots.length : 0}
          />
        </View>

        {/* Right panel */}
        <View style={styles.rightPanel}>
          <FloatBtn
            icon={showZones ? Eye : EyeOff}
            active={showZones}
            color={C.danger}
            onPress={() => setShowZones((v) => !v)}
          />
          <FloatBtn
            icon={AlertTriangle}
            active={showReports}
            color={C.accent}
            onPress={() => setShowReports((v) => !v)}
          />
          <FloatBtn
            icon={Crosshair}
            color={C.safe}
            onPress={() => {
              if (verifiedHotspots.length > 0 && mapRef.current) {
                mapRef.current.fitToCoordinates(
                  verifiedHotspots.map((r) => ({
                    latitude: r.lat!,
                    longitude: r.lng!,
                  })),
                  {
                    edgePadding: { top: 80, right: 60, bottom: 80, left: 60 },
                    animated: true,
                  },
                );
              }
            }}
          />
        </View>

        {/* Bottom legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: C.danger, shadowColor: C.danger },
              ]}
            />
            <Text style={styles.legendText}>Critical</Text>
          </View>
          <View style={styles.legendDivider} />
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: C.warning, shadowColor: C.warning },
              ]}
            />
            <Text style={styles.legendText}>Active</Text>
          </View>
          <View style={styles.legendDivider} />
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendSwatch,
                { borderColor: C.danger + "80", backgroundColor: C.dangerGlow },
              ]}
            />
            <Text style={styles.legendText}>Risk Zone</Text>
          </View>
        </View>

        {isLoading && <StatusOverlay message="Loading hotspots…" />}
        {!isLoading && verifiedHotspots.length === 0 && (
          <StatusOverlay message="No reports found yet" />
        )}
      </Animated.View>

      {/* Bottom sheet — rendered outside Animated.View so it layers on top */}
      <ReportBottomSheet
        report={selectedReport}
        onClose={handleClose}
        onViewFullReport={() => {
          if (selectedReport?._id) {
            router.push({
              pathname: "/results",
              params: { reportId: selectedReport._id as string },
            });
          }
        }}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  overlays: {
    ...(StyleSheet.absoluteFillObject as any),
    pointerEvents: "box-none",
  },
  topBar: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  modeToggle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(17,21,32,0.92)",
    borderWidth: 1,
    borderColor: "rgba(30,38,64,0.9)",
    borderRadius: 14,
    padding: 3,
    gap: 2,
  },
  rightPanel: {
    position: "absolute",
    right: 16,
    top: "40%",
    gap: 8,
  },
  legend: {
    position: "absolute",
    bottom: 36,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(17,21,32,0.92)",
    borderWidth: 1,
    borderColor: "rgba(30,38,64,0.9)",
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 7 },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 4,
  },
  legendSwatch: {
    width: 16,
    height: 10,
    borderRadius: 3,
    borderWidth: 1.5,
  },
  legendText: {
    fontSize: 10,
    fontWeight: "700",
    color: C.textSub,
    letterSpacing: 0.3,
  },
  legendDivider: { width: 1, height: 16, backgroundColor: C.border },
});

// ─── Dark map style ───────────────────────────────────────────────────────────
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#0d1117" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#4a5568" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0d1117" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#161c2d" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1e2640" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#3c4a66" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#1e2a44" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#2e3a5c" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#697a9b" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0a1628" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#1e3a5f" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#0f1520" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#0d1a12" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#1a3320" }],
  },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1e2640" }],
  },
  {
    featureType: "administrative.land_parcel",
    elementType: "labels.text.fill",
    stylers: [{ color: "#2e3a5c" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#111520" }],
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#0d1117" }],
  },
];
