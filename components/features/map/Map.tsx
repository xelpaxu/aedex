import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapControls from "./MapControls";
import { PIN_DATA_URIS } from "./pinAssets";
import { useProfile } from "@/context/AccessContext";
import { hasTanodAccess } from "@/constants/access";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowRight,
  LocateFixed,
  MapPin,
  Navigation,
  X,
} from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { ThemeColors, useTheme } from "../../../context/ThemeContext";

// ─── Map data ─────────────────────────────────────────────────────────────────
const INITIAL_LOCATION = {
  latitude: 10.684,
  longitude: 122.513,
};
const INITIAL_ZOOM = 14;
const RISK_ZONE_RADIUS = 150;
type MapMode = "vector" | "satellite";

const TILE_URLS = {
  vector: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  satellite:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
};
const TILE_ATTRIBUTION = {
  vector: "&copy; OpenStreetMap contributors",
  satellite: "Tiles &copy; Esri",
};

type Report = Doc<"reports">;

interface RiskZone {
  id: string;
  lat: number;
  lng: number;
  radius: number;
  isCritical: boolean;
}

type TanodFilter = "ALL" | "ASSIGNED" | "CRITICAL" | "PENDING" | "RESOLVED";
type CommunityFilter = "ALL" | "CRITICAL" | "NEARBY" | "RESOLVED";
type MapExperience = "community" | "tanod";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const normalizeImageUri = (uri?: string) => {
  if (!uri) return "";
  if (uri.startsWith("data:") || uri.startsWith("http")) return uri;
  return `data:image/jpeg;base64,${uri}`;
};

