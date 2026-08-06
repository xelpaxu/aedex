import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Mapbox from "@rnmapbox/maps";
import { useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";

// 🔑 Mapbox access token - empty string enables MapLibre mode (no token needed)
Mapbox.setAccessToken("");

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  MapPin,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react-native";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Colour tokens ────────────────────────────────────────────────────────────
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
  dangerGlow: "#FF4D6A18",
  safe: "#00C896",
  safeGlow: "#00C89618",
  warn: "#F5A623",
  warnGlow: "#F5A62318",
  gold: "#FFD166",
};

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
const Row = ({ children, style }: any) => (
  <View style={[{ flexDirection: "row", alignItems: "center" }, style]}>
    {children}
  </View>
);
const Spacer = ({ h = 0, w = 0 }: any) => (
  <View style={{ height: h, width: w }} />
);
const HDivider = () => <View style={styles.hdivider} />;

// ─── Status dot ───────────────────────────────────────────────────────────────
const StatusDot = ({ color }: { color: string }) => (
  <View
    style={[styles.statusDot, { backgroundColor: color, shadowColor: color }]}
  />
);

// ─── Tag chip ─────────────────────────────────────────────────────────────────
const Tag = ({
  label,
  color = C.accent,
  bg,
}: {
  label: string;
  color?: string;
  bg?: string;
}) => (
  <View
    style={[
      styles.tag,
      { backgroundColor: bg ?? color + "18", borderColor: color + "40" },
    ]}
  >
    <Text style={[styles.tagText, { color }]}>{label}</Text>
  </View>
);

// ─── Stat block ───────────────────────────────────────────────────────────────
const StatBlock = ({ label, value, sub, color = C.text }: any) => (
  <View style={styles.statBlock}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
  </View>
);

// ─── Section label ────────────────────────────────────────────────────────────
const SectionLabel = ({ children }: any) => (
  <Row style={{ marginBottom: 12, gap: 8 }}>
    <View style={styles.sectionLabelDash} />
    <Text style={styles.sectionLabelText}>{children}</Text>
  </Row>
);

// ─── Timeline item ────────────────────────────────────────────────────────────
const TimelineItem = ({
  title,
  date,
  completed,
  active,
  last,
}: {
  title: string;
  date: string;
  completed?: boolean;
  active?: boolean;
  last?: boolean;
}) => {
  const nodeColor = completed ? C.safe : active ? C.warn : C.border;
  return (
    <View style={{ flexDirection: "row", gap: 14 }}>
      {/* Spine */}
      <View style={{ alignItems: "center", width: 18 }}>
        <View
          style={[
            styles.tlNode,
            {
              backgroundColor: completed
                ? C.safe
                : active
                  ? C.warn
                  : C.surfaceRaised,
              borderColor: nodeColor,
              shadowColor: nodeColor,
              shadowOpacity: completed || active ? 0.6 : 0,
              shadowRadius: 8,
              elevation: completed || active ? 6 : 0,
            },
          ]}
        />
        {!last && (
          <View
            style={[
              styles.tlLine,
              { backgroundColor: completed ? C.safe + "50" : C.border },
            ]}
          />
        )}
      </View>
      {/* Content */}
      <View style={{ flex: 1, paddingBottom: last ? 0 : 28 }}>
        <Text style={[styles.tlTitle, active && { color: C.warn }]}>
          {title}
        </Text>
        <Text style={styles.tlDate}>{date}</Text>
      </View>
    </View>
  );
};

