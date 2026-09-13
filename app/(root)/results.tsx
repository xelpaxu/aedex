import { useMutation, useQuery } from "convex/react";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Compass,
  Eye,
  EyeOff,
  LocateFixed,
  MapPin,
  Maximize2,
  Navigation,
  Shield,
  Sparkles,
  X,
  Zap,
} from "lucide-react-native";
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { ThemeColors, useTheme } from "../../context/ThemeContext";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
const Row = ({ children, style }: any) => (
  <View style={[{ flexDirection: "row", alignItems: "center" }, style]}>
    {children}
  </View>
);
const Spacer = ({ h = 0, w = 0 }: any) => (
  <View style={{ height: h, width: w }} />
);

// ─── Status dot ───────────────────────────────────────────────────────────────
const StatusDot = ({ color }: { color: string }) => (
  <View
    style={[
      dotStyles.statusDot,
      { backgroundColor: color, shadowColor: color },
    ]}
  />
);
const dotStyles = StyleSheet.create({
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
});

// ─── Tag chip ─────────────────────────────────────────────────────────────────
const Tag = ({
  label,
  color,
  bg,
}: {
  label: string;
  color: string;
  bg?: string;
}) => (
  <View
    style={[
      tagStyles.tag,
      { backgroundColor: bg ?? color + "18", borderColor: color + "40" },
    ]}
  >
    <Text style={[tagStyles.tagText, { color }]}>{label}</Text>
  </View>
);
const tagStyles = StyleSheet.create({
  tag: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
});

// ─── Stat block ───────────────────────────────────────────────────────────────
const StatBlock = ({ label, value, sub, color, C }: any) => (
  <View style={sbStyles.statBlock}>
    <Text style={[sbStyles.statValue, { color: color || C.text }]}>{value}</Text>
    <Text style={[sbStyles.statLabel, { color: C.textSub }]}>{label}</Text>
    {sub ? <Text style={[sbStyles.statSub, { color: C.textDim }]}>{sub}</Text> : null}
  </View>
);
const sbStyles = StyleSheet.create({
  statBlock: { alignItems: "center", flex: 1 },
  statValue: { fontSize: 18, fontWeight: "900", letterSpacing: 0.5 },
  statLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 2,
  },
  statSub: { fontSize: 9, marginTop: 1 },
});

// ─── Section label ────────────────────────────────────────────────────────────
const SectionLabel = ({ children, C }: { children: string; C: ThemeColors }) => (
  <Row style={{ marginBottom: 12, gap: 8 }}>
    <View style={[secStyles.sectionLabelDash, { backgroundColor: C.accent }]} />
    <Text style={[secStyles.sectionLabelText, { color: C.textSub }]}>{children}</Text>
  </Row>
);
const secStyles = StyleSheet.create({
  sectionLabelDash: {
    width: 3,
    height: 12,
    borderRadius: 1.5,
  },
  sectionLabelText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
});

// ─── Timeline item ────────────────────────────────────────────────────────────
const TimelineItem = ({
  title,
  date,
  completed,
  active,
  last,
  C,
}: {
  title: string;
  date: string;
  completed?: boolean;
  active?: boolean;
  last?: boolean;
  C: ThemeColors;
}) => {
  const nodeColor = completed ? C.safe : active ? C.warn : C.border;
  return (
    <View style={{ flexDirection: "row", gap: 14 }}>
      {/* Spine */}
      <View style={{ alignItems: "center", width: 18 }}>
        <View
          style={[
            tlStyles.tlNode,
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
              tlStyles.tlLine,
              { backgroundColor: completed ? C.safe + "50" : C.border },
            ]}
          />
        )}
      </View>
      {/* Content */}
      <View style={{ flex: 1, paddingBottom: last ? 0 : 28 }}>
        <Text style={[tlStyles.tlTitle, { color: C.text }, active && { color: C.warn }]}>
          {title}
        </Text>
        <Text style={[tlStyles.tlDate, { color: C.textSub }]}>{date}</Text>
      </View>
    </View>
  );
};
const tlStyles = StyleSheet.create({
  tlNode: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    marginTop: 2,
    shadowOffset: { width: 0, height: 0 },
  },
  tlLine: { flex: 1, width: 2, marginTop: 4, marginBottom: 4 },
  tlTitle: { fontSize: 12, fontWeight: "800" },
  tlDate: { fontSize: 10, marginTop: 2 },
});

