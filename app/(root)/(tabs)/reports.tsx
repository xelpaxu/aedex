import ReportStatsCard from "@/components/features/reports/ReportStatCard";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import {
  AlertTriangle,
  ChevronRight,
  Flame,
  Globe,
  MapPin,
  User,
  Zap,
} from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
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
import { api } from "../../../../convex/_generated/api";
import { ThemeColors, useTheme } from "../../../context/ThemeContext";

const { width } = Dimensions.get("window");
const CARD_W = width * 0.78;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatTime = (time: number) => {
  const diff = Date.now() - time;
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const normalizeImageUri = (uri: string) => {
  if (!uri) return "";
  if (uri.startsWith("data:") || uri.startsWith("http")) return uri;
  return `data:image/jpeg;base64,${uri}`;
};

const SectionLabel = ({
  children,
  C,
}: {
  children: string;
  C: ThemeColors;
}) => (
  <View style={sl.row}>
    <View style={[sl.dash, { backgroundColor: C.accent }]} />
    <Text style={[sl.text, { color: C.textSub }]}>{children}</Text>
  </View>
);
const sl = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
    marginHorizontal: 20,
  },
  dash: { width: 20, height: 2, borderRadius: 1 },
  text: { fontSize: 10, fontWeight: "800", letterSpacing: 2 },
});