// ─── Generate Circle Points ──────────────────────────────────────────────────
function generateCirclePoints(
  centerLng: number,
  centerLat: number,
  radiusMeters: number,
  points: number = 32,
): [number, number][] {
  const earthRadius = 6371000;
  const angularRadius = radiusMeters / earthRadius;

  const latRad = (centerLat * Math.PI) / 180;
  const lngRad = (centerLng * Math.PI) / 180;

  const coordinates: [number, number][] = [];

  for (let i = 0; i <= points; i++) {
    const bearing = (i / points) * 2 * Math.PI;

    const newLat = Math.asin(
      Math.sin(latRad) * Math.cos(angularRadius) +
        Math.cos(latRad) * Math.sin(angularRadius) * Math.cos(bearing),
    );

    const newLng =
      lngRad +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularRadius) * Math.cos(latRad),
        Math.cos(angularRadius) - Math.sin(latRad) * Math.sin(newLat),
      );

    coordinates.push([(newLng * 180) / Math.PI, (newLat * 180) / Math.PI]);
  }

  return coordinates;
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const reportId = params.reportId as string;

  const report = useQuery(api.reports.getReportById, {
    id: reportId as Id<"reports">,
  });

  const [viewMode, setViewMode] = useState<"annotated" | "raw">("annotated");
  const scrollY = useRef(new Animated.Value(0)).current;
  const cameraRef = useRef<Mapbox.Camera>(null);

  // ── parallax header image offset
  const imageTranslate = scrollY.interpolate({
    inputRange: [-100, 0, 200],
    outputRange: [50, 0, -60],
    extrapolate: "clamp",
  });

  // ── header opacity on scroll
  const headerBg = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: ["rgba(11,14,20,0)", "rgba(11,14,20,0.97)"],
    extrapolate: "clamp",
  });

  if (report === undefined) {
    return (
      <View
        style={[
          styles.root,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color={C.accent} />
        <Spacer h={12} />
        <Text style={{ color: C.textSub, fontSize: 12, letterSpacing: 1 }}>
          LOADING REPORT
        </Text>
      </View>
    );
  }
  if (report === null) {
    return (
      <View
        style={[
          styles.root,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <Text style={{ color: C.textSub }}>Report not found.</Text>
      </View>
    );
  }

  // ── derive values
  const rawAccuracy = report.accuracy ?? "0";
  const accuracyNum =
    Number(rawAccuracy) <= 1 ? Number(rawAccuracy) * 100 : Number(rawAccuracy);
  const accuracy =
    typeof rawAccuracy === "string" && rawAccuracy.includes("%")
      ? rawAccuracy
      : `${accuracyNum.toFixed(1)}%`;

  const aiMessage = report.reasoning || "No detailed reasoning provided.";
  const verified = report.verified;
  const submitterName = report.userName || "Anonymous";

  // Normalise both URIs to always have the data: prefix if they are base64
  const normalizeImageUri = (uri: string) => {
    if (!uri) return "";
    if (uri.startsWith("data:") || uri.startsWith("http")) return uri;
    return `data:image/jpeg;base64,${uri}`;
  };

  const imageUri = normalizeImageUri(report.imageUri);
  const processedImage = report.processedImage || "";

  const isBase64 =
    processedImage.length > 100 && !processedImage.startsWith("http");
  const finalProcessedUri = isBase64
    ? processedImage.startsWith("data:")
      ? processedImage
      : `data:image/jpeg;base64,${processedImage}`
    : processedImage;

  const displayImage =
    viewMode === "annotated" && finalProcessedUri
      ? { uri: finalProcessedUri }
      : { uri: imageUri };

  let detections: any[] = [];
  try {
    detections =
      typeof report.detections === "string"
        ? JSON.parse(report.detections)
        : report.detections || [];
  } catch {
    detections = [];
  }

  const siteClasses =
    detections.length > 0
      ? Array.from(
          new Set(
            detections.map((d: any) => (typeof d === "string" ? d : d.label)),
          ),
        ).join(", ")
      : "None Detected";

  const riskLabelMap: any = {
    CRITICAL: "CRITICAL RISK",
    "HIGH RISK": "HIGH RISK",
    MODERATE: "HIGH RISK",
    "LOW RISK": "MINIMAL RISK",
  };

  const riskLabel = riskLabelMap[report.status] ?? "UNKNOWN";

  const isCritical =
    report.status === "CRITICAL" || report.status === "HIGH RISK";

  const riskColor = isCritical ? C.danger : C.safe;

  const riskBg = isCritical ? C.dangerGlow : C.safeGlow;

  // Generate circle points for risk zone
  const circlePoints =
    report.lat && report.lng
      ? generateCirclePoints(report.lng, report.lat, isCritical ? 200 : 150)
      : [];

  return (
    <View style={styles.root}>
      {/* ── Floating top nav ── */}
      <Animated.View
        style={[styles.floatingNav, { backgroundColor: headerBg as any }]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.navBackBtn}
        >
          <ArrowLeft color={C.text} size={18} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>FIELD REPORT</Text>
        <View
          style={[
            styles.navBadge,
            { backgroundColor: riskBg, borderColor: riskColor + "50" },
          ]}
        >
          <StatusDot color={riskColor} />
          <Text style={[styles.navBadgeText, { color: riskColor }]}>
            {riskLabel}
          </Text>
        </View>
      </Animated.View>

      <Animated.ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: false,
          },
        )}
        scrollEventThrottle={16}
      >
        {/* ══════════════════════════════════════════════════════
            HERO IMAGE — bleeds full width, parallax
        ══════════════════════════════════════════════════════ */}
        <View style={styles.heroWrapper}>
          <Animated.View
            style={{ transform: [{ translateY: imageTranslate }], height: 340 }}
          >
            <Image
              key={`${viewMode}-${displayImage.uri}`}
              source={displayImage}
              style={styles.heroImage}
              resizeMode="cover"
            />
          </Animated.View>

          {/* Dark gradient scrim */}
          <View style={styles.heroScrim} />

          {/* Toggle pill — floating on hero */}
          <View style={styles.heroToggle}>
            <Pressable
              style={[
                styles.heroToggleBtn,
                viewMode === "annotated" && styles.heroToggleBtnActive,
              ]}
              onPress={() => setViewMode("annotated")}
            >
              <Eye
                color={viewMode === "annotated" ? C.bg : C.textSub}
                size={11}
                strokeWidth={2.5}
              />
              <Text
                style={[
                  styles.heroToggleText,
                  viewMode === "annotated" && { color: C.bg },
                ]}
              >
                ANNOTATED
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.heroToggleBtn,
                viewMode === "raw" && styles.heroToggleBtnActive,
              ]}
              onPress={() => setViewMode("raw")}
            >
              <EyeOff
                color={viewMode === "raw" ? C.bg : C.textSub}
                size={11}
                strokeWidth={2.5}
              />
              <Text
                style={[
                  styles.heroToggleText,
                  viewMode === "raw" && { color: C.bg },
                ]}
              >
                RAW
              </Text>
            </Pressable>
          </View>

          {/* Bottom-left hero caption */}
          <View style={styles.heroCaption}>
            <Tag label={riskLabel} color={riskColor} />
            <Spacer h={8} />
            <Text style={styles.heroCaptionSub}>
              {params.timestamp || "Date unknown"}
            </Text>
          </View>
        </View>

        <View style={styles.sheet}>
          {/* ── STAT ROW ───────────────────────────────────── */}
          <View style={styles.statRow}>
            <StatBlock label="ACCURACY" value={accuracy} color={C.safe} />
            <View style={styles.statDivider} />
            <StatBlock
              label="DETECTIONS"
              value={detections.length.toString()}
              color={C.accent}
            />
            <View style={styles.statDivider} />
            <StatBlock
              label="DENSITY"
              value={verified ? "HIGH" : "LOW"}
              color={riskColor}
            />
          </View>

          <Spacer h={28} />

          {/* ── RISK ASSESSMENT ─────────────────────────────── */}
          <SectionLabel>Risk Assessment</SectionLabel>

          <View style={styles.riskCard}>
            {/* Left accent stripe */}
            <View style={[styles.riskStripe, { backgroundColor: riskColor }]} />
            <View style={{ flex: 1, gap: 14 }}>
              <Row style={{ justifyContent: "space-between" }}>
                <Row style={{ gap: 10 }}>
                  <AlertTriangle color={riskColor} size={18} strokeWidth={2} />
                  <Text style={styles.riskCardTitle}>
                    {verified ? "Critical Risk Detected" : "Minimal Risk"}
                  </Text>
                </Row>
                <Tag
                  label={verified ? "CRITICAL" : "CLEAR"}
                  color={riskColor}
                />
              </Row>
              <HDivider />
              <View style={{ gap: 12 }}>
                <Row style={{ justifyContent: "space-between" }}>
                  <Text style={styles.fieldLabel}>Breeding Site Class</Text>
                  <Text style={styles.fieldValue}>{siteClasses}</Text>
                </Row>
                <Row style={{ justifyContent: "space-between" }}>
                  <Text style={styles.fieldLabel}>Population Density</Text>
                  <Text style={[styles.fieldValue, { color: riskColor }]}>
                    {verified ? "High Risk" : "Minimal Risk"}
                  </Text>
                </Row>
              </View>
            </View>
          </View>

          <Spacer h={28} />

          {/* ── AI REASONING ────────────────────────────────── */}
          <SectionLabel>AI Reasoning</SectionLabel>

          <View style={styles.aiCard}>
            {/* Header row */}
            <Row style={{ justifyContent: "space-between", marginBottom: 14 }}>
              <Row style={{ gap: 8 }}>
                <View style={styles.aiIconBg}>
                  <Sparkles color={C.gold} size={14} strokeWidth={2} />
                </View>
                <Text style={styles.aiTitle}>AI-assisted Analysis</Text>
              </Row>
              <View style={styles.aiModelBadge}>
                <Zap color={C.accent} size={10} />
                <Text style={styles.aiModelText}>YOLO v8</Text>
              </View>
            </Row>
            <HDivider />
            <Spacer h={14} />
            <Text style={styles.aiBody}>{aiMessage}</Text>
          </View>

          <Spacer h={28} />

          {/* ── LOCATION ────────────────────────────────────── */}
          <SectionLabel>Location</SectionLabel>

          <View style={styles.locationCard}>
            {/* Use MapLibre instead of react-native-maps */}
            {report.lat &&
            report.lng &&
            !isNaN(report.lat) &&
            !isNaN(report.lng) ? (
              <View style={styles.locationMap}>
                <Mapbox.MapView
                  style={styles.mapView}
                  styleURL="https://tiles.stadiamaps.com/styles/alidade_smooth.json"
                  logoEnabled={false}
                  attributionEnabled={true}
                  scrollEnabled={false}
                  zoomEnabled={false}
                >
                  <Mapbox.Camera
                    ref={cameraRef}
                    defaultSettings={{
                      centerCoordinate: [report.lng, report.lat],
                      zoomLevel: 16,
                    }}
                  />

                  {/* Risk Zone */}
                  {circlePoints.length > 0 && (
                    <Mapbox.ShapeSource
                      id="risk-zone"
                      shape={{
                        type: "Feature",
                        geometry: {
                          type: "Polygon",
                          coordinates: [circlePoints],
                        },
                        properties: {}, // ← Add this empty properties object
                      }}
                    >
                      <Mapbox.FillLayer
                        id="risk-zone-layer"
                        style={{
                          fillColor: isCritical
                            ? "rgba(255,77,106,0.15)"
                            : "rgba(251,191,36,0.15)",
                          fillOutlineColor: isCritical
                            ? "rgba(255,77,106,0.65)"
                            : "rgba(251,191,36,0.65)",
                          fillAntialias: true,
                        }}
                      />
                    </Mapbox.ShapeSource>
                  )}

                  {/* Marker */}
                  <Mapbox.PointAnnotation
                    id="report-marker"
                    coordinate={[report.lng, report.lat]}
                  >
                    <View
                      style={[
                        styles.markerDot,
                        { backgroundColor: isCritical ? C.danger : C.accent },
                      ]}
                    >
                      <Text style={styles.markerEmoji}>🦟</Text>
                    </View>
                  </Mapbox.PointAnnotation>
                </Mapbox.MapView>
              </View>
            ) : (
              <View
                style={[
                  styles.locationMap,
                  { justifyContent: "center", alignItems: "center" },
                ]}
              >
                <Text style={{ color: C.textSub }}>Location not available</Text>
              </View>
            )}

            <View style={styles.locationFooter}>
              <View style={styles.locationFooterLeft}>
                <MapPin color={C.accent} size={13} strokeWidth={2.5} />
                <View>
                  <Text style={styles.locationTitle}>
                    {report.locationName || "Unknown location"}
                  </Text>
                  <Text style={styles.locationSub}>
                    GPS coordinates · verified
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.locationBtn}
                onPress={() => {
                  if (report.lat && report.lng) {
                    router.push({
                      pathname: "/map",
                      params: {
                        focusLat: report.lat.toString(),
                        focusLng: report.lng.toString(),
                        reportId: report._id,
                      },
                    });
                  }
                }}
              >
                <Text style={styles.locationBtnText}>MAP</Text>
                <ChevronRight color={C.bg} size={12} strokeWidth={3} />
              </TouchableOpacity>
            </View>
          </View>

          <Spacer h={28} />

          {/* ── SUBMITTER ───────────────────────────────────── */}
          <SectionLabel>Submitted by</SectionLabel>

          <View style={styles.submitterCard}>
            <View style={styles.submitterLeft}>
              <View style={styles.submitterAvatar}>
                <Image
                  source={{
                    uri: `https://ui-avatars.com/api/?name=${submitterName}&background=1a2240&color=4F8EF7&bold=true&size=80`,
                  }}
                  style={styles.avatarImg}
                />
                {verified && (
                  <View style={styles.submitterVerifiedDot}>
                    <CheckCircle2 color={C.bg} size={9} strokeWidth={3} />
                  </View>
                )}
              </View>
              <View>
                <Text style={styles.submitterName}>{submitterName}</Text>
                <Text style={styles.submitterRole}>Field Investigator</Text>
              </View>
            </View>
            <View style={styles.submitterRight}>
              <Shield color={C.safe} size={12} strokeWidth={2.5} />
              <Text style={styles.submitterVerifiedText}>VERIFIED</Text>
            </View>
          </View>

          <Spacer h={28} />

          {/* ── TIMELINE ────────────────────────────────────── */}
          <SectionLabel>Status Timeline</SectionLabel>

          <View style={styles.timelineCard}>
            <TimelineItem
              title="Report Submitted"
              date={params.timestamp ? `${params.timestamp}` : "Received"}
              completed={true}
            />
            <TimelineItem
              title={verified ? "AI & YOLO Verified" : "Awaiting AI Analysis"}
              date={verified ? "Validation Successful" : "Processing..."}
              completed={verified}
              active={!verified}
            />
            <TimelineItem
              title="Sanitation Dispatch"
              date={
                report.status === "Completed"
                  ? "Area Abated & Cleared"
                  : report.status === "In Progress"
                    ? "Unit Currently On-Site"
                    : "Awaiting Dispatch"
              }
              completed={report.status === "Completed"}
              active={report.status === "In Progress"}
              last
            />
          </View>

          <Spacer h={60} />
        </View>
      </Animated.ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // ── Floating nav
  floatingNav: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 54,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  navBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    color: C.text,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2.5,
  },
  navBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  navBadgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 1 },

  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 4,
  },

  // ── Hero
  heroWrapper: {
    height: 340,
    overflow: "hidden",
    position: "relative",
  },
  heroImage: {
    width: SCREEN_WIDTH,
    height: 380,
    position: "absolute",
    top: 0,
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },

  heroToggle: {
    position: "absolute",
    top: 110,
    right: 18,
    flexDirection: "row",
    backgroundColor: "rgba(11,14,20,0.72)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
  },
  heroToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  heroToggleBtnActive: { backgroundColor: C.text },
  heroToggleText: {
    color: C.textSub,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  heroCaption: {
    position: "absolute",
    bottom: 22,
    left: 20,
  },
  heroCaptionSub: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 10,
    letterSpacing: 0.4,
  },

  // ── Tag
  tag: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagText: { fontSize: 9, fontWeight: "800", letterSpacing: 1.2 },

  // ── Sheet
  sheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingHorizontal: 20,
    paddingTop: 28,
  },

  // ── Stats
  statRow: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  statBlock: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 18,
    gap: 4,
  },
  statValue: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  statLabel: {
    fontSize: 9,
    color: C.textSub,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  statSub: { fontSize: 9, color: C.textDim },
  statDivider: { width: 1, backgroundColor: C.border, marginVertical: 14 },

  // ── Section label
  sectionLabelDash: {
    width: 20,
    height: 2,
    backgroundColor: C.accent,
    borderRadius: 1,
  },
  sectionLabelText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    color: C.textSub,
    textTransform: "uppercase",
  },

  // ── Divider
  hdivider: { height: 1, backgroundColor: C.border },

  // ── Risk card
  riskCard: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    padding: 18,
    gap: 14,
  },
  riskStripe: { width: 3, borderRadius: 2 },
  riskCardTitle: { fontSize: 14, fontWeight: "800", color: C.text },
  fieldLabel: { fontSize: 12, color: C.textSub, fontWeight: "500" },
  fieldValue: { fontSize: 13, fontWeight: "700", color: C.text },

  // ── AI card
  aiCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
  },
  aiIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#2A2010",
    alignItems: "center",
    justifyContent: "center",
  },
  aiTitle: { fontSize: 13, fontWeight: "800", color: C.text },
  aiModelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.accentGlow,
    borderWidth: 1,
    borderColor: C.accent + "30",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  aiModelText: {
    fontSize: 9,
    fontWeight: "800",
    color: C.accent,
    letterSpacing: 0.8,
  },
  aiBody: { fontSize: 13, color: C.textSub, lineHeight: 21, fontWeight: "400" },

  // ── Location card
  locationCard: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  locationMap: { width: "100%", height: 120, backgroundColor: C.surfaceRaised },
  mapView: { width: "100%", height: 120 },
  markerDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerEmoji: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
  },
  locationFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    gap: 10,
  },
  locationFooterLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  locationTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: C.text,
    marginBottom: 2,
  },
  locationSub: { fontSize: 10, color: C.textSub },
  locationBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.accent,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  locationBtnText: {
    color: C.bg,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },

  // ── Submitter
  submitterCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  submitterLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  submitterAvatar: { position: "relative" },
  avatarImg: { width: 44, height: 44, borderRadius: 12 },
  submitterVerifiedDot: {
    position: "absolute",
    bottom: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: C.safe,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: C.surface,
  },
  submitterName: {
    fontSize: 14,
    fontWeight: "800",
    color: C.text,
    marginBottom: 2,
  },
  submitterRole: { fontSize: 10, color: C.textSub },
  submitterRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.safeGlow,
    borderWidth: 1,
    borderColor: C.safe + "40",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  submitterVerifiedText: {
    fontSize: 9,
    fontWeight: "800",
    color: C.safe,
    letterSpacing: 1,
  },

  // ── Timeline
  timelineCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    paddingBottom: 8,
  },
  tlNode: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  tlLine: { flex: 1, width: 2, marginTop: 4 },
  tlTitle: { fontSize: 13, fontWeight: "700", color: C.text, marginBottom: 3 },
  tlDate: { fontSize: 10, color: C.textSub },
});