const formatTimeAgo = (time?: number) => {
  if (!time) return "Recent";
  const diff = Date.now() - time;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

// ─── Clean Leaflet HTML shell with Compressed Pin Images & Pure Icons ─────────
function buildMapHtml(isTanodUser: boolean, C: ThemeColors) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: ${C.bg}; }
    .leaflet-bottom { bottom: 110px; }
    .leaflet-control-attribution { font-size: 8px; opacity: 0.5; }
    
    @keyframes bluePulse {
      0% { transform: scale(0.8); opacity: 0.9; }
      50% { transform: scale(1.6); opacity: 0.25; }
      100% { transform: scale(0.8); opacity: 0.9; }
    }
    @keyframes tanodPulse {
      0% { transform: scale(0.85); opacity: 0.8; }
      50% { transform: scale(1.4); opacity: 0.2; }
      100% { transform: scale(0.85); opacity: 0.8; }
    }
    @keyframes pinGlow {
      0% { transform: scale(0.92); opacity: 0.7; }
      50% { transform: scale(1.25); opacity: 0.15; }
      100% { transform: scale(0.92); opacity: 0.7; }
    }

    /* Citizen User Blue Dot (NO square container) */
    .user-blue-dot-box {
      position: relative;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .user-blue-dot-pulse {
      position: absolute;
      width: 32px;
      height: 32px;
      border-radius: 16px;
      background: rgba(0, 122, 255, 0.45);
      animation: bluePulse 2s infinite ease-in-out;
    }
    .user-blue-dot-core {
      width: 16px;
      height: 16px;
      border-radius: 8px;
      background: #007AFF;
      border: 2.5px solid #FFFFFF;
      box-shadow: 0 0 10px rgba(0, 122, 255, 0.8), 0 2px 4px rgba(0, 0, 0, 0.3);
      z-index: 2;
    }

    /* Tanod Officer Icon (NO square or circular container wrapper, just the pure icon) */
    .tanod-pure-icon-box {
      position: relative;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .tanod-pulse-glow {
      position: absolute;
      width: 36px;
      height: 36px;
      border-radius: 18px;
      background: ${C.accent}40;
      animation: tanodPulse 2s infinite ease-in-out;
    }
    .tanod-pure-svg {
      filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.55));
      z-index: 2;
    }

    /* Compressed Pin Markers */
    .compressed-pin-wrap {
      position: relative;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.18s ease;
    }
    .pin-selected {
      transform: scale(1.22);
      z-index: 1000 !important;
    }
    .pin-glow-ring {
      position: absolute;
      width: 40px;
      height: 40px;
      border-radius: 20px;
      animation: pinGlow 1.8s infinite ease-in-out;
    }
    .compressed-pin-img {
      width: 40px;
      height: 40px;
      object-fit: contain;
      filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.35));
      z-index: 2;
    }
    .pin-stack-badge {
      position: absolute;
      top: -2px;
      right: -2px;
      background: #FFFFFF;
      color: #0B0E14;
      font-size: 9px;
      font-weight: 800;
      border-radius: 8px;
      padding: 1px 4px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.4);
      z-index: 4;
    }
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

    var userMarker = null;
    var markersLayer = L.layerGroup().addTo(map);
    var zonesLayer = L.layerGroup().addTo(map);

    var PIN_IMAGES = {
      critical: '${PIN_DATA_URIS.critical}',
      moderate: '${PIN_DATA_URIS.moderate}',
      safe: '${PIN_DATA_URIS.safe}'
    };

    function post(data) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
    }

    window.setUserLocation = function(lat, lng, isTanod) {
      if (userMarker) {
        map.removeLayer(userMarker);
      }
      var html = isTanod
        ? '<div class="tanod-pure-icon-box">' +
            '<div class="tanod-pulse-glow"></div>' +
            '<svg class="tanod-pure-svg" width="34" height="34" viewBox="0 0 24 24" fill="none">' +
              '<path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" fill="${C.accent}" stroke="#FFFFFF" stroke-width="1.8" stroke-linejoin="round"/>' +
              '<path d="M12 6.5l1.3 2.64 2.91.42-2.11 2.05.5 2.9-2.6-1.37-2.6 1.37.5-2.9-2.11-2.05 2.91-.42L12 6.5z" fill="#FFFFFF"/>' +
            '</svg>' +
          '</div>'
        : '<div class="user-blue-dot-box">' +
            '<div class="user-blue-dot-pulse"></div>' +
            '<div class="user-blue-dot-core"></div>' +
          '</div>';

      var icon = L.divIcon({
        className: '',
        html: html,
        iconSize: isTanod ? [36, 36] : [32, 32],
        iconAnchor: isTanod ? [18, 18] : [16, 16]
      });

      userMarker = L.marker([lat, lng], { icon: icon, zIndexOffset: 1000 }).addTo(map);
    };

    window.focusOn = function(lat, lng, zoom) {
      map.flyTo([lat, lng], zoom || 16, { animate: true, duration: 1.2 });
    };

    window.setMode = function(mode) {
      map.removeLayer(currentTileLayer);
      currentTileLayer = tileLayers[mode] || tileLayers.vector;
      currentTileLayer.addTo(map);
    };

    window.setMarkers = function(itemsJson, selectedId) {
      markersLayer.clearLayers();
      var items = JSON.parse(itemsJson);
      items.forEach(function(item) {
        var isSelected = item.id === selectedId;
        var pinSrc = item.isCritical ? PIN_IMAGES.critical : item.isResolved ? PIN_IMAGES.safe : PIN_IMAGES.moderate;
        var glowColor = item.isCritical ? '${C.danger}60' : item.isResolved ? '${C.safe}50' : '${C.warn}50';

        var html = '<div class="compressed-pin-wrap' + (isSelected ? ' pin-selected' : '') + '">' +
          (item.isCritical || isSelected ? '<div class="pin-glow-ring" style="background:' + glowColor + ';"></div>' : '') +
          '<img class="compressed-pin-img" src="' + pinSrc + '" alt="pin" />' +
          (item.stackCount && item.stackCount > 1 ? '<div class="pin-stack-badge" style="border:1px solid ' + (item.isCritical ? '${C.danger}' : item.isResolved ? '${C.safe}' : '${C.warn}') + ';">' + item.stackIndex + '/' + item.stackCount + '</div>' : '') +
        '</div>';

        var icon = L.divIcon({
          className: '',
          html: html,
          iconSize: [44, 44],
          iconAnchor: [22, 38]
        });

        var m = L.marker([item.lat, item.lng], { icon: icon, zIndexOffset: isSelected ? 500 : 10 });
        m.on('click', function() {
          post({ type: 'markerPress', id: item.id });
        });
        markersLayer.addLayer(m);
      });
    };

    window.setZones = function(zonesJson) {
      zonesLayer.clearLayers();
      var zones = JSON.parse(zonesJson);
      zones.forEach(function(z) {
        var circle = L.circle([z.lat, z.lng], {
          radius: z.radius,
          color: z.isCritical ? '${C.danger}' : '${C.warn}',
          fillColor: z.isCritical ? '${C.danger}' : '${C.warn}',
          fillOpacity: 0.18,
          weight: 1.5
        });
        zonesLayer.addLayer(circle);
      });
    };

    window.setMarkersVisible = function(visible) {
      if (visible) { map.addLayer(markersLayer); } else { map.removeLayer(markersLayer); }
    };

    window.setZonesVisible = function(visible) {
      if (visible) { map.addLayer(zonesLayer); } else { map.removeLayer(zonesLayer); }
    };

    post({ type: 'ready' });
  </script>