// ─── Priority highlight card ──────────────────────────────────────────────────
const HighlightCard = ({
  item,
  onPress,
  C,
}: {
  item: any;
  onPress: () => void;
  C: ThemeColors;
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.97,
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

  const isCritical = item.status === "CRITICAL";

  return (
    <Animated.View
      style={[
        hc.wrap,
        { backgroundColor: C.surface, borderColor: C.border },
        { transform: [{ scale }] },
      ]}
    >
      <Pressable onPress={press} style={{ flex: 1 }}>
        {/* Background image */}
        <Image
          source={{
            uri: normalizeImageUri(
              item.processedImage || item.imageUri || item.image,
            ),
          }}
          style={hc.img}
          resizeMode="cover"
        />

        {/* Gradient scrim */}
        <View style={hc.scrim} />

        {/* Top row */}
        <View style={hc.top}>
          <View
            style={[
              hc.badge,
              {
                backgroundColor: isCritical ? C.dangerGlow : C.warnGlow,
                borderColor: (isCritical ? C.danger : C.warn) + "60",
              },
            ]}
          >
            <Flame
              size={10}
              color={isCritical ? C.danger : C.warn}
              fill={isCritical ? C.danger : C.warn}
            />
            <Text
              style={[
                hc.badgeText,
                { color: isCritical ? C.danger : C.warn },
              ]}
            >
              {item.status}
            </Text>
          </View>
          <View style={hc.timePill}>
            <Text style={hc.timeText}>{formatTime(item._creationTime)}</Text>
          </View>
        </View>

        {/* Bottom info */}
        <View style={hc.bottom}>
          <View style={hc.locRow}>
            <MapPin size={13} color={C.accent} strokeWidth={2.5} />
            <Text style={[hc.locText, { color: "#FFFFFF" }]} numberOfLines={1}>
              {item.locationName}
            </Text>
          </View>
          <View style={hc.viewRow}>
            <Text style={[hc.viewText, { color: C.accent }]}>VIEW REPORT</Text>
            <ChevronRight size={12} color={C.accent} strokeWidth={3} />
          </View>
        </View>

        {/* Corner bracket TL */}
        <View style={[hc.bracket, { top: 0, left: 0 }]}>
          <View style={[hc.bH, { top: 0, left: 0, backgroundColor: C.accent }]} />
          <View style={[hc.bV, { top: 0, left: 0, backgroundColor: C.accent }]} />
        </View>
        {/* Corner bracket BR */}
        <View style={[hc.bracket, { bottom: 0, right: 0 }]}>
          <View
            style={[
              hc.bH,
              { bottom: 0, right: 0, left: undefined, backgroundColor: C.accent },
            ]}
          />
          <View
            style={[
              hc.bV,
              { bottom: 0, right: 0, left: undefined, backgroundColor: C.accent },
            ]}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
};
const hc = StyleSheet.create({
  wrap: {
    width: CARD_W,
    height: 380,
    borderRadius: 20,
    overflow: "hidden",
    marginRight: 14,
    borderWidth: 1,
  },
  img: { ...(StyleSheet.absoluteFillObject as any) },
  scrim: {
    ...(StyleSheet.absoluteFillObject as any),
    backgroundColor: "rgba(11,14,20,0.55)",
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  timePill: {
    backgroundColor: "rgba(11,14,20,0.6)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  timeText: {
    fontSize: 10,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "600",
  },
  bottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 18,
    gap: 8,
  },
  locRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  locText: { fontSize: 17, fontWeight: "800", flex: 1 },
  viewRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  viewText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  bracket: { position: "absolute", width: 18, height: 18 },
  bH: { position: "absolute", width: 18, height: 2 },
  bV: { position: "absolute", width: 2, height: 18 },
});

// ─── History row ──────────────────────────────────────────────────────────────
const HistoryRow = ({
  item,
  onPress,
  last,
  C,
}: {
  item: any;
  onPress: () => void;
  last: boolean;
  C: ThemeColors;
}) => {
  const isResolved = item.status === "Resolved";
  const isCrit = item.status === "CRITICAL";
  const color = isResolved ? C.safe : isCrit ? C.danger : C.warn;

  return (
    <TouchableOpacity
      style={[
        hr.row,
        !last && [hr.border, { borderBottomColor: C.border }],
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Image
        source={{
          uri: normalizeImageUri(
            item.processedImage || item.imageUri || item.image,
          ),
        }}
        style={[
          hr.thumb,
          { backgroundColor: C.surfaceRaised, borderColor: C.border },
        ]}
        resizeMode="cover"
      />
      <View style={hr.info}>
        <Text style={[hr.loc, { color: C.text }]} numberOfLines={1}>
          {item.locationName}
        </Text>
        <Text style={[hr.date, { color: C.textSub }]}>
          {new Date(item._creationTime).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </Text>
      </View>
      <View
        style={[
          hr.statusBadge,
          { backgroundColor: color + "18", borderColor: color + "40" },
        ]}
      >
        <View
          style={[hr.dot, { backgroundColor: color, shadowColor: color }]}
        />
        <Text style={[hr.statusText, { color }]}>{item.status}</Text>
      </View>
    </TouchableOpacity>
  );
};
const hr = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  border: { borderBottomWidth: 1 },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
  },
  info: { flex: 1, gap: 4 },
  loc: { fontSize: 13, fontWeight: "700" },
  date: { fontSize: 10 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 7,
    borderWidth: 1,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  statusText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
});

// ─── Urgent notice row ────────────────────────────────────────────────────────
const UrgentRow = ({
  item,
  onPress,
  last,
  C,
}: {
  item: any;
  onPress: () => void;
  last: boolean;
  C: ThemeColors;
}) => (
  <TouchableOpacity
    style={[
      ur.row,
      !last && [ur.border, { borderBottomColor: C.border }],
    ]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View
      style={[
        ur.iconBg,
        {
          backgroundColor: C.dangerGlow,
          borderColor: C.danger + "30",
        },
      ]}
    >
      <AlertTriangle color={C.danger} size={14} strokeWidth={2.5} />
    </View>
    <View style={ur.info}>
      <Text style={[ur.title, { color: C.danger }]}>Action Required</Text>
      <Text style={[ur.sub, { color: C.textSub }]} numberOfLines={1}>
        {item.locationName}
      </Text>
    </View>
    <ChevronRight color={C.danger} size={14} strokeWidth={2.5} />
  </TouchableOpacity>
);
const ur = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  border: { borderBottomWidth: 1 },
  iconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1 },
  title: { fontSize: 13, fontWeight: "800", marginBottom: 2 },
  sub: { fontSize: 11 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ReportsScreen() {
  const router = useRouter();
  const { colors: C } = useTheme();
  const [activeTab, setActiveTab] = useState<"Community" | "My Reports">(
    "Community",
  );
  const tabIndicator = useRef(new Animated.Value(0)).current;

  const allReports = useQuery(api.reports.getAllReports);
  const myReports = useQuery(api.reports.getMyReports);
  const currentUser = useQuery(api.users.getMe);
  const userBarangay = currentUser?.barangay ?? "All";

  // Slide tab indicator
  useEffect(() => {
    Animated.spring(tabIndicator, {
      toValue: activeTab === "Community" ? 0 : 1,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [activeTab]);

  const tabSlide = tabIndicator.interpolate({
    inputRange: [0, 1],
    outputRange: [0, (width - 40) / 2],
  });

  // Stagger fade-in
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 380,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, []);

  const navigate = (id: string) =>
    router.push({ pathname: "/results", params: { reportId: id } });

  const styles = useMemo(() => createStyles(C), [C]);

  if (allReports === undefined || myReports === undefined) {
    return (
      <View
        style={[
          styles.root,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color={C.accent} />
        <Text
          style={{
            color: C.textSub,
            fontSize: 11,
            letterSpacing: 1.5,
            marginTop: 12,
          }}
        >
          LOADING DATA
        </Text>
      </View>
    );
  }

  const communityReports = allReports ?? [];
  const criticalReports = myReports.filter((r) => r.status === "CRITICAL");

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim }]}>
      {/* ── TOP NAV ── */}
      <View style={styles.topNav}>
        <View style={styles.navLeft}>
          <View style={styles.navDot} />
          <Text style={styles.navTitle}>REPORTS</Text>
        </View>
        <View style={styles.navRight}>
          <View style={styles.barangayBadge}>
            <MapPin color={C.accent} size={10} />
            <Text style={styles.barangayBadgeText}>
              {userBarangay.toUpperCase()}
            </Text>
          </View>
          <View style={styles.navBadge}>
            <Zap color={C.accent} size={10} />
            <Text style={styles.navBadgeText}>
              {communityReports.length + myReports.length} TOTAL
            </Text>
          </View>
        </View>
      </View>

      {/* ── TAB SWITCHER ── */}
      <View style={styles.tabBar}>
        {/* Sliding pill */}
        <Animated.View
          style={[styles.tabPill, { transform: [{ translateX: tabSlide }] }]}
        />
        <Pressable
          style={styles.tabBtn}
          onPress={() => setActiveTab("Community")}
        >
          <Globe
            size={13}
            color={activeTab === "Community" ? "#FFFFFF" : C.textSub}
            strokeWidth={2.5}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "Community" && styles.tabTextActive,
            ]}
          >
            Community
          </Text>
        </Pressable>
        <Pressable
          style={styles.tabBtn}
          onPress={() => setActiveTab("My Reports")}
        >
          <User
            size={13}
            color={activeTab === "My Reports" ? "#FFFFFF" : C.textSub}
            strokeWidth={2.5}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "My Reports" && styles.tabTextActive,
            ]}
          >
            My Reports
          </Text>
        </Pressable>
      </View>

      {/* ══════════════════════════════════════════
          COMMUNITY TAB
      ══════════════════════════════════════════ */}
      {activeTab === "Community" ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* Hero section with Navigation Button */}
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroEyebrow}>LIVE FIELD DATA</Text>
              <Text style={styles.heroTitle}>Community{"\n"}Reports</Text>
            </View>

            <TouchableOpacity
              style={styles.feedNavBtn}
              activeOpacity={0.7}
              onPress={() => {
                router.push({
                  pathname: "/(root)/community-feed",
                  params: currentUser
                    ? {
                      userId: currentUser._id,
                      userName: currentUser.name || "",
                    }
                    : {},
                });
              }}
            >
              <Globe color={C.accent} size={20} strokeWidth={2.5} />
              <Text style={styles.feedNavText}>OPEN FEED</Text>
            </TouchableOpacity>
          </View>

          {/* Priority cards */}
          <SectionLabel C={C}>PRIORITY ALERTS</SectionLabel>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_W + 14}
            decelerationRate="fast"
            contentContainerStyle={styles.hScroll}
          >
            {communityReports.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No community reports yet.</Text>
              </View>
            ) : (
              communityReports.map((item) => (
                <HighlightCard
                  key={item._id}
                  item={item}
                  onPress={() => navigate(item._id)}
                  C={C}
                />
              ))
            )}
          </ScrollView>

          <View style={{ height: 100 }} />
        </ScrollView>
      ) : (
        /* ══════════════════════════════════════════
          MY REPORTS TAB
      ══════════════════════════════════════════ */
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* Stats card */}
          <ReportStatsCard
            total={myReports.length}
            resolved={myReports.filter((r) => r.status === "Resolved").length}
            active={myReports.filter((r) => r.status === "CRITICAL").length}
            pending={myReports.filter((r) => r.status === "LOW RISK").length}
          />

          {/* Urgent notices */}
          {criticalReports.length > 0 && (
            <>
              <SectionLabel C={C}>URGENT NOTICES</SectionLabel>
              <View style={styles.card}>
                {criticalReports.map((r, i) => (
                  <UrgentRow
                    key={r._id}
                    item={r}
                    onPress={() => navigate(r._id)}
                    last={i === criticalReports.length - 1}
                    C={C}
                  />
                ))}
              </View>
            </>
          )}

          {/* Report history */}
          <SectionLabel C={C}>RECENT REPORTS</SectionLabel>
          <View style={styles.card}>
            {myReports.length === 0 ? (
              <View style={styles.emptyInCard}>
                <Text style={styles.emptyText}>No reports submitted yet.</Text>
              </View>
            ) : (
              myReports.map((item, i) => (
                <HistoryRow
                  key={item._id}
                  item={item}
                  onPress={() => navigate(item._id)}
                  last={i === myReports.length - 1}
                  C={C}
                />
              ))
            )}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </Animated.View>
  );
}

