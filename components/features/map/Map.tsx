import { useQuery } from "convex/react";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Flame,
  Globe,
  Layers,
  LocateFixed,
  Map,
  MapPin,
  Navigation,
  Satellite,
  Shield,
  ShieldCheck,
  ScanLine,
  User,
  Users,
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
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { api } from "../../../../convex/_generated/api";
import { Doc } from "../../../../convex/_generated/dataModel";
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

import { PIN_DATA_URIS } from "./pinAssets";

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

// ─── Top Mode Pill Button ─────────────────────────────────────────────────────
const ModePillBtn = ({
  onPress,
  active,
  icon: Icon,
  label,
  C,
}: {
  onPress: () => void;
  active?: boolean;
  icon: React.ComponentType<any>;
  label: string;
  C: ThemeColors;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={`${label} map style`}
    accessibilityState={{ selected: active }}
    style={[
      modeStyles.btn,
      active && [
        modeStyles.btnActive,
        { backgroundColor: C.accent, shadowColor: "#000000" },
      ],
    ]}
  >
    <Icon
      color={active ? "#FFFFFF" : C.textSub}
      size={12}
      strokeWidth={active ? 2.5 : 2}
    />
    <Text
      style={[
        modeStyles.text,
        { color: C.textSub },
        active && modeStyles.textActive,
      ]}
    >
      {label}
    </Text>
  </Pressable>
);

const modeStyles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  btnActive: {
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  text: { fontSize: 11, fontWeight: "700" },
  textActive: { color: "#FFFFFF", fontWeight: "700" },
});