// ─── Interactive Location Preview with Road Routing Support ───────────────────
function buildPreviewMapHtml(
  lat: number,
  lng: number,
  isCritical: boolean,
  radiusMeters: number,
  C: ThemeColors,
  isDark: boolean,
) {
  const zoneColor = isCritical ? C.danger : C.warn;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: ${C.surfaceRaised}; }
    .leaflet-control-attribution { font-size: 7px; opacity: 0.5; }
    .leaflet-control-zoom { display: none; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: true
    }).setView([${lat}, ${lng}], 15);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    var routeLayer = L.layerGroup().addTo(map);
    var userLocationMarker = null;

    L.circle([${lat}, ${lng}], {
      radius: ${radiusMeters},
      color: '${zoneColor}',
      fillColor: '${zoneColor}',
      fillOpacity: 0.15,
      weight: 1.5,
      opacity: 0.65
    }).addTo(map);

    var reportIcon = L.divIcon({
      className: '',
      html: '<div style="width:32px;height:32px;border-radius:16px;background:${isCritical ? C.danger : C.accent};display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.4);"><span style="font-size:16px;">🦟</span></div>',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
    L.marker([${lat}, ${lng}], { icon: reportIcon }).addTo(map);

    function post(msg) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(msg));
      }
    }

    window.drawRoute = function(startLat, startLng, endLat, endLng) {
      routeLayer.clearLayers();
      if (!startLat || !startLng || !endLat || !endLng) return;

      var latlngs = [[startLat, startLng], [endLat, endLng]];
      
      var R = 6371;
      var dLat = (endLat - startLat) * Math.PI / 180;
      var dLon = (endLng - startLng) * Math.PI / 180;
      var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(startLat * Math.PI / 180) * Math.cos(endLat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      var distKm = (R * c).toFixed(2);
      var mins = Math.max(1, Math.round((distKm / 30) * 60));

      post({ type: 'routeCalculated', distanceKm: distKm, durationMins: mins });

      L.polyline(latlngs, {
        color: '${C.accent}',
        weight: 5,
        opacity: 0.9,
        dashArray: '6, 6'
      }).addTo(routeLayer);
      map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40] });

      var osrmUrl = 'https://router.project-osrm.org/route/v1/driving/' + 
        startLng + ',' + startLat + ';' + endLng + ',' + endLat + 
        '?overview=full&geometries=geojson';

      fetch(osrmUrl)
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (data && data.routes && data.routes.length > 0) {
            routeLayer.clearLayers();
            var route = data.routes[0];
            var coords = route.geometry.coordinates.map(function(c) { return [c[1], c[0]]; });

            L.polyline(coords, {
              color: '${C.surface}',
              weight: 8,
              opacity: 0.85
            }).addTo(routeLayer);

            L.polyline(coords, {
              color: '${C.accent}',
              weight: 5,
              opacity: 0.95
            }).addTo(routeLayer);

            map.fitBounds(L.latLngBounds(coords), { padding: [40, 40] });

            var realDist = (route.distance / 1000).toFixed(2);
            var realDuration = Math.max(1, Math.round(route.duration / 60));
            post({ type: 'routeCalculated', distanceKm: realDist, durationMins: realDuration });
          }
        })
        .catch(function(err) {});
    };

    window.clearRoute = function() {
      routeLayer.clearLayers();
      map.setView([${lat}, ${lng}], 15);
    };
  </script>