const createStyles = (C: ThemeColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: C.bg,
      paddingTop: Platform.OS === "ios" ? 58 : 24,
    },

    // Top nav
    topNav: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      marginBottom: 18,
    },
    navLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
    navRight: { flexDirection: "row", alignItems: "center", gap: 8 },
    navDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: C.accent,
      shadowColor: C.accent,
      shadowOpacity: 0.9,
      shadowRadius: 6,
      elevation: 4,
    },
    navTitle: {
      fontSize: 13,
      fontWeight: "800",
      letterSpacing: 3,
      color: C.text,
    },
    feedNavBtn: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.surfaceRaised,
      borderWidth: 1,
      borderColor: C.accent + "40",
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 16,
      gap: 6,
      shadowColor: C.accent,
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
    },
    feedNavText: {
      fontSize: 10,
      fontWeight: "900",
      color: C.accent,
      letterSpacing: 1.5,
    },
    navBadge: {
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
    navBadgeText: {
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1.2,
      color: C.accent,
    },
    barangayBadge: {
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
    barangayBadgeText: {
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1.2,
      color: C.safe,
    },

    // Tab bar
    tabBar: {
      flexDirection: "row",
      marginHorizontal: 20,
      marginBottom: 22,
      backgroundColor: C.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.border,
      padding: 4,
      position: "relative",
      overflow: "hidden",
    },
    tabPill: {
      position: "absolute",
      top: 4,
      left: 4,
      width: (width - 48) / 2,
      height: "100%",
      marginTop: -4,
      backgroundColor: C.accent,
      borderRadius: 11,
      shadowColor: C.accent,
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 6,
    },
    tabBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 11,
      borderRadius: 11,
      zIndex: 1,
    },
    tabText: { fontSize: 12, fontWeight: "700", color: C.textSub },
    tabTextActive: { color: "#FFFFFF" },

    // Scroll
    scroll: { paddingBottom: 20 },

    // Hero
    heroRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      paddingHorizontal: 20,
      marginBottom: 24,
    },
    heroEyebrow: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 2,
      color: C.accent,
      marginBottom: 6,
    },
    heroTitle: {
      fontSize: 30,
      fontWeight: "800",
      color: C.text,
      lineHeight: 36,
      letterSpacing: -0.5,
    },

    // Horizontal scroll
    hScroll: { paddingLeft: 20, paddingRight: 10 },

    // Card container
    card: {
      marginHorizontal: 20,
      marginBottom: 22,
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.border,
      overflow: "hidden",
    },

    // Empty
    emptyCard: {
      width: CARD_W,
      height: 200,
      borderRadius: 20,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyInCard: {
      padding: 24,
      alignItems: "center",
    },
    emptyText: { color: C.textSub, fontSize: 13 },
  });