</body>
</html>`;
}

// ─── Top Mode Toggle Switch ───────────────────────────────────────────────────
const FloatBtn = ({
  icon: Icon,
  active,
  color,
  onPress,
  badgeCount,
  accessibilityLabel,
  C,
}: {
  icon: React.ComponentType<any>;
  active?: boolean;
  color?: string;
  onPress: () => void;
  badgeCount?: number;
  accessibilityLabel: string;
  C: ThemeColors;
}) => (
  <TouchableOpacity
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    accessibilityState={{ selected: active }}
    style={[
      float.btn,
      {
        backgroundColor: C.surface,
        borderColor: active ? (color || C.accent) + "80" : C.border,
        shadowColor: active ? color || C.accent : "#000",
      },
    ]}
    activeOpacity={0.8}
  >
    <Icon
      color={active ? color || C.accent : C.textDim}
      size={18}
      strokeWidth={active ? 2.5 : 2}
    />
    {badgeCount !== undefined && badgeCount > 0 ? (
      <View style={[float.badge, { backgroundColor: color || C.accent }]}>
        <Text style={float.badgeText}>{badgeCount}</Text>
      </View>
    ) : null}
  </TouchableOpacity>
);

const float = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 17,
    height: 17,
    borderRadius: 8.5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});

// ─── Enhanced Report Bottom Sheet / Snackbar ───────────────────────────────────
const ReportBottomSheet = ({
  report,
  userPos,
  isTanod,
  onClose,
  onViewFullReport,
  onFocusLocation,
  C,
}: {
  report: Partial<Report> | null;
  userPos: { lat: number; lng: number };
  isTanod: boolean;
  onClose: () => void;
  onViewFullReport?: () => void;
  onFocusLocation?: (lat: number, lng: number) => void;
  C: ThemeColors;
}) => {
  const slideAnim = useRef(new Animated.Value(450)).current;

  useEffect(() => {
    if (report) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 85,
        friction: 12,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 450,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [report, slideAnim]);

  if (!report) return null;

  const isCritical =
    report.status === "CRITICAL" ||
    report.status === "HIGH RISK" ||
    report.riskLevel === "CRITICAL" ||
    report.riskLevel === "HIGH RISK";
  const isResolved =
    report.status === "Resolved" || report.status === "Completed";
  const badgeColor = isResolved ? C.safe : isCritical ? C.danger : C.warn;
  const badgeGlow = isResolved
    ? C.safeGlow
    : isCritical
      ? C.dangerGlow
      : C.warnGlow;

  const distanceKm =
    report.lat != null && report.lng != null
      ? calculateDistanceKm(userPos.lat, userPos.lng, report.lat, report.lng)
      : null;

  const distanceText =
    distanceKm !== null
      ? distanceKm < 1
        ? `${Math.round(distanceKm * 1000)}m away`
        : `${distanceKm.toFixed(1)} km away`
      : null;

  const imageUri = normalizeImageUri(report.processedImage || report.imageUri);

  return (
    <View style={sheet.snackbarHost} pointerEvents="box-none">
      <Animated.View
        style={[
          sheet.card,
          {
            backgroundColor: C.surface,
            borderColor: C.border,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={{ width: 56, height: 64, borderRadius: 12 }}
            />
          ) : (
            <View
              style={{
                width: 56,
                height: 64,
                borderRadius: 12,
                backgroundColor: badgeGlow,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MapPin size={24} color={badgeColor} />
            </View>
          )}
          <View style={{ flex: 1, gap: 5 }}>
            <Text
              style={{ color: badgeColor, fontSize: 11, fontWeight: "700" }}
            >
              {isResolved
                ? "Resolved"
                : isCritical
                  ? "Critical risk"
                  : "Reported site"}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                color: C.text,
                fontFamily: "Inter_600SemiBold",
                fontSize: 15,
              }}
            >
              {report.locationName || "Reported vector site"}
            </Text>
            <Text numberOfLines={1} style={{ color: C.textSub, fontSize: 12 }}>
              {formatTimeAgo(report._creationTime)}
              {distanceText ? ` / ${distanceText}` : ""}
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close report preview"
            onPress={onClose}
            style={{ padding: 12, alignSelf: "flex-start" }}
          >
            <X color={C.textSub} size={20} />
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={onViewFullReport}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: 12,
              backgroundColor: C.accent,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>
              {isTanod ? "Review report" : "View report"}
            </Text>
            <ArrowRight color="#fff" size={16} />
          </TouchableOpacity>
          {report.lat != null && report.lng != null && onFocusLocation && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Center on this report"
              onPress={() => onFocusLocation(report.lat!, report.lng!)}
              style={{
                width: 44,
                minHeight: 44,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: C.surfaceRaised,
              }}
            >
              <Navigation color={C.accent} size={18} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </View>
  );
};

const sheet = StyleSheet.create({
  snackbarHost: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    paddingHorizontal: 12,
  },
  card: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
});

export default function MapComponent({
  experience,
}: {
  experience: MapExperience;
}) {
  const router = useRouter();
  const { colors: C } = useTheme();
  const params = useLocalSearchParams<{
    focusLat?: string;
    focusLng?: string;
    reportId?: string;
  }>();

  const webviewRef = useRef<WebView>(null);
  const [mapReady, setMapReady] = useState(false);

  const [mode, setMode] = useState<MapMode>("vector");
  const [showZones, setShowZones] = useState(true);
  const [showReports, setShowReports] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  // Filters for Tanod and Community
  const [tanodFilter, setTanodFilter] = useState<TanodFilter>("ASSIGNED");
  const [communityFilter, setCommunityFilter] =
    useState<CommunityFilter>("ALL");

  const [selectedReport, setSelectedReport] = useState<Partial<Report> | null>(
    null,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // GPS User Location
  const [userPos, setUserPos] = useState<{ lat: number; lng: number }>({
    lat: INITIAL_LOCATION.latitude,
    lng: INITIAL_LOCATION.longitude,
  });

  const profile = useProfile();
  const isTanod = experience === "tanod" && hasTanodAccess(profile);
  const tanodAssignments = useQuery(
    api.assignments.getAssignmentsForTanod,
    isTanod ? {} : "skip",
  );
  const allReports = useQuery(api.reports.getAllReports);

  const html = useMemo(() => buildMapHtml(isTanod, C), [isTanod, C]);

  // High-accuracy native phone GPS fetching using expo-location
  const fetchNativeGpsLocation = useCallback(
    async (recenter = true) => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Highest,
          });
          const coords = {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
          };
          setUserPos(coords);

          if (mapReady) {
            webviewRef.current?.injectJavaScript(
              `window.setUserLocation(${coords.lat}, ${coords.lng}, ${isTanod}); ${
                recenter
                  ? `window.focusOn(${coords.lat}, ${coords.lng}, 16);`
                  : ""
              } true;`,
            );
          }
        }
      } catch (err) {
        console.log("Error getting native phone GPS location:", err);
      }
    },
    [mapReady, isTanod],
  );

  useEffect(() => {
    if (mapReady) {
      fetchNativeGpsLocation(true);
    }
  }, [mapReady, fetchNativeGpsLocation]);

  const assignedReportIds = useMemo(() => {
    return new Set(
      tanodAssignments?.map((a: any) => a.reportId as string) ?? [],
    );
  }, [tanodAssignments]);

  // Calculate filtered hotspots with radial offset for stacked/overlapping reports
  const verifiedHotspots: (Partial<Report> & {
    stackCount?: number;
    stackIndex?: number;
  })[] = useMemo(() => {
    if (!allReports) return [];

    const baseList = allReports.filter((r: Report) => {
      if (!r.lat || !r.lng) return false;

      // Only show verified hotspots on the community & tanod map
      if (!r.verified) return false;

      if (isTanod) {
        if (tanodFilter === "ASSIGNED") {
          return assignedReportIds.has(r._id);
        }
        if (tanodFilter === "CRITICAL") {
          return r.status === "CRITICAL" || r.status === "HIGH RISK";
        }
        if (tanodFilter === "PENDING") {
          return r.status !== "Resolved" && r.status !== "Completed";
        }
        if (tanodFilter === "RESOLVED") {
          return r.status === "Resolved" || r.status === "Completed";
        }
        return true; // ALL
      } else {
        if (communityFilter === "CRITICAL") {
          return r.status === "CRITICAL" || r.status === "HIGH RISK";
        }
        if (communityFilter === "NEARBY") {
          const dist = calculateDistanceKm(
            userPos.lat,
            userPos.lng,
            r.lat,
            r.lng,
          );
          return dist <= 1.5;
        }
        if (communityFilter === "RESOLVED") {
          return r.status === "Resolved" || r.status === "Completed";
        }
        return true; // ALL
      }
    });

    // Group items by rounded coordinates (approx 15-20 meters)
    const coordGroups: Record<string, Report[]> = {};
    baseList.forEach((r: Report) => {
      const key = `${r.lat!.toFixed(4)}_${r.lng!.toFixed(4)}`;
      if (!coordGroups[key]) coordGroups[key] = [];
      coordGroups[key].push(r);
    });

    // Apply radial offsets for stacked reports so they fan out visibly
    return baseList.map((r: Report) => {
      const key = `${r.lat!.toFixed(4)}_${r.lng!.toFixed(4)}`;
      const group = coordGroups[key];
      if (group && group.length > 1) {
        const index = group.findIndex((item) => item._id === r._id);
        const total = group.length;
        const angle = (2 * Math.PI * index) / total;
        const radius = 0.00025; // ~27 meters radial spread
        const offsetLat = r.lat! + radius * Math.cos(angle);
        const latRad = (r.lat! * Math.PI) / 180;
        const offsetLng =
          r.lng! + (radius * Math.sin(angle)) / Math.cos(latRad);
        return {
          ...r,
          lat: offsetLat,
          lng: offsetLng,
          stackCount: total,
          stackIndex: index + 1,
        };
      }
      return r;
    });
  }, [
    allReports,
    isTanod,
    tanodFilter,
    communityFilter,
    assignedReportIds,
    userPos,
  ]);

  // Compute category counts for badges
  const filterCounts = useMemo(() => {
    if (!allReports)
      return {
        all: 0,
        assigned: 0,
        critical: 0,
        pending: 0,
        resolved: 0,
        nearby: 0,
      };

    const verified = allReports.filter(
      (r: Report) => r.verified && r.lat && r.lng,
    );

    return {
      all: verified.length,
      assigned: verified.filter((r: Report) => assignedReportIds.has(r._id))
        .length,
      critical: verified.filter(
        (r: Report) => r.status === "CRITICAL" || r.status === "HIGH RISK",
      ).length,
      pending: verified.filter(
        (r: Report) => r.status !== "Resolved" && r.status !== "Completed",
      ).length,
      resolved: verified.filter(
        (r: Report) => r.status === "Resolved" || r.status === "Completed",
      ).length,
      nearby: verified.filter((r: Report) => {
        const dist = calculateDistanceKm(
          userPos.lat,
          userPos.lng,
          r.lat!,
          r.lng!,
        );
        return dist <= 1.5;
      }).length,
    };
  }, [allReports, assignedReportIds, userPos]);

  const riskZones: RiskZone[] = useMemo(() => {
    return verifiedHotspots.map((r) => ({
      id: `zone-${r._id}`,
      lat: r.lat!,
      lng: r.lng!,
      radius: RISK_ZONE_RADIUS,
      isCritical: r.status === "CRITICAL" || r.status === "HIGH RISK",
    }));
  }, [verifiedHotspots]);

  // Sync user location marker in Leaflet
  useEffect(() => {
    if (!mapReady) return;
    webviewRef.current?.injectJavaScript(
      `window.setUserLocation(${userPos.lat}, ${userPos.lng}, ${isTanod}); true;`,
    );
  }, [mapReady, userPos.lat, userPos.lng, isTanod]);

  // Sync markers with stack metadata
  useEffect(() => {
    if (!mapReady) return;
    const simplified = verifiedHotspots.map((r) => ({
      id: r._id,
      lat: r.lat,
      lng: r.lng,
      isCritical: r.status === "CRITICAL" || r.status === "HIGH RISK",
      isResolved: r.status === "Resolved" || r.status === "Completed",
      stackCount: r.stackCount,
      stackIndex: r.stackIndex,
    }));
    webviewRef.current?.injectJavaScript(
      `window.setMarkers(${JSON.stringify(
        JSON.stringify(simplified),
      )}, ${JSON.stringify(selectedId)}); true;`,
    );
  }, [mapReady, verifiedHotspots, selectedId]);

  // Sync zones
  useEffect(() => {
    if (!mapReady) return;
    webviewRef.current?.injectJavaScript(
      `window.setZones(${JSON.stringify(JSON.stringify(riskZones))}); true;`,
    );
  }, [mapReady, riskZones]);

  // Layer toggles
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

  // Mode tile switch
  useEffect(() => {
    if (!mapReady) return;
    webviewRef.current?.injectJavaScript(
      `window.setMode(${JSON.stringify(mode)}); true;`,
    );
  }, [mapReady, mode]);

  // Focus location
  useEffect(() => {
    if (!mapReady) return;

    if (params.focusLat && params.focusLng) {
      const lat = parseFloat(params.focusLat);
      const lng = parseFloat(params.focusLng);
      if (!isNaN(lat) && !isNaN(lng)) {
        webviewRef.current?.injectJavaScript(
          `window.focusOn(${lat}, ${lng}, 16); true;`,
        );
      }
    }

    if (params.reportId && verifiedHotspots.length > 0) {
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
    params.focusLat,
    params.focusLng,
    params.reportId,
    verifiedHotspots,
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
        } else if (msg.type === "locationFound") {
          setUserPos({ lat: msg.lat, lng: msg.lng });
        }
      } catch {
        // ignore
      }
    },
    [verifiedHotspots],
  );

  const handleClose = useCallback(() => {
    setSelectedReport(null);
    setSelectedId(null);
  }, []);

  const handleFocusLocation = useCallback((lat: number, lng: number) => {
    webviewRef.current?.injectJavaScript(
      `window.focusOn(${lat}, ${lng}, 17); true;`,
    );
  }, []);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const isLoading = allReports === undefined;
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(C), [C]);

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

      <Animated.View
        pointerEvents="box-none"
        style={[styles.overlays, { opacity: fadeAnim }]}
      >
        {/* ── TOP CONTROL STACK ── */}
        <View pointerEvents="box-none" style={styles.topControlContainer}>
          <MapControls
            tanod={isTanod}
            barangay={isTanod ? profile?.assignedBarangay : profile?.barangay}
            filter={isTanod ? tanodFilter : communityFilter}
            onFilter={(value) =>
              isTanod
                ? setTanodFilter(value as TanodFilter)
                : setCommunityFilter(value as CommunityFilter)
            }
            counts={filterCounts}
            mode={mode}
            onMode={setMode}
            zones={showZones}
            onZones={setShowZones}
            pins={showReports}
            onPins={setShowReports}
            expanded={isExpanded}
            onExpand={() => setIsExpanded((value) => !value)}
          />
        </View>

        {/* ── RIGHT FLOATING CONTROLS ── */}
        <View
          style={[
            styles.rightPanel,
            { top: isExpanded ? 78 : 130, bottom: undefined },
          ]}
        >
          <FloatBtn
            icon={LocateFixed}
            accessibilityLabel="Center map on my location"
            active={true}
            color={C.accent}
            C={C}
            onPress={() => {
              fetchNativeGpsLocation(true);
            }}
          />
        </View>

        {/* ── BOTTOM MAP LEGEND (Hidden when report detail sheet is active or in expanded mode) ── */}
        {!selectedReport && !isExpanded && (
          <View
            style={[
              styles.legend,
              { bottom: 86 + Math.max(insets.bottom, 12) },
            ]}
          >
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: C.danger }]} />
              <Text style={styles.legendText}>Critical</Text>
            </View>
            <View style={styles.legendDivider} />
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: C.warn }]} />
              <Text style={styles.legendText}>Moderate</Text>
            </View>
            <View style={styles.legendDivider} />
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: C.safe }]} />
              <Text style={styles.legendText}>Resolved</Text>
            </View>
          </View>
        )}

        {(isLoading || !mapReady) && (
          <View
            style={[styles.statusOverlayBox, { top: isExpanded ? 80 : 132 }]}
          >
            <ActivityIndicator size="small" color={C.accent} />
            <Text style={styles.statusOverlayText}>
              {isLoading ? "Loading surveillance data…" : "Loading map…"}
            </Text>
          </View>
        )}
        {!isLoading && mapReady && verifiedHotspots.length === 0 && (
          <View
            style={[styles.statusOverlayBox, { top: isExpanded ? 80 : 132 }]}
          >
            <Text style={styles.statusOverlayText}>
              No reports matching current filter
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Enhanced Bottom sheet / Snackbar for report detail */}
      <View
        pointerEvents="box-none"
        style={[
          StyleSheet.absoluteFillObject,
          { bottom: 86 + Math.max(insets.bottom, 12) },
        ]}
      >
        <ReportBottomSheet
          report={selectedReport}
          userPos={userPos}
          isTanod={isTanod ?? false}
          onClose={handleClose}
          onFocusLocation={handleFocusLocation}
          C={C}
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
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const createStyles = (C: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    map: { flex: 1 },
    overlays: {
      ...(StyleSheet.absoluteFillObject as any),
    },

    // Top Control Container
    topControlContainer: {
      position: "absolute",
      top: 10,
      left: 12,
      right: 12,
      gap: 8,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    topRowRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    expandToggleBtn: {
      width: 36,
      height: 36,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
    },

    // Field Navigation Expanded Header
    expandedHeaderCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 16,
      borderWidth: 1,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 6,
    },
    expandedHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    fieldModeBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingVertical: 5,
      paddingHorizontal: 8,
      borderRadius: 10,
      borderWidth: 1,
    },
    fieldModeBadgeText: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.4,
    },
    collapseBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 10,
      borderWidth: 1,
    },
    collapseBtnText: {
      fontSize: 11,
      fontWeight: "700",
    },

    filterRowWrapper: {
      flexDirection: "row",
      alignItems: "center",
    },
    filterPillScroll: {
      gap: 7,
      alignItems: "center",
      paddingRight: 10,
    },

    // Floating controls positioned safely above bottom tab bar
    rightPanel: {
      position: "absolute",
      right: 14,
      bottom: 20,
      gap: 8,
    },
    legend: {
      position: "absolute",
      bottom: 20,
      left: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      backgroundColor: C.surface + "F2",
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 14,
      paddingVertical: 7,
      paddingHorizontal: 11,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 4,
    },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendSwatch: {
      width: 8,
      height: 8,
      borderRadius: 4,
      borderWidth: 1.5,
    },
    legendText: { fontSize: 11, fontWeight: "700", color: C.textSub },
    legendDivider: {
      width: 1,
      height: 12,
      backgroundColor: C.border,
      opacity: 0.8,
    },

    // Status overlay
    statusOverlayBox: {
      position: "absolute",
      left: 12,
      maxWidth: "75%",
      top: 280,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: C.surface + "F0",
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 20,
      paddingVertical: 6,
      paddingHorizontal: 14,
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
    },
    statusOverlayText: {
      fontSize: 11,
      fontWeight: "700",
      color: C.textSub,
      letterSpacing: 0.3,
    },
  });
