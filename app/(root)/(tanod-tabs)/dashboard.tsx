import { ThemeColors, useTheme } from "@/context/ThemeContext";
import { useUser } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { ArrowRight, CheckCircle2, Clock3, Globe2, MapPinned, ShieldCheck, Siren } from "lucide-react-native";
import React, { useMemo } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { api } from "../../../../convex/_generated/api";

type Assignment = { _id: string; reportId?: string; reportStatus?: string; status?: string; locationName?: string; address?: string; assignedAt?: string | number; _creationTime?: number };
const resolved = (item: Assignment) => [item.reportStatus, item.status].some((s) => s === "Resolved" || s === "Completed");
const critical = (item: Assignment) => [item.reportStatus, item.status].some((s) => s === "CRITICAL" || s === "HIGH RISK");

function timeAgo(value?: string | number) {
  if (!value) return "Recently assigned";
  const time = typeof value === "number" ? value : new Date(value).getTime();
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1_440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1_440)}d ago`;
}

export default function TanodDashboardScreen() {
  const { colors: C } = useTheme();
  const router = useRouter();
  const { user } = useUser();
  const currentUser = useQuery(api.users.getMe);
  const assignments = useQuery(api.assignments.getAssignmentsForTanod);
  const assignedReports = useQuery(api.reports.getAssignedReports);
  const styles = useMemo(() => createStyles(C), [C]);
  const items = useMemo<Assignment[]>(() => assignments?.length ? assignments : assignedReports ?? [], [assignments, assignedReports]);
  const summary = useMemo(() => {
    let cleared = 0, urgent = 0;
    for (const item of items) {
      if (resolved(item)) cleared += 1;
      else if (critical(item)) urgent += 1;
    }
    return { total: items.length, cleared, urgent, active: items.length - cleared, rate: items.length ? Math.round(cleared / items.length * 100) : 100 };
  }, [items]);
  const queue = useMemo(() => items.filter((item) => !resolved(item)).slice(0, 4), [items]);

  if (currentUser === undefined || assignments === undefined) return (
    <View style={styles.loading}><Image source={require("../../../assets/images/pin_critical.png")} style={styles.loadingPin} resizeMode="contain" /><ActivityIndicator color={C.accent} /><Text style={styles.loadingText}>Preparing field operations…</Text></View>
  );

  const name = currentUser?.firstName || user?.firstName || "Officer";
  const barangay = currentUser?.barangay || "your barangay";
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.dutyBadge}><View style={styles.liveDot} /><Text style={styles.dutyText}>ON DUTY · LIVE</Text></View>
          <Image source={{ uri: user?.imageUrl }} style={styles.avatar} accessibilityLabel={`${name}'s profile photo`} />
        </View>
        <Text style={styles.kicker}>Barangay {barangay.toUpperCase()}</Text>
        <Text style={styles.heroTitle}>Good day, {name}.</Text>
        <Text style={styles.heroCopy}>{summary.active ? `${summary.active} active ${summary.active === 1 ? "site needs" : "sites need"} your attention.` : "Your response queue is clear. Keep monitoring the area."}</Text>
        <View style={styles.progressRow}><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${summary.rate}%` }]} /></View><Text style={styles.progressText}>{summary.rate}% cleared</Text></View>
      </View>

      <View style={styles.metrics}>
        <Metric icon={<Siren color={C.danger} size={18} />} value={summary.urgent} label="Critical" tone={C.danger} C={C} />
        <Metric icon={<Clock3 color={C.warn} size={18} />} value={summary.active} label="Active" tone={C.warn} C={C} />
        <Metric icon={<CheckCircle2 color={C.safe} size={18} />} value={summary.cleared} label="Cleared" tone={C.safe} C={C} />
      </View>

      <View style={styles.actions}>
        <Action icon={<MapPinned color={C.accent} size={22} />} title="Open live map" copy="See risk zones nearby" onPress={() => router.push("/(root)/(tanod-tabs)/map")} C={C} />
        <Action icon={<Globe2 color={C.safe} size={22} />} title="Community feed" copy="Review local updates" onPress={() => router.push("/community-feed")} C={C} />
      </View>

      <View style={styles.sectionHeader}>
        <View><Text style={styles.eyebrow}>Priority queue</Text><Text style={styles.sectionTitle}>Next assignments</Text></View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="View all assigned reports" onPress={() => router.push("/(root)/(tanod-tabs)/reports")} style={styles.viewAll}><Text style={styles.viewAllText}>View all</Text><ArrowRight color={C.accent} size={14} /></TouchableOpacity>
      </View>

      {queue.length ? <View style={styles.queue}>{queue.map((item, index) => {
        const urgent = critical(item); const reportId = item.reportId || item._id;
        return <TouchableOpacity key={item._id} accessibilityRole="button" accessibilityLabel={`Open assignment at ${item.locationName || item.address || "reported location"}`} activeOpacity={0.78} style={styles.queueCard} onPress={() => router.push({ pathname: "/results", params: { reportId } })}>
          <View style={[styles.pinBox, { backgroundColor: urgent ? C.dangerGlow : C.warnGlow }]}><Image source={urgent ? require("../../../assets/images/pin_critical.png") : require("../../../assets/images/pin_moderate.png")} style={styles.pin} resizeMode="contain" /></View>
          <View style={styles.queueBody}><Text style={[styles.queueLevel, { color: urgent ? C.danger : C.warn }]}>{urgent ? "CRITICAL RESPONSE" : `ASSIGNMENT ${index + 1}`}</Text><Text style={styles.location} numberOfLines={1}>{item.locationName || item.address || "Reported vector site"}</Text><Text style={styles.time}>{timeAgo(item.assignedAt || item._creationTime)}</Text></View><ArrowRight color={C.textDim} size={18} />
        </TouchableOpacity>;
      })}</View> : <View style={styles.empty}><ShieldCheck color={C.safe} size={28} /><Text style={styles.emptyTitle}>Area queue cleared</Text><Text style={styles.emptyText}>There are no pending assignments right now.</Text></View>}
    </ScrollView>
  );
}

function Metric({ icon, value, label, tone, C }: { icon: React.ReactNode; value: number; label: string; tone: string; C: ThemeColors }) {
  return <View style={[shared.metric, { backgroundColor: C.surface, borderColor: C.border }]}>{icon}<Text style={[shared.metricValue, { color: tone }]}>{value}</Text><Text style={[shared.metricLabel, { color: C.textSub }]}>{label}</Text></View>;
}
function Action({ icon, title, copy, onPress, C }: { icon: React.ReactNode; title: string; copy: string; onPress: () => void; C: ThemeColors }) {
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={title} activeOpacity={0.78} onPress={onPress} style={[shared.action, { backgroundColor: C.surface, borderColor: C.border }]}><View style={[shared.actionIcon, { backgroundColor: C.surfaceRaised }]}>{icon}</View><Text style={[shared.actionTitle, { color: C.text }]}>{title}</Text><Text style={[shared.actionCopy, { color: C.textSub }]}>{copy}</Text></TouchableOpacity>;
}
const shared = StyleSheet.create({
  metric: { flex: 1, borderWidth: 1, borderRadius: 18, padding: 14, gap: 5 }, metricValue: { fontSize: 24, fontWeight: "700", letterSpacing: -0.8 }, metricLabel: { fontSize: 11, fontWeight: "700" },
  action: { flex: 1, borderWidth: 1, borderRadius: 20, padding: 15 }, actionIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", marginBottom: 16 }, actionTitle: { fontSize: 14, fontWeight: "700" }, actionCopy: { fontSize: 11, marginTop: 4 },
});
const createStyles = (C: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg }, content: { padding: 16, paddingBottom: 118, gap: 18 }, loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg, gap: 10 }, loadingPin: { width: 64, height: 64 }, loadingText: { color: C.textSub, fontSize: 12, fontWeight: "700" },
  hero: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 26, padding: 20 }, heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }, dutyBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: C.safeGlow, borderRadius: 999, borderWidth: 1, borderColor: C.safe + "35" }, liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.safe }, dutyText: { color: C.safe, fontSize: 11, fontWeight: "700", letterSpacing: 0.3 }, avatar: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.surfaceRaised, borderWidth: 1, borderColor: C.border }, kicker: { color: C.accent, fontSize: 11, fontWeight: "700", letterSpacing: 0.3 }, heroTitle: { color: C.text, fontSize: 25, fontWeight: "700", letterSpacing: -0.8, marginTop: 6 }, heroCopy: { color: C.textSub, fontSize: 13, lineHeight: 19, marginTop: 7 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 20 }, progressTrack: { flex: 1, height: 7, borderRadius: 5, backgroundColor: C.surfaceRaised, overflow: "hidden" }, progressFill: { height: "100%", borderRadius: 5, backgroundColor: C.safe }, progressText: { color: C.textSub, fontSize: 11, fontWeight: "700" }, metrics: { flexDirection: "row", gap: 9 }, actions: { flexDirection: "row", gap: 10 }, sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }, eyebrow: { color: C.accent, fontSize: 11, fontWeight: "700", letterSpacing: 0.3 }, sectionTitle: { color: C.text, fontSize: 19, fontWeight: "700", marginTop: 3 }, viewAll: { flexDirection: "row", alignItems: "center", gap: 4, padding: 8 }, viewAllText: { color: C.accent, fontSize: 12, fontWeight: "700" },
  queue: { gap: 10 }, queueCard: { minHeight: 82, flexDirection: "row", alignItems: "center", gap: 12, padding: 11, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 19 }, pinBox: { width: 58, height: 58, borderRadius: 17, alignItems: "center", justifyContent: "center" }, pin: { width: 54, height: 54 }, queueBody: { flex: 1, gap: 3 }, queueLevel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 }, location: { color: C.text, fontSize: 13, fontWeight: "700" }, time: { color: C.textSub, fontSize: 11 }, empty: { alignItems: "center", padding: 26, gap: 7, backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.border }, emptyTitle: { color: C.text, fontSize: 15, fontWeight: "700" }, emptyText: { color: C.textSub, fontSize: 12, textAlign: "center" },
});
