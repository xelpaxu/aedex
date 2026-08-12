import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertTriangle,
  Clock,
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
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { WebView } from "react-native-webview";

// ─── Map data ─────────────────────────────────────────────────────────────────
const INITIAL_LOCATION = {
  latitude: 10.684,
  longitude: 122.513,
};
const INITIAL_ZOOM = 14;

const SCREEN_HEIGHT = Dimensions.get("window").height;
const RISK_ZONE_RADIUS = 150;
type MapMode = "vector" | "satellite";

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

// ─── Free, no-token tile providers ────────────────────────────────────────────
// OpenStreetMap standard tiles (vector-style raster) and Esri World Imagery
// (satellite raster). Both are free for reasonable usage without any API key.
const TILE_URLS = {
  vector: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  satellite:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
};
const TILE_ATTRIBUTION = {
  vector: "&copy; OpenStreetMap contributors",
  satellite: "Tiles &copy; Esri",
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

// ─── Leaflet HTML shell ───────────────────────────────────────────────────────
// This is loaded once into the WebView. All dynamic updates (markers, zones,
// mode, focus) are pushed in afterwards via injectJavaScript, so the map
// itself never reloads.
function buildMapHtml() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: ${C.bg}; }
    .leaflet-control-attribution { font-size: 9px; opacity: 0.6; }
    .mosquito-marker { font-size: 20px; text-align: center; line-height: 1; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', { zoomControl: false, attributionControl: true })
      .setView([${INITIAL_LOCATION.latitude}, ${INITIAL_LOCATION.longitude}], ${INITIAL_ZOOM});

    var tileLayers = {
      vector: L.tileLayer('${TILE_URLS.vector}', { maxZoom: 19, attribution: '${TILE_ATTRIBUTION.vector}' }),
      satellite: L.tileLayer('${TILE_URLS.satellite}', { maxZoom: 19, attribution: '${TILE_ATTRIBUTION.satellite}' })
    };
    var currentTileLayer = tileLayers.vector.addTo(map);

    var markersLayer = L.layerGroup().addTo(map);
    var zonesLayer = L.layerGroup().addTo(map);

    function post(msg) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(msg));
      }
    }

    function makeMarkerIcon(isCritical, isSelected) {
      var size = isSelected ? 40 : 32;
      var bg = isCritical ? '${C.danger}' : '${C.warning}';
      var opacity = isSelected ? 'CC' : '99';
      return L.divIcon({
        className: '',
        html: '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:' + (size / 2) +
          'px;background:' + bg + opacity + ';display:flex;align-items:center;justify-content:center;' +
          'border:' + (isSelected ? 2 : 1.5) + 'px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.4);">' +
          '<span class="mosquito-marker">🦟</span></div>',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
    }

    window.setMode = function(mode) {
      map.removeLayer(currentTileLayer);
      currentTileLayer = tileLayers[mode].addTo(map);
      currentTileLayer.bringToBack();
    };

    window.setMarkers = function(markersJson, selectedId) {
      var markers = JSON.parse(markersJson);
      markersLayer.clearLayers();
      markers.forEach(function(m) {
        var marker = L.marker([m.lat, m.lng], {
          icon: makeMarkerIcon(m.isCritical, m.id === selectedId)
        });
        marker.on('click', function() { post({ type: 'markerPress', id: m.id }); });
        marker.addTo(markersLayer);
      });
    };

    window.setZones = function(zonesJson) {
      var zones = JSON.parse(zonesJson);
      zonesLayer.clearLayers();
      zones.forEach(function(z) {
        L.circle([z.lat, z.lng], {
          radius: z.radius,
          color: z.isCritical ? '${C.danger}' : '${C.warning}',
          fillColor: z.isCritical ? '${C.danger}' : '${C.warning}',
          fillOpacity: 0.15,
          weight: 1.5,
          opacity: 0.6,
        }).addTo(zonesLayer);
      });
    };

    window.setZonesVisible = function(visible) {
      if (visible) { zonesLayer.addTo(map); } else { map.removeLayer(zonesLayer); }
    };

    window.setMarkersVisible = function(visible) {
      if (visible) { markersLayer.addTo(map); } else { map.removeLayer(markersLayer); }
    };

    window.focusOn = function(lat, lng, zoom) {
      map.setView([lat, lng], zoom || 16, { animate: true });
    };

    post({ type: 'ready' });
  </script>
</body>
</html>`;
}

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
      <Animated.View
        style={[bs.backdrop, { opacity: backdropAnim }]}
        pointerEvents={report ? "auto" : "none"}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[bs.sheet, { transform: [{ translateY: slideAnim }] }]}
        pointerEvents="box-none"
      >
        <View style={bs.handleWrap}>
          <View style={bs.handle} />
        </View>

        <View style={bs.header}>
          <View style={bs.headerLeft}>
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

        <View style={bs.locationRow}>
          <MapPin size={13} color={C.accent} strokeWidth={2.5} />
          <Text style={bs.locationText} numberOfLines={1}>
            {r.locationName}
          </Text>
        </View>

        <View style={bs.divider} />

        <ScrollView
          style={bs.scroll}
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          <Text style={bs.sectionLabel}>INCIDENT REPORT</Text>
          <Text style={bs.description}>{r.description}</Text>

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
  const webviewRef = useRef<WebView>(null);
  const [mapReady, setMapReady] = useState(false);

  const [mode, setMode] = useState<MapMode>("vector");
  const [showZones, setShowZones] = useState(true);
  const [showReports, setShowReports] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Partial<Report> | null>(
    null,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const allReports = useQuery(api.reports.getAllReports);

  const verifiedHotspots: Partial<Report>[] = useMemo(
    () =>
      allReports?.filter(
        (r: Report) => r.verified && r.status !== "Completed",
      ) ?? [],
    [allReports],
  );

  const riskZones: RiskZone[] = useMemo(
    () =>
      verifiedHotspots.map((r) => ({
        id: r._id as string,
        lat: r.lat!,
        lng: r.lng!,
        radius: RISK_ZONE_RADIUS,
        isCritical: r.status === "CRITICAL",
      })),
    [verifiedHotspots],
  );

  const params = useLocalSearchParams<{
    focusLat?: string;
    focusLng?: string;
    reportId?: string;
  }>();

  const html = useMemo(() => buildMapHtml(), []);

  // Push markers to the map whenever hotspots, visibility, or selection change
  useEffect(() => {
    if (!mapReady) return;
    const markersData = verifiedHotspots.map((r) => ({
      id: r._id as string,
      lat: r.lat,
      lng: r.lng,
      isCritical: r.status === "CRITICAL",
    }));
    webviewRef.current?.injectJavaScript(
      `window.setMarkers(${JSON.stringify(JSON.stringify(markersData))}, ${JSON.stringify(selectedId)}); true;`,
    );
  }, [mapReady, verifiedHotspots, selectedId]);

  // Push risk zones whenever they change
  useEffect(() => {
    if (!mapReady) return;
    webviewRef.current?.injectJavaScript(
      `window.setZones(${JSON.stringify(JSON.stringify(riskZones))}); true;`,
    );
  }, [mapReady, riskZones]);

  // Toggle layer visibility
  useEffect(() => {
    if (!mapReady) return;
    webviewRef.current?.injectJavaScript(
      `window.setMarkersVisible(${showReports}); true;`,
    );
  }, [mapReady, showReports]);

  useEffect(() => {
    if (!mapReady) return;
    webviewRef.current?.injectJavaScript(
      `window.setZonesVisible(${showZones}); true;`,
    );
  }, [mapReady, showZones]);

  // Switch tile provider
  useEffect(() => {
    if (!mapReady) return;
    webviewRef.current?.injectJavaScript(
      `window.setMode(${JSON.stringify(mode)}); true;`,
    );
  }, [mapReady, mode]);

  // Focus on specific location passed via route params
  useEffect(() => {
    if (!mapReady || !verifiedHotspots.length) return;
    if (!params.focusLat || !params.focusLng) return;
    const lat = parseFloat(params.focusLat);
    const lng = parseFloat(params.focusLng);
    if (isNaN(lat) || isNaN(lng)) return;

    webviewRef.current?.injectJavaScript(
      `window.focusOn(${lat}, ${lng}, 16); true;`,
    );

    if (params.reportId) {
      const matchedReport = verifiedHotspots.find(
        (r) => r._id === params.reportId,
      );
      if (matchedReport) {
        setSelectedReport(matchedReport);
        setSelectedId(matchedReport._id as string);
      }
    }
  }, [
    mapReady,
    verifiedHotspots,
    params.focusLat,
    params.focusLng,
    params.reportId,
  ]);

  const handleWebViewMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (msg.type === "ready") {
          setMapReady(true);
        } else if (msg.type === "markerPress") {
          const report = verifiedHotspots.find((r) => r._id === msg.id);
          if (report) {
            setSelectedReport(report);
            setSelectedId(report._id as string);
          }
        }
      } catch {
        // ignore malformed messages
      }
    },
    [verifiedHotspots],
  );

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

  const isLoading = allReports === undefined;

  return (
    <View style={styles.root}>
      <View style={styles.map}>
        <WebView
          ref={webviewRef}
          originWhitelist={["*"]}
          source={{ html }}
          onMessage={handleWebViewMessage}
          style={{ flex: 1, backgroundColor: C.bg }}
          javaScriptEnabled
          domStorageEnabled
        />
      </View>

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

        {(isLoading || !mapReady) && (
          <StatusOverlay
            message={isLoading ? "Loading hotspots…" : "Loading map…"}
          />
        )}
        {!isLoading && mapReady && verifiedHotspots.length === 0 && (
          <StatusOverlay message="No reports found yet" />
        )}
      </Animated.View>

      {/* Bottom sheet */}
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
  map: { flex: 1 },
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