// ─── Filter Pill Button ───────────────────────────────────────────────────────
const FilterPill = ({
  icon: Icon,
  label,
  count,
  active,
  onPress,
  accentColor,
  C,
}: {
  icon: React.ComponentType<any>;
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
  accentColor?: string;
  C: ThemeColors;
}) => {
  const color = accentColor || C.accent;
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${count} reports`}
      accessibilityState={{ selected: active }}
      activeOpacity={0.75}
      style={[
        filterStyles.pill,
        {
          backgroundColor: active ? color : C.surface,
          borderColor: active ? color : C.border,
          shadowColor: active ? color : "transparent",
        },
        active && filterStyles.pillActiveShadow,
      ]}
    >
      <Icon
        size={12}
        color={active ? "#FFFFFF" : color}
        strokeWidth={active ? 2.5 : 2}
      />
      <Text
        style={[
          filterStyles.label,
          { color: active ? "#FFFFFF" : C.text },
          active && filterStyles.labelActive,
        ]}
      >
        {label}
      </Text>
      <View
        style={[
          filterStyles.countBadge,
          {
            backgroundColor: active
              ? "rgba(255,255,255,0.25)"
              : C.surfaceRaised,
          },
        ]}
      >
        <Text
          style={[
            filterStyles.countText,
            { color: active ? "#FFFFFF" : C.textSub },
          ]}
        >
          {count}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const filterStyles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillActiveShadow: {
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  labelActive: {
    fontWeight: "700",
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    fontSize: 11,
    fontWeight: "700",
  },
});

// ─── Floating Action Button ───────────────────────────────────────────────────
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
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
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
  }, [report]);

  if (!report) return null;

  const isCritical =
    report.status === "CRITICAL" || report.status === "HIGH RISK";
  const isResolved =
    report.status === "Resolved" || report.status === "Completed";
  const badgeColor = isResolved ? C.safe : isCritical ? C.danger : C.warn;
  const badgeGlow = isResolved
    ? C.safeGlow
    : isCritical
      ? C.dangerGlow
      : C.warnGlow;

  const distanceKm =
    report.lat && report.lng
      ? calculateDistanceKm(userPos.lat, userPos.lng, report.lat, report.lng)
      : null;

  const distanceText =
    distanceKm !== null
      ? distanceKm < 1
        ? `${Math.round(distanceKm * 1000)}m away`
        : `${distanceKm.toFixed(1)} km away`
      : null;

  const imageUri = normalizeImageUri(
    report.processedImage || report.imageUri,
  );

  const rawAccuracy = report.accuracy ?? "0";
  const accuracyNum =
    Number(rawAccuracy) <= 1 ? Number(rawAccuracy) * 100 : Number(rawAccuracy);
  const accuracyText =
    typeof rawAccuracy === "string" && rawAccuracy.includes("%")
      ? rawAccuracy
      : accuracyNum > 0
        ? `${accuracyNum.toFixed(1)}%`
        : "AI Verified";

  return (
    <View style={sheet.snackbarHost} pointerEvents="box-none">
        <Animated.View
          accessibilityViewIsModal={false}
          accessibilityLabel="Selected mosquito risk report"
          style={[
            sheet.card,
            {
              backgroundColor: C.surface,
              borderColor: C.border,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View>
            {/* Grab Handle */}
            <View style={[sheet.handle, { backgroundColor: C.border }]} />

            {/* Header: Badges & Close Button */}
            <View style={sheet.header}>
              <View style={sheet.badgeGroup}>
                {/* Risk Level Badge */}
                <View
                  style={[
                    sheet.badge,
                    {
                      backgroundColor: badgeGlow,
                      borderColor: badgeColor + "40",
                    },
                  ]}
                >
                  <View
                    style={[
                      sheet.badgeDot,
                      {
                        backgroundColor: badgeColor,
                        shadowColor: badgeColor,
                      },
                    ]}
                  />
                  <Text style={[sheet.badgeText, { color: badgeColor }]}>
                    {report.status || "ACTIVE THREAT"}
                  </Text>
                </View>

                {/* Verification Badge */}
                <View
                  style={[
                    sheet.verifiedBadge,
                    {
                      backgroundColor: report.verified
                        ? C.safeGlow
                        : C.accentGlow,
                      borderColor:
                        (report.verified ? C.safe : C.accent) + "40",
                    },
                  ]}
                >
                  <ShieldCheck
                    color={report.verified ? C.safe : C.accent}
                    size={11}
                    strokeWidth={2.5}
                  />
                  <Text
                    style={[
                      sheet.verifiedBadgeText,
                      { color: report.verified ? C.safe : C.accent },
                    ]}
                  >
                    {report.verified ? "VERIFIED" : "COMMUNITY"}
                  </Text>
                </View>

                {/* Distance Badge */}
                {distanceText && (
                  <View
                    style={[
                      sheet.distanceBadge,
                      {
                        backgroundColor: C.surfaceRaised,
                        borderColor: C.border,
                      },
                    ]}
                  >
                    <Navigation color={C.accent} size={10} strokeWidth={2.5} />
                    <Text
                      style={[sheet.distanceBadgeText, { color: C.textSub }]}
                    >
                      {distanceText}
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close selected report"
                style={[
                  sheet.closeBtn,
                  { backgroundColor: C.surfaceRaised, borderColor: C.border },
                ]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X color={C.textSub} size={15} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Main Content Area: Evidence Photo Thumbnail + Title & Submitter */}
            <View style={sheet.mainRow}>
              {/* Evidence Photo Preview */}
              <TouchableOpacity
                onPress={onViewFullReport}
                activeOpacity={0.85}
                style={[
                  sheet.thumbWrapper,
                  {
                    backgroundColor: C.surfaceRaised,
                    borderColor: C.border,
                  },
                ]}
              >
                {imageUri ? (
                  <Image
                    source={{ uri: imageUri }}
                    style={sheet.thumbImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={sheet.thumbPlaceholder}>
                    <AlertTriangle color={badgeColor} size={22} />
                  </View>
                )}
                <View
                  style={[
                    sheet.thumbBadge,
                    {
                      backgroundColor: C.surface + "D9",
                    },
                  ]}
                >
                  <Text style={[sheet.thumbBadgeText, { color: C.accent }]}>
                    {report.processedImage ? "AI MASK" : "PHOTO"}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Location Name, Submitter, Timestamp */}
              <View style={sheet.mainInfo}>
                <Text
                  style={[sheet.locationTitle, { color: C.text }]}
                  numberOfLines={2}
                >
                  {report.locationName || "Reported Vector Site"}
                </Text>

                <View style={sheet.reporterRow}>
                  <User color={C.textDim} size={11} strokeWidth={2} />
                  <Text
                    style={[sheet.reporterText, { color: C.textSub }]}
                    numberOfLines={1}
                  >
                    By {report.userName || "Community Scout"}
                  </Text>
                </View>

                <View style={sheet.metaRow}>
                  <Clock color={C.textDim} size={11} strokeWidth={2} />
                  <Text style={[sheet.metaText, { color: C.textDim }]}>
                    {formatTimeAgo(report._creationTime)}
                  </Text>
                  <View
                    style={[sheet.metaDot, { backgroundColor: C.border }]}
                  />
                  <MapPin color={C.textDim} size={11} strokeWidth={2} />
                  <Text style={[sheet.metaText, { color: C.textDim }]}>
                    {report.lat?.toFixed(4)}, {report.lng?.toFixed(4)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Surveillance Metrics Strip */}
            <View
              style={[
                sheet.metricsRow,
                {
                  backgroundColor: C.surfaceRaised,
                  borderColor: C.border,
                },
              ]}
            >
              <View style={sheet.metricBox}>
                <View style={sheet.metricIconWrap}>
                  <ScanLine color={C.gold} size={12} strokeWidth={2.5} />
                  <Text style={[sheet.metricValue, { color: C.text }]}>
                    {accuracyText}
                  </Text>
                </View>
                <Text style={[sheet.metricLabel, { color: C.textSub }]}>
                  AI confidence
                </Text>
              </View>

              <View
                style={[sheet.metricDivider, { backgroundColor: C.border }]}
              />

              <View style={sheet.metricBox}>
                <View style={sheet.metricIconWrap}>
                  <Shield color={badgeColor} size={12} strokeWidth={2.5} />
                  <Text style={[sheet.metricValue, { color: badgeColor }]}>
                    150m
                  </Text>
                </View>
                <Text style={[sheet.metricLabel, { color: C.textSub }]}>
                  Threat radius
                </Text>
              </View>

              <View
                style={[sheet.metricDivider, { backgroundColor: C.border }]}
              />

              <View style={sheet.metricBox}>
                <View style={sheet.metricIconWrap}>
                  {isResolved ? (
                    <CheckCircle2 color={C.safe} size={12} strokeWidth={2.5} />
                  ) : (
                    <Flame color={badgeColor} size={12} strokeWidth={2.5} />
                  )}
                  <Text
                    style={[
                      sheet.metricValue,
                      { color: isResolved ? C.safe : badgeColor },
                    ]}
                  >
                    {isResolved
                      ? "TREATED"
                      : isCritical
                        ? "HIGH RISK"
                        : "MONITOR"}
                  </Text>
                </View>
                <Text style={[sheet.metricLabel, { color: C.textSub }]}>
                  Status
                </Text>
              </View>
            </View>

            {/* AI Diagnostics Callout */}
            {report.reasoning ? (
              <View
                style={[
                  sheet.aiCallout,
                  {
                    backgroundColor: C.surfaceRaised,
                    borderColor: C.border,
                  },
                ]}
              >
                <View style={sheet.aiCalloutHeader}>
                  <ScanLine color={C.gold} size={11} strokeWidth={2.5} />
                  <Text style={[sheet.aiCalloutTitle, { color: C.gold }]}>
                    AI vector diagnostics
                  </Text>
                </View>
                <Text
                  style={[sheet.aiCalloutText, { color: C.textSub }]}
                  numberOfLines={2}
                >
                  {report.reasoning}
                </Text>
              </View>
            ) : null}

            {/* Action Buttons */}
            <View style={sheet.actions}>
              {/* Primary View Report Button */}
              <TouchableOpacity
                style={[
                  sheet.actionBtn,
                  sheet.actionBtnPrimary,
                  {
                    backgroundColor: isCritical ? C.danger : C.accent,
                    shadowColor: isCritical ? C.danger : C.accent,
                  },
                ]}
                onPress={onViewFullReport}
                activeOpacity={0.8}
              >
                <ScanLine color="#FFFFFF" size={14} strokeWidth={2.5} />
                <Text style={sheet.actionBtnPrimaryText}>
                  {isTanod
                    ? "INSPECT & ACTION REPORT"
                    : "VIEW FULL REPORT & SCAN"}
                </Text>
                <ArrowRight color="#FFFFFF" size={14} strokeWidth={2.5} />
              </TouchableOpacity>

              {/* Fly/Focus Map Location Button */}
              {report.lat && report.lng && onFocusLocation && (
                <TouchableOpacity
                  style={[
                    sheet.actionBtnFocus,
                    {
                      backgroundColor: C.surfaceRaised,
                      borderColor: C.border,
                    },
                  ]}
                  onPress={() => onFocusLocation(report.lat!, report.lng!)}
                  activeOpacity={0.75}
                >
                  <Navigation color={C.accent} size={15} strokeWidth={2.5} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Animated.View>
    </View>
  );
};

const sheet = StyleSheet.create({
  snackbarHost: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    paddingHorizontal: 14,
    paddingBottom: Platform.OS === "ios" ? 116 : 104,
  },
  card: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    gap: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 16,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badgeGroup: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    flex: 1,
    paddingRight: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 16,
    borderWidth: 1,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  verifiedBadgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  distanceBadgeText: { fontSize: 11, fontWeight: "700" },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // Main Info with Thumbnail
  mainRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    marginTop: 2,
  },
  thumbWrapper: {
    width: 70,
    height: 70,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  thumbPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  thumbBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  mainInfo: {
    flex: 1,
    gap: 3,
  },
  locationTitle: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  reporterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
  },
  reporterText: {
    fontSize: 11,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  metaText: { fontSize: 11, fontWeight: "500" },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },

  // Metrics Strip
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  metricBox: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  metricIconWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: "700",
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  metricDivider: {
    width: 1,
    height: 24,
  },

  // AI Callout
  aiCallout: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 4,
  },
  aiCalloutHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  aiCalloutTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  aiCalloutText: {
    fontSize: 11,
    lineHeight: 16,
    fontStyle: "italic",
  },

  // Actions
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
  },
  actionBtnPrimary: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionBtnPrimaryText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  actionBtnFocus: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MapComponent({
  experience,
}: {
  experience: MapExperience;
}) {
  const router = useRouter();
  const { colors: C } = useTheme();
  const insets = useSafeAreaInsets();
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

  // Filters for Tanod and Community
  const [tanodFilter, setTanodFilter] = useState<TanodFilter>("ALL");
  const [communityFilter, setCommunityFilter] =
    useState<CommunityFilter>("ALL");

  const [selectedReport, setSelectedReport] =
    useState<Partial<Report> | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // GPS User Location
  const [userPos, setUserPos] = useState<{ lat: number; lng: number }>({
    lat: INITIAL_LOCATION.latitude,
    lng: INITIAL_LOCATION.longitude,
  });

  const isTanod = experience === "tanod";
  const tanodAssignments = useQuery(api.assignments.getAssignmentsForTanod);
  const allReports = useQuery(api.reports.getAllReports);

  const html = useMemo(
    () => buildMapHtml(isTanod, C),
    [isTanod, C],
  );

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
              `window.setUserLocation(${coords.lat}, ${coords.lng}, ${isTanod}); ${recenter
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
    return new Set(tanodAssignments?.map((a) => a.reportId as string) ?? []);
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
          return (
            r.status === "CRITICAL" ||
            r.status === "HIGH RISK"
          );
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
          return (
            r.status === "CRITICAL" ||
            r.status === "HIGH RISK"
          );
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
    baseList.forEach((r) => {
      const key = `${r.lat!.toFixed(4)}_${r.lng!.toFixed(4)}`;
      if (!coordGroups[key]) coordGroups[key] = [];
      coordGroups[key].push(r);
    });

    // Apply radial offsets for stacked reports so they fan out visibly
    return baseList.map((r) => {
      const key = `${r.lat!.toFixed(4)}_${r.lng!.toFixed(4)}`;
      const group = coordGroups[key];
      if (group && group.length > 1) {
        const index = group.findIndex((item) => item._id === r._id);
        const total = group.length;
        const angle = (2 * Math.PI * index) / total;
        const radius = 0.00025; // ~27 meters radial spread
        const offsetLat = r.lat! + radius * Math.cos(angle);
        const latRad = (r.lat! * Math.PI) / 180;
        const offsetLng = r.lng! + (radius * Math.sin(angle)) / Math.cos(latRad);
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

    const verified = allReports.filter((r: Report) => r.verified && r.lat && r.lng);

    return {
      all: verified.length,
      assigned: verified.filter((r: Report) => assignedReportIds.has(r._id)).length,
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
    webviewRef.current?.injectJavaScript(`window.focusOn(${lat}, ${lng}, 17); true;`);
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

      <Animated.View style={[styles.overlays, { opacity: fadeAnim }]}>
        {/* ── STREAMLINED TOP CONTROL STACK ── */}
        <View
          style={[
            styles.topControlContainer,
            { top: Math.max(insets.top, 12) + 4 },
          ]}
        >
          {/* Top Header Card */}
          <View style={styles.topHeaderCard}>
            <View style={styles.topHeaderLeft}>
              <View
                style={[
                  styles.brandBadge,
                  {
                    backgroundColor: isTanod ? C.accentGlow : C.safeGlow,
                    borderColor: (isTanod ? C.accent : C.safe) + "40",
                  },
                ]}
              >
                <View
                  style={[
                    styles.liveDot,
                    { backgroundColor: isTanod ? C.accent : C.safe },
                  ]}
                />
                <Text
                  style={[
                    styles.brandBadgeText,
                    { color: isTanod ? C.accent : C.safe },
                  ]}
                >
                  {isTanod ? "TANOD OPS" : "COMMUNITY"}
                </Text>
              </View>
              <Text style={styles.screenTitle} numberOfLines={1}>
                {isTanod ? "Response Map" : "Vector Risk Map"}
              </Text>
            </View>

            {/* Mode switch */}
            <View style={styles.modeToggle}>
              <ModePillBtn
                icon={Map}
                label="Map"
                active={mode === "vector"}
                onPress={() => setMode("vector")}
                C={C}
              />
              <ModePillBtn
                icon={Satellite}
                label="Sat"
                active={mode === "satellite"}
                onPress={() => setMode("satellite")}
                C={C}
              />
            </View>
          </View>

          {/* ── DYNAMIC HORIZONTAL FILTER BAR ── */}
          <View style={styles.filterRibbonContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRibbonScroll}
            >
              {isTanod ? (
                // ── TANOD FILTER BUTTONS ──
                <>
                  <FilterPill
                    icon={Layers}
                    label="All Hotspots"
                    count={filterCounts.all}
                    active={tanodFilter === "ALL"}
                    onPress={() => setTanodFilter("ALL")}
                    accentColor={C.accent}
                    C={C}
                  />
                  <FilterPill
                    icon={Users}
                    label="My Team"
                    count={filterCounts.assigned}
                    active={tanodFilter === "ASSIGNED"}
                    onPress={() => setTanodFilter("ASSIGNED")}
                    accentColor={C.accent}
                    C={C}
                  />
                  <FilterPill
                    icon={Flame}
                    label="Urgent"
                    count={filterCounts.critical}
                    active={tanodFilter === "CRITICAL"}
                    onPress={() => setTanodFilter("CRITICAL")}
                    accentColor={C.danger}
                    C={C}
                  />
                  <FilterPill
                    icon={Clock}
                    label="Pending"
                    count={filterCounts.pending}
                    active={tanodFilter === "PENDING"}
                    onPress={() => setTanodFilter("PENDING")}
                    accentColor={C.warn}
                    C={C}
                  />
                  <FilterPill
                    icon={CheckCircle2}
                    label="Resolved"
                    count={filterCounts.resolved}
                    active={tanodFilter === "RESOLVED"}
                    onPress={() => setTanodFilter("RESOLVED")}
                    accentColor={C.safe}
                    C={C}
                  />
                </>
              ) : (
                // ── CITIZEN / COMMUNITY FILTER BUTTONS ──
                <>
                  <FilterPill
                    icon={Layers}
                    label="All Sites"
                    count={filterCounts.all}
                    active={communityFilter === "ALL"}
                    onPress={() => setCommunityFilter("ALL")}
                    accentColor={C.accent}
                    C={C}
                  />
                  <FilterPill
                    icon={Flame}
                    label="Critical"
                    count={filterCounts.critical}
                    active={communityFilter === "CRITICAL"}
                    onPress={() => setCommunityFilter("CRITICAL")}
                    accentColor={C.danger}
                    C={C}
                  />
                  <FilterPill
                    icon={Navigation}
                    label="Nearby"
                    count={filterCounts.nearby}
                    active={communityFilter === "NEARBY"}
                    onPress={() => setCommunityFilter("NEARBY")}
                    accentColor={C.accent}
                    C={C}
                  />
                  <FilterPill
                    icon={CheckCircle2}
                    label="Treated"
                    count={filterCounts.resolved}
                    active={communityFilter === "RESOLVED"}
                    onPress={() => setCommunityFilter("RESOLVED")}
                    accentColor={C.safe}
                    C={C}
                  />
                </>
              )}
            </ScrollView>
          </View>
        </View>

        {/* ── RIGHT FLOATING CONTROLS ── */}
        <View style={styles.rightPanel}>
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
          <FloatBtn
            icon={showZones ? Eye : EyeOff}
            accessibilityLabel={showZones ? "Hide risk zones" : "Show risk zones"}
            active={showZones}
            color={C.danger}
            badgeCount={showZones ? riskZones.length : undefined}
            C={C}
            onPress={() => setShowZones((v) => !v)}
          />
          <FloatBtn
            icon={AlertTriangle}
            accessibilityLabel={showReports ? "Hide report pins" : "Show report pins"}
            active={showReports}
            color={C.warn}
            badgeCount={showReports ? verifiedHotspots.length : undefined}
            C={C}
            onPress={() => setShowReports((v) => !v)}
          />
        </View>

        {/* ── BOTTOM MAP LEGEND (Hidden when report detail sheet is active) ── */}
        {!selectedReport && (
          <View style={styles.legend}>
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
              <Text style={styles.legendText}>Safe</Text>
            </View>
            <View style={styles.legendDivider} />
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendSwatch,
                  { borderColor: C.danger + "90", backgroundColor: C.dangerGlow },
                ]}
              />
              <Text style={styles.legendText}>Zone</Text>
            </View>
          </View>
        )}

        {(isLoading || !mapReady) && (
          <View style={styles.statusOverlayBox}>
            <ActivityIndicator size="small" color={C.accent} />
            <Text style={styles.statusOverlayText}>
              {isLoading ? "Loading surveillance data…" : "Acquiring GPS fix…"}
            </Text>
          </View>
        )}
        {!isLoading && mapReady && verifiedHotspots.length === 0 && (
          <View style={styles.statusOverlayBox}>
            <Text style={styles.statusOverlayText}>
              No reports matching current filter
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Enhanced Bottom sheet / Snackbar for report detail */}
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
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const createStyles = (C: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    map: { flex: 1 },
    overlays: {
      ...(StyleSheet.absoluteFillObject as any),
      pointerEvents: "box-none",
    },

    // Top Control Container
    topControlContainer: {
      position: "absolute",
      left: 12,
      right: 12,
      gap: 6,
    },
    topHeaderCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 18,
      backgroundColor: C.surface + "F5",
      borderWidth: 1,
      borderColor: C.border,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 6,
    },
    topHeaderLeft: {
      flex: 1,
      gap: 2,
    },
    brandBadge: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 7,
      paddingVertical: 2.5,
      borderRadius: 999,
      borderWidth: 1,
    },
    liveDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
    },
    brandBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.3,
    },
    screenTitle: {
      color: C.text,
      fontSize: 16,
      fontWeight: "700",
      letterSpacing: -0.3,
    },
    modeToggle: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: C.surfaceRaised,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 12,
      padding: 2,
      gap: 2,
    },

    // Filter Ribbon Container
    filterRibbonContainer: {
      backgroundColor: C.surface + "E6",
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 18,
      paddingVertical: 5,
      paddingHorizontal: 6,
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 4,
    },
    filterRibbonScroll: {
      gap: 6,
      alignItems: "center",
      paddingRight: 6,
    },

    // Floating controls positioned safely above bottom tab bar
    rightPanel: {
      position: "absolute",
      right: 14,
      bottom: 110,
      gap: 8,
    },
    legend: {
      position: "absolute",
      bottom: 110,
      left: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: C.surface + "E6",
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 12,
      paddingVertical: 6,
      paddingHorizontal: 10,
      shadowColor: "#000",
      shadowOpacity: 0.12,
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
    legendText: { fontSize: 10, fontWeight: "700", color: C.textSub },
    legendDivider: { width: 1, height: 10, backgroundColor: C.border },

    // Status overlay
    statusOverlayBox: {
      position: "absolute",
      alignSelf: "center",
      top: 120,
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
