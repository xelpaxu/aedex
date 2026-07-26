import PostCard from "@/components/features/community/CommunityCard";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { ArrowLeft, Globe, Zap } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Colour tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#0B0E14",
  surface: "#111520",
  border: "#1E2640",
  text: "#E8EDF8",
  textSub: "#697A9B",
  textDim: "#3C4A66",
  accent: "#4F8EF7",
  accentGlow: "#4F8EF718",
  danger: "#FF4D6A",
  safe: "#00C896",
};

// ─── Skeleton card for loading state ─────────────────────────────────────────
const SkeletonCard = ({ delay = 0 }: { delay?: number }) => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.9],
  });

  return (
    <Animated.View style={[sk.card, { opacity }]}>
      <View style={sk.image} />
      <View style={sk.body}>
        <View style={sk.row}>
          <View style={sk.avatar} />
          <View style={{ flex: 1, gap: 6 }}>
            <View style={sk.lineShort} />
            <View style={sk.lineLong} />
          </View>
        </View>
        <View style={[sk.lineLong, { marginTop: 12, width: "60%" }]} />
      </View>
    </Animated.View>
  );
};
const sk = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    marginHorizontal: 16,
    marginBottom: 12,
  },
  image: { width: "100%", height: 180, backgroundColor: C.border },
  body: { padding: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.border,
  },
  lineShort: {
    height: 10,
    width: "40%",
    borderRadius: 4,
    backgroundColor: C.border,
  },
  lineLong: {
    height: 10,
    width: "80%",
    borderRadius: 4,
    backgroundColor: C.border,
  },
});

// ─── List header component ────────────────────────────────────────────────────
const ListHeader = ({ count }: { count: number }) => (
  <View style={lh.wrap}>
    <View style={lh.left}>
      <Text style={lh.eyebrow}>LIVE FIELD DATA</Text>
      <Text style={lh.title}>Community Reports</Text>
    </View>
    <View style={lh.countBox}>
      <Text style={lh.countNum}>{count}</Text>
      <Text style={lh.countLabel}>POSTS</Text>
    </View>
  </View>
);
const lh = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
  left: { flex: 1 },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    color: C.accent,
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: C.text,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  countBox: {
    alignItems: "center",
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginLeft: 16,
  },
  countNum: { fontSize: 22, fontWeight: "800", color: C.accent },
  countLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: C.textSub,
    marginTop: 2,
  },
});

// ─── Separator ────────────────────────────────────────────────────────────────
const Separator = () => <View style={{ height: 10 }} />;

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyState = () => (
  <View style={es.wrap}>
    <View style={es.iconBg}>
      <Globe color={C.textDim} size={28} strokeWidth={1.5} />
    </View>
    <Text style={es.title}>No Reports Yet</Text>
    <Text style={es.sub}>
      Community reports will appear here once submitted.
    </Text>
  </View>
);
const es = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 40,
    gap: 12,
  },
  iconBg: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: { fontSize: 16, fontWeight: "800", color: C.text },
  sub: { fontSize: 12, color: C.textSub, textAlign: "center", lineHeight: 18 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function CommunityFeedScreen() {
  const router = useRouter();
  const allReports = useQuery(api.reports.getAllReports);
  const currentUser = useQuery(api.users.getMe);

  // Fade in on mount
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 380,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, []);

  const communityReports = allReports?.filter((report) => {
    if (!currentUser) return false;
    const owner = report.userName?.toUpperCase().trim();
    const me = currentUser.name?.toUpperCase().trim();
    return owner !== me;
  });

  const isLoading = allReports === undefined;

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" />

      {/* ── TOP NAV ── */}
      <View style={styles.topNav}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft color={C.text} size={17} strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={styles.navCenter}>
          <View style={styles.navDash} />
          <Text style={styles.navTitle}>COMMUNITY</Text>
        </View>

        <View style={styles.navBadge}>
          <Zap color={C.accent} size={10} />
          <Text style={styles.navBadgeText}>LIVE</Text>
        </View>
      </View>

      {/* ── LOADING ── */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          {[0, 150, 300].map((delay) => (
            <SkeletonCard key={delay} delay={delay} />
          ))}
        </View>
      ) : (
        <FlatList
          data={communityReports}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={Separator}
          ListHeaderComponent={
            <ListHeader count={communityReports?.length ?? 0} />
          }
          ListEmptyComponent={<EmptyState />}
          renderItem={({ item }) => {
            const date = new Date(item._creationTime).toLocaleDateString(
              "en-US",
              {
                month: "short",
                day: "numeric",
              },
            );

            return (
              <View style={styles.cardWrap}>
                <PostCard
                  image={item.processedImage || item.imageUri}
                  userName={item.userName || "Unknown User"}
                  location={item.locationName || "Iloilo City"}
                  timestamp={date}
                  status={item.verified ? "CRITICAL" : "LOW RISK"}
                  userAvatar={`https://ui-avatars.com/api/?name=${item.userName}&background=1a2240&color=4F8EF7&bold=true`}
                  isFullWidth
                  onPress={() =>
                    router.push({
                      pathname: "/results",
                      params: { reportId: item._id },
                    })
                  }
                />
              </View>
            );
          }}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Nav
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 58 : 24,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.bg,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  navCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  navDash: { width: 16, height: 2, backgroundColor: C.accent, borderRadius: 1 },
  navTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 3,
    color: C.text,
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

  // Content
  listContent: { paddingBottom: 100 },
  cardWrap: { paddingHorizontal: 16 },

  // Loading
  loadingWrap: { paddingTop: 20 },
});