</body>
</html>`;
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function ResultsScreen() {
  const router = useRouter();
  const { colors: C, isDark } = useTheme();
  const params = useLocalSearchParams();
  const reportId = params.reportId as string;

  const currentUser = useQuery(api.users.getMe);
  const isTanod = currentUser?.role === "tanod";

  const report = useQuery(api.reports.getReport, {
    id: reportId as Id<"reports">,
  });

  const resolveReportMutation = useMutation(api.reports.resolveReport);
  const [isResolving, setIsResolving] = useState(false);

  // Direction & Image inspection states
  const previewWebViewRef = useRef<WebView>(null);
  const [isTrackingDirections, setIsTrackingDirections] = useState(false);
  const [routeMetrics, setRouteMetrics] = useState<{
    distanceKm: string;
    durationMins: number;
  } | null>(null);
  const [imageInspectorVisible, setImageInspectorVisible] = useState(false);

  const handleResolveReport = async () => {
    if (!report?._id) return;
    try {
      setIsResolving(true);
      await resolveReportMutation({
        reportId: report._id as Id<"reports">,
        resolutionNotes: "Marked as resolved by Tanod Field Officer.",
      });
    } catch (err) {
      console.error("Resolution failed:", err);
    } finally {
      setIsResolving(false);
    }
  };

  const handleTrackDirectionPress = async () => {
    if (!report?.lat || !report?.lng) return;

    if (isTrackingDirections) {
      setIsTrackingDirections(false);
      setRouteMetrics(null);
      previewWebViewRef.current?.injectJavaScript(`window.clearRoute(); true;`);
      return;
    }

    try {
      setIsTrackingDirections(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
        });
        const userLat = loc.coords.latitude;
        const userLng = loc.coords.longitude;

        previewWebViewRef.current?.injectJavaScript(
          `window.drawRoute(${userLat}, ${userLng}, ${report.lat}, ${report.lng}); true;`
        );
      }
    } catch (err) {
      console.log("GPS Location error:", err);
    }
  };

  const [viewMode, setViewMode] = useState<"annotated" | "raw">("annotated");
  const scrollY = useRef(new Animated.Value(0)).current;

  // ── parallax header image offset
  const imageTranslate = scrollY.interpolate({
    inputRange: [-100, 0, 200],
    outputRange: [50, 0, -60],
    extrapolate: "clamp",
  });

  // ── header opacity on scroll
  const headerBg = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [C.surface + "00", C.surface + "F8"],
    extrapolate: "clamp",
  });

  const hasLocation =
    !!report &&
    !!report.lat &&
    !!report.lng &&
    !isNaN(report.lat) &&
    !isNaN(report.lng);

  const previewHtml = useMemo(() => {
    if (!report || !hasLocation) return "";
    const isCriticalForPreview =
      report.status === "CRITICAL" || report.status === "HIGH RISK";
    return buildPreviewMapHtml(
      report.lat,
      report.lng,
      isCriticalForPreview,
      isCriticalForPreview ? 200 : 150,
      C,
      isDark,
    );
  }, [report, hasLocation, C, isDark]);

  const styles = useMemo(() => createStyles(C), [C]);

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

  const normalizeImageUri = (uri: string) => {
    if (!uri) return "";
    if (uri.startsWith("data:") || uri.startsWith("http")) return uri;
    return `data:image/jpeg;base64,${uri}`;
  };

  const imageToDisplay =
    viewMode === "annotated" && report.processedImage
      ? normalizeImageUri(report.processedImage)
      : normalizeImageUri(report.imageUri);

  const dateStr = new Date(report._creationTime).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = new Date(report._creationTime).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isResolved =
    report.status === "Resolved" || report.status === "Completed";
  const isCritical =
    report.status === "CRITICAL" || report.status === "HIGH RISK";

  const statusColor = isResolved ? C.safe : isCritical ? C.danger : C.warn;
  const statusGlow = isResolved
    ? C.safeGlow
    : isCritical
      ? C.dangerGlow
      : C.warnGlow;

  return (
    <View style={styles.root}>
      {/* ── FLOATING TOP HEADER ── */}
      <Animated.View style={[styles.headerBar, { backgroundColor: headerBg }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft color={C.text} size={16} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          REPORT #{reportId.slice(-6).toUpperCase()}
        </Text>
        <View
          style={[
            styles.headerStatusBadge,
            {
              backgroundColor: statusGlow,
              borderColor: statusColor + "40",
            },
          ]}
        >
          <StatusDot color={statusColor} />
          <Text
            style={[styles.headerStatusText, { color: statusColor }]}
          >
            {(report.status || "ACTIVE").toUpperCase()}
          </Text>
        </View>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        contentContainerStyle={{ paddingBottom: isTanod ? 110 : 60 }}
      >
        {/* ── HERO IMAGE WITH PARALLAX ── */}
        <View style={styles.heroWrapper}>
          <Animated.Image
            source={{ uri: imageToDisplay }}
            style={[
              styles.heroImage,
              { transform: [{ translateY: imageTranslate }] },
            ]}
            resizeMode="cover"
          />
          <View style={styles.heroScrim} />

          {/* Inspect Image Magnifier Button */}
          <TouchableOpacity
            style={styles.inspectImageBadge}
            activeOpacity={0.8}
            onPress={() => setImageInspectorVisible(true)}
          >
            <Maximize2 color={C.text} size={12} strokeWidth={2.5} />
            <Text style={styles.inspectImageBadgeText}>INSPECT IMAGE</Text>
          </TouchableOpacity>

          {/* Raw / Annotated toggle */}
          {report.processedImage ? (
            <View style={styles.heroToggle}>
              <Pressable
                onPress={() => setViewMode("annotated")}
                style={[
                  styles.heroToggleBtn,
                  viewMode === "annotated" && styles.heroToggleBtnActive,
                ]}
              >
                <Eye
                  color={viewMode === "annotated" ? "#FFFFFF" : C.textSub}
                  size={11}
                  strokeWidth={2.5}
                />
                <Text
                  style={[
                    styles.heroToggleText,
                    viewMode === "annotated" && { color: "#FFFFFF" },
                  ]}
                >
                  AI MASK
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setViewMode("raw")}
                style={[
                  styles.heroToggleBtn,
                  viewMode === "raw" && styles.heroToggleBtnActive,
                ]}
              >
                <EyeOff
                  color={viewMode === "raw" ? "#FFFFFF" : C.textSub}
                  size={11}
                  strokeWidth={2.5}
                />
                <Text
                  style={[
                    styles.heroToggleText,
                    viewMode === "raw" && { color: "#FFFFFF" },
                  ]}
                >
                  RAW
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* Caption */}
          <View style={styles.heroCaption}>
            <Tag
              label={
                viewMode === "annotated"
                  ? "AI DETECTED BREEDING SITES"
                  : "ORIGINAL CAPTURE"
              }
              color={viewMode === "annotated" ? C.accent : C.textSub}
            />
            <Spacer h={4} />
            <Text style={styles.heroCaptionSub}>
              {dateStr} at {timeStr}
            </Text>
          </View>
        </View>

        {/* ── CARD SHEET ── */}
        <View style={styles.sheet}>
          {/* Quick Metrics Bar */}
          <View style={styles.statRow}>
            <StatBlock
              label="ACCURACY"
              value={accuracy}
              color={C.accent}
              C={C}
            />
            <View style={styles.statDivider} />
            <StatBlock
              label="HOTSPOT"
              value={report.status || "ACTIVE"}
              color={statusColor}
              C={C}
            />
            <View style={styles.statDivider} />
            <StatBlock
              label="VALIDATION"
              value={verified ? "VERIFIED" : "COMMUNITY"}
              color={verified ? C.safe : C.warn}
              C={C}
            />
          </View>

          <Spacer h={22} />

          {/* ── SITE PHOTO INSPECTOR CARD ── */}
          <SectionLabel C={C}>SITE PHOTO INSPECTION</SectionLabel>
          <View style={styles.sitePhotoCard}>
            <TouchableOpacity
              style={styles.sitePhotoBtn}
              activeOpacity={0.8}
              onPress={() => setImageInspectorVisible(true)}
            >
              <Image
                source={{ uri: imageToDisplay }}
                style={styles.sitePhotoThumb}
                resizeMode="cover"
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.sitePhotoTitle}>Field Photo Evidence</Text>
                <Text style={styles.sitePhotoSub}>
                  Tap to view high-resolution photo comparison
                </Text>
                <View style={styles.sitePhotoBadgeRow}>
                  <Tag
                    label="TAP TO ENLARGE"
                    color={C.accent}
                    bg={C.accentGlow}
                  />
                </View>
              </View>
              <Maximize2 color={C.accent} size={18} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <Spacer h={22} />

          {/* ── VECTOR RISK & WATER CONTAINER SPEC ── */}
          <SectionLabel C={C}>VECTOR BREEDING ASSESSMENT</SectionLabel>
          <View style={styles.riskCard}>
            <View
              style={[
                styles.riskStripe,
                { backgroundColor: statusColor },
              ]}
            />
            <View style={{ flex: 1, gap: 10 }}>
              <Row style={{ justifyContent: "space-between" }}>
                <Text style={styles.riskCardTitle}>Incident Assessment</Text>
                <Tag
                  label={report.status || "MONITORING"}
                  color={statusColor}
                />
              </Row>
              <View style={{ gap: 6 }}>
                <Row style={{ justifyContent: "space-between" }}>
                  <Text style={styles.fieldLabel}>Detection Model:</Text>
                  <Text style={styles.fieldValue}>YOLOv8 + Gemini 2.0</Text>
                </Row>
                <Row style={{ justifyContent: "space-between" }}>
                  <Text style={styles.fieldLabel}>Risk Classification:</Text>
                  <Text
                    style={[
                      styles.fieldValue,
                      { color: statusColor },
                    ]}
                  >
                    {isCritical
                      ? "High Threat Vector Zone"
                      : "Moderate Breeding Ground"}
                  </Text>
                </Row>
                <Row style={{ justifyContent: "space-between" }}>
                  <Text style={styles.fieldLabel}>Verified by Health Unit:</Text>
                  <Text
                    style={[
                      styles.fieldValue,
                      { color: verified ? C.safe : C.warn },
                    ]}
                  >
                    {verified ? "Yes (Tanod Confirmed)" : "Awaiting Verification"}
                  </Text>
                </Row>
              </View>
            </View>
          </View>

          <Spacer h={22} />

          {/* ── AI BREEDING SITE REASONING ── */}
          <SectionLabel C={C}>AI DETECTION REASONING</SectionLabel>
          <View style={styles.aiCard}>
            <Row style={{ gap: 8, marginBottom: 12 }}>
              <View style={styles.aiIconBg}>
                <Sparkles color={C.gold} size={13} strokeWidth={2.5} />
              </View>
              <Text style={styles.aiTitle}>AI Diagnostics Engine</Text>
              <Spacer w={4} />
              <View style={styles.aiModelBadge}>
                <Zap color={C.accent} size={9} />
                <Text style={styles.aiModelText}>AEDEX-VISION</Text>
              </View>
            </Row>
            <Text style={styles.aiBody}>{aiMessage}</Text>
          </View>

          <Spacer h={22} />

          {/* ── INTERACTIVE LOCATION & DIRECTIONS MAP ── */}
          {hasLocation && (
            <>
              <SectionLabel C={C}>GEOSPATIAL COORDINATES</SectionLabel>
              <View style={styles.locationCard}>
                <View style={styles.locationMap}>
                  <WebView
                    ref={previewWebViewRef}
                    originWhitelist={["*"]}
                    source={{ html: previewHtml }}
                    style={{ flex: 1, backgroundColor: C.surfaceRaised }}
                    scrollEnabled={false}
                    javaScriptEnabled
                    domStorageEnabled
                    onMessage={(event) => {
                      try {
                        const data = JSON.parse(event.nativeEvent.data);
                        if (data.type === "routeCalculated") {
                          setRouteMetrics({
                            distanceKm: data.distanceKm,
                            durationMins: data.durationMins,
                          });
                        }
                      } catch (e) {
                        // ignore
                      }
                    }}
                  />
                </View>

                {/* Road Directions Snackbar */}
                {isTrackingDirections && routeMetrics && (
                  <View style={styles.inlineNavSnackbar}>
                    <View style={styles.inlineNavHeader}>
                      <View style={styles.inlineNavBadge}>
                        <Navigation
                          color={C.accent}
                          size={13}
                          strokeWidth={2.5}
                        />
                        <Text style={styles.inlineNavTitle}>
                          ROUTE TO BREEDING SITE
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={handleTrackDirectionPress}
                        style={styles.closeInlineNavBtn}
                      >
                        <X color={C.textSub} size={14} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.inlineNavMetricsRow}>
                      <View style={styles.inlineNavMetricBox}>
                        <Text style={styles.inlineNavMetricVal}>
                          {routeMetrics.distanceKm} km
                        </Text>
                        <Text style={styles.inlineNavMetricLbl}>DISTANCE</Text>
                      </View>
                      <View style={styles.inlineNavMetricBox}>
                        <Text
                          style={[
                            styles.inlineNavMetricVal,
                            { color: C.accent },
                          ]}
                        >
                          ~{routeMetrics.durationMins} mins
                        </Text>
                        <Text style={styles.inlineNavMetricLbl}>DRIVE/WALK</Text>
                      </View>
                    </View>
                  </View>
                )}

                <View style={styles.locationFooter}>
                  <View style={styles.locationFooterLeft}>
                    <MapPin color={C.accent} size={15} strokeWidth={2.5} />
                    <View>
                      <Text style={styles.locationTitle}>
                        {report.locationName || "Report Location"}
                      </Text>
                      <Text style={styles.locationSub}>
                        {report.lat?.toFixed(5)}, {report.lng?.toFixed(5)}
                      </Text>
                    </View>
                  </View>

                  {/* Directions toggle button */}
                  <TouchableOpacity
                    style={[
                      styles.trackDirectionBtn,
                      isTrackingDirections && styles.trackDirectionBtnActive,
                    ]}
                    onPress={handleTrackDirectionPress}
                    activeOpacity={0.8}
                  >
                    <Navigation
                      color={isTrackingDirections ? C.accent : "#FFFFFF"}
                      size={12}
                      strokeWidth={2.5}
                    />
                    <Text
                      style={[
                        styles.trackDirectionBtnText,
                        isTrackingDirections && { color: C.accent },
                      ]}
                    >
                      {isTrackingDirections ? "CLEAR" : "DIRECTIONS"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Spacer h={22} />
            </>
          )}

          {/* ── SUBMITTED BY CARD ── */}
          <SectionLabel C={C}>REPORT ORIGIN</SectionLabel>
          <View style={styles.submitterCard}>
            <Row style={{ gap: 12 }}>
              <View style={styles.submitterAvatar}>
                <Shield color="#FFFFFF" size={15} strokeWidth={2.5} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.submitterName}>{submitterName}</Text>
                <Text style={styles.submitterRole}>
                  Community Field Scout • Registered Resident
                </Text>
              </View>
              <View style={styles.submitterRight}>
                <CheckCircle2 color={C.safe} size={11} strokeWidth={2.5} />
                <Text style={styles.submitterVerifiedText}>AUTHENTICATED</Text>
              </View>
            </Row>
          </View>

          <Spacer h={22} />

          {/* ── TIMELINE TRACKER ── */}
          <SectionLabel C={C}>INCIDENT LIFECYCLE</SectionLabel>
          <View style={styles.timelineCard}>
            <TimelineItem
              title="Report Uploaded & Processed"
              date={`${dateStr} • ${timeStr}`}
              completed
              C={C}
            />
            <TimelineItem
              title="AI Classification & Site Mapping"
              date={`Confidence Score: ${accuracy}`}
              completed
              C={C}
            />
            <TimelineItem
              title="Tanod Field Verification"
              date={
                verified
                  ? "Confirmed by Barangay Health Tanod Unit"
                  : "Dispatched to Local Tanod Officers"
              }
              completed={verified}
              active={!verified && !isResolved}
              C={C}
            />
            <TimelineItem
              title="Breeding Site Elimination & Resolution"
              date={
                isResolved
                  ? "Breeding Site Cleared and Disinfected"
                  : "Pending Field Action"
              }
              completed={isResolved}
              active={verified && !isResolved}
              last
              C={C}
            />
          </View>
        </View>
      </Animated.ScrollView>

      {/* ── TANOD ACTION FOOTER (RESOLVE HOTSPOT) ── */}
      {isTanod && !isResolved && (
        <View style={styles.actionFooter}>
          <TouchableOpacity
            style={styles.resolveBtn}
            onPress={handleResolveReport}
            disabled={isResolving}
            activeOpacity={0.8}
          >
            {isResolving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <CheckCircle2 color="#FFFFFF" size={16} strokeWidth={2.5} />
                <Text style={styles.resolveBtnText}>
                  MARK SITE AS RESOLVED / TREATED
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ── FULL SCREEN HIGH RESOLUTION IMAGE INSPECTION MODAL ── */}
      <Modal
        visible={imageInspectorVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageInspectorVisible(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Image Inspection</Text>
              <Text style={styles.modalSub}>
                {viewMode === "annotated" ? "AI Detection Overlay" : "Raw Capture"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setImageInspectorVisible(false)}
            >
              <X color={C.text} size={18} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalImageWrapper}>
            <Image
              source={{ uri: imageToDisplay }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.modalFooter}>
            <View style={styles.modalToggleRow}>
              <Pressable
                onPress={() => setViewMode("annotated")}
                style={[
                  styles.modalToggleBtn,
                  viewMode === "annotated" && styles.modalToggleBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.modalToggleText,
                    viewMode === "annotated" && { color: "#FFFFFF" },
                  ]}
                >
                  AI DETECTION
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setViewMode("raw")}
                style={[
                  styles.modalToggleBtn,
                  viewMode === "raw" && styles.modalToggleBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.modalToggleText,
                    viewMode === "raw" && { color: "#FFFFFF" },
                  ]}
                >
                  RAW PHOTO
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (C: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },

    // Floating Header
    headerBar: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      paddingTop: 46,
      paddingBottom: 12,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: C.border + "60",
    },
    backBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: C.surfaceRaised,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      flex: 1,
      fontSize: 14,
      fontWeight: "800",
      color: C.text,
    },
    headerStatusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 20,
      borderWidth: 1,
    },
    headerStatusText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },

    // Hero
    heroWrapper: {
      height: 340,
      backgroundColor: C.surface,
      position: "relative",
      overflow: "hidden",
    },
    heroImage: { width: SCREEN_WIDTH, height: 340 },
    heroScrim: {
      ...(StyleSheet.absoluteFillObject as any),
      backgroundColor: "rgba(11,14,20,0.45)",
    },
    inspectImageBadge: {
      position: "absolute",
      top: 90,
      right: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: C.surface + "D9",
      borderWidth: 1,
      borderColor: C.borderBright,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 20,
    },
    inspectImageBadgeText: {
      fontSize: 9,
      fontWeight: "800",
      color: C.text,
      letterSpacing: 0.8,
    },
    heroToggle: {
      position: "absolute",
      bottom: 20,
      right: 16,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: C.surface + "D9",
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 20,
      padding: 3,
      gap: 2,
    },
    heroToggleBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 16,
    },
    heroToggleBtnActive: { backgroundColor: C.accent },
    heroToggleText: {
      fontSize: 9,
      fontWeight: "800",
      color: C.textSub,
      letterSpacing: 0.8,
    },
    heroCaption: {
      position: "absolute",
      bottom: 20,
      left: 16,
      alignItems: "flex-start",
    },
    heroCaptionSub: {
      fontSize: 11,
      fontWeight: "600",
      color: "rgba(255,255,255,0.75)",
    },

    // Sheet
    sheet: {
      marginTop: -20,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      backgroundColor: C.bg,
      paddingHorizontal: 18,
      paddingTop: 24,
    },

    // Stats
    statRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 8,
    },
    statDivider: { width: 1, height: 28, backgroundColor: C.border },

    // Site Photo Card
    sitePhotoCard: {
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 16,
      padding: 12,
    },
    sitePhotoBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    sitePhotoThumb: {
      width: 56,
      height: 56,
      borderRadius: 12,
      backgroundColor: C.surfaceRaised,
    },
    sitePhotoTitle: {
      fontSize: 13,
      fontWeight: "800",
      color: C.text,
    },
    sitePhotoSub: {
      fontSize: 10,
      color: C.textSub,
      marginTop: 2,
    },
    sitePhotoBadgeRow: {
      flexDirection: "row",
      marginTop: 6,
    },

    // Risk
    riskCard: {
      flexDirection: "row",
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 16,
      padding: 16,
      overflow: "hidden",
    },
    riskStripe: {
      width: 4,
      borderRadius: 2,
      marginRight: 14,
    },
    riskCardTitle: { fontSize: 14, fontWeight: "800", color: C.text },
    fieldLabel: { fontSize: 12, color: C.textSub },
    fieldValue: { fontSize: 12, fontWeight: "700", color: C.text },

    // AI Card
    aiCard: {
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 16,
      padding: 16,
    },
    aiIconBg: {
      width: 24,
      height: 24,
      borderRadius: 7,
      backgroundColor: C.gold + "18",
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
      borderColor: C.accent + "40",
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 10,
    },
    aiModelText: { fontSize: 9, fontWeight: "800", color: C.accent },
    aiBody: { fontSize: 13, color: C.textSub, lineHeight: 20 },

    // Location
    locationCard: {
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 16,
      overflow: "hidden",
    },
    locationMap: { height: 180 },
    locationFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 14,
      backgroundColor: C.surfaceRaised,
      borderTopWidth: 1,
      borderTopColor: C.border,
    },
    locationFooterLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
    locationTitle: { fontSize: 12, fontWeight: "800", color: C.text },
    locationSub: { fontSize: 10, color: C.textSub, marginTop: 1 },
    trackDirectionBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: C.accent,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
    },
    trackDirectionBtnActive: {
      backgroundColor: C.surfaceElevated,
      borderWidth: 1,
      borderColor: C.accent,
    },
    trackDirectionBtnText: {
      fontSize: 10,
      fontWeight: "900",
      color: "#FFFFFF",
      letterSpacing: 0.8,
    },

    // Inline Nav Snackbar
    inlineNavSnackbar: {
      backgroundColor: C.surfaceElevated,
      borderTopWidth: 1,
      borderTopColor: C.accent + "60",
      padding: 14,
      gap: 10,
    },
    inlineNavHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    inlineNavBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    inlineNavTitle: {
      fontSize: 10,
      fontWeight: "900",
      color: C.accent,
      letterSpacing: 1.2,
    },
    closeInlineNavBtn: {
      padding: 4,
    },
    inlineNavMetricsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    inlineNavMetricBox: {
      backgroundColor: C.surfaceRaised,
      borderWidth: 1,
      borderColor: C.border,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 10,
      alignItems: "center",
      flex: 1,
    },
    inlineNavMetricVal: {
      fontSize: 12,
      fontWeight: "900",
      color: C.text,
    },
    inlineNavMetricLbl: {
      fontSize: 8,
      fontWeight: "800",
      color: C.textSub,
      letterSpacing: 0.8,
      marginTop: 2,
    },

    // Submitter
    submitterCard: {
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 16,
      padding: 16,
    },
    submitterAvatar: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: C.safe,
      alignItems: "center",
      justifyContent: "center",
    },
    submitterName: { fontSize: 13, fontWeight: "800", color: C.text },
    submitterRole: { fontSize: 10, color: C.textSub, marginTop: 1 },
    submitterRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: C.safeGlow,
      borderWidth: 1,
      borderColor: C.safe + "40",
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 10,
    },
    submitterVerifiedText: { fontSize: 9, fontWeight: "800", color: C.safe },

    // Timeline
    timelineCard: {
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 16,
      padding: 18,
    },

    // Tanod Action Footer
    actionFooter: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: C.surfaceElevated,
      borderTopWidth: 1,
      borderTopColor: C.borderBright,
      paddingVertical: 14,
      paddingHorizontal: 18,
    },
    resolveBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: C.safe,
      paddingVertical: 14,
      borderRadius: 14,
      shadowColor: C.safe,
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 8,
    },
    resolveBtnText: {
      fontSize: 12,
      fontWeight: "900",
      color: "#FFFFFF",
      letterSpacing: 1.2,
    },

    // Modal Image Inspector
    modalBg: {
      flex: 1,
      backgroundColor: C.bg + "F5",
      justifyContent: "space-between",
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 50,
      paddingBottom: 16,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    modalTitle: { fontSize: 16, fontWeight: "800", color: C.text },
    modalSub: { fontSize: 11, color: C.textSub, marginTop: 2 },
    modalCloseBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: C.surfaceRaised,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: "center",
      justifyContent: "center",
    },
    modalImageWrapper: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 10,
    },
    modalImage: {
      width: SCREEN_WIDTH - 20,
      height: SCREEN_HEIGHT * 0.6,
      borderRadius: 16,
    },
    modalFooter: {
      padding: 20,
      paddingBottom: 40,
      alignItems: "center",
    },
    modalToggleRow: {
      flexDirection: "row",
      backgroundColor: C.surfaceRaised,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 20,
      padding: 4,
      gap: 4,
    },
    modalToggleBtn: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 16,
    },
    modalToggleBtnActive: {
      backgroundColor: C.accent,
    },
    modalToggleText: {
      fontSize: 10,
      fontWeight: "900",
      color: C.textSub,
      letterSpacing: 0.8,
    },
  });
