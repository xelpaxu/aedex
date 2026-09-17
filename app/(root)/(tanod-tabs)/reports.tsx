import { ThemeColors, useTheme } from "@/context/ThemeContext";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { CheckCircle2, ChevronRight, Clock3, ListFilter, MapPin, Search, ShieldAlert, X } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api } from "../../../../convex/_generated/api";

type Filter = "ALL" | "CRITICAL" | "PENDING" | "RESOLVED";
type ReportItem = { _id: string; status?: string; locationName?: string; address?: string; reasoning?: string; notes?: string; imageUri?: string; reportImage?: string; _creationTime?: number };
const done = (item: ReportItem) => item.status === "Resolved" || item.status === "Completed";
const urgent = (item: ReportItem) => item.status === "CRITICAL" || item.status === "HIGH RISK";
const imageUri = (value?: string) => !value ? "" : value.startsWith("data:") || value.startsWith("http") ? value : `data:image/jpeg;base64,${value}`;

export default function TanodReportsScreen() {
  const router = useRouter();
  const { colors: C } = useTheme();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const currentUser = useQuery(api.users.getMe);
  const assignedReports = useQuery(api.reports.getAssignedReports);
  const styles = useMemo(() => createStyles(C), [C]);
  const reports = useMemo(
    () => (assignedReports ?? []) as ReportItem[],
    [assignedReports],
  );
  const counts = useMemo(() => {
    let critical = 0, pending = 0, resolved = 0;
    for (const item of reports) {
      if (done(item)) resolved += 1;
      else {
        pending += 1;
        if (urgent(item)) critical += 1;
      }
    }
    return { all: reports.length, critical, pending, resolved };
  }, [reports]);
  const visibleReports = useMemo(() => {
    const term = query.trim().toLowerCase();
    return reports.filter((item) => {
      const matchesFilter = filter === "ALL" || (filter === "CRITICAL" && urgent(item) && !done(item)) || (filter === "PENDING" && !done(item)) || (filter === "RESOLVED" && done(item));
      if (!matchesFilter || !term) return matchesFilter;
      return `${item.locationName ?? ""} ${item.address ?? ""} ${item.reasoning ?? ""}`.toLowerCase().includes(term);
    });
  }, [filter, query, reports]);
  const openReport = useCallback((id: string) => router.push({ pathname: "/results", params: { reportId: id } }), [router]);

  if (assignedReports === undefined) return <View style={styles.loading}><Image source={require("../../../assets/images/pin_moderate.png")} style={styles.loadingPin} resizeMode="contain" /><ActivityIndicator color={C.accent} /><Text style={styles.loadingText}>Syncing assignment queue…</Text></View>;

  return (
    <View style={styles.root}>
      <FlatList
        data={visibleReports}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <ReportCard item={item} onPress={openReport} C={C} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<>
          <View style={styles.hero}>
            <View style={styles.heroIcon}><ShieldAlert color={C.accent} size={22} /></View>
            <View style={styles.heroBody}><Text style={styles.eyebrow}>Field assignments</Text><Text style={styles.title}>Response queue</Text><Text style={styles.subtitle}>Barangay {currentUser?.barangay || "operations"} · {counts.pending} active</Text></View>
          </View>
          <View style={styles.searchBox}><Search color={C.textDim} size={18} /><TextInput value={query} onChangeText={setQuery} placeholder="Search location or report" placeholderTextColor={C.textDim} style={styles.searchInput} returnKeyType="search" accessibilityLabel="Search assigned reports" />{query ? <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10} onPress={() => setQuery("")}><X color={C.textSub} size={17} /></Pressable> : null}</View>
          <View style={styles.filterHeading}><ListFilter color={C.textSub} size={14} /><Text style={styles.filterHeadingText}>Filter queue</Text></View>
          <View style={styles.filters}>
            <FilterChip label="All" count={counts.all} active={filter === "ALL"} onPress={() => setFilter("ALL")} tone={C.accent} C={C} />
            <FilterChip label="Critical" count={counts.critical} active={filter === "CRITICAL"} onPress={() => setFilter("CRITICAL")} tone={C.danger} C={C} />
            <FilterChip label="Pending" count={counts.pending} active={filter === "PENDING"} onPress={() => setFilter("PENDING")} tone={C.warn} C={C} />
            <FilterChip label="Cleared" count={counts.resolved} active={filter === "RESOLVED"} onPress={() => setFilter("RESOLVED")} tone={C.safe} C={C} />
          </View>
          <View style={styles.resultsHeader}><Text style={styles.resultsTitle}>{visibleReports.length} {visibleReports.length === 1 ? "assignment" : "assignments"}</Text><Text style={styles.resultsMeta}>Updated live</Text></View>
        </>}
        ListEmptyComponent={<View style={styles.empty}><Image source={require("../../../assets/images/pin_safe.png")} style={styles.emptyPin} resizeMode="contain" /><Text style={styles.emptyTitle}>Queue is clear</Text><Text style={styles.emptyText}>{query ? "No assignments match your search." : "No assignments match this filter."}</Text></View>}
      />
    </View>
  );
}

function FilterChip({ label, count, active, onPress, tone, C }: { label: string; count: number; active: boolean; onPress: () => void; tone: string; C: ThemeColors }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${label}, ${count} reports`} accessibilityState={{ selected: active }} onPress={onPress} style={[chip.base, { backgroundColor: active ? tone : C.surface, borderColor: active ? tone : C.border }]}><Text style={[chip.label, { color: active ? "#FFFFFF" : C.textSub }]}>{label}</Text><View style={[chip.count, { backgroundColor: active ? "rgba(255,255,255,.22)" : C.surfaceRaised }]}><Text style={[chip.countText, { color: active ? "#FFFFFF" : C.text }]}>{count}</Text></View></Pressable>;
}

function ReportCard({ item, onPress, C }: { item: ReportItem; onPress: (id: string) => void; C: ThemeColors }) {
  const isDone = done(item), isUrgent = urgent(item);
  const tone = isDone ? C.safe : isUrgent ? C.danger : C.warn;
  const pin = isDone ? require("../../../assets/images/pin_safe.png") : isUrgent ? require("../../../assets/images/pin_critical.png") : require("../../../assets/images/pin_moderate.png");
  const photo = imageUri(item.imageUri || item.reportImage);
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Open ${isUrgent ? "critical " : ""}report at ${item.locationName || item.address || "reported location"}`} activeOpacity={0.8} onPress={() => onPress(item._id)} style={[card.root, { backgroundColor: C.surface, borderColor: C.border }]}>
    <View style={card.visual}>{photo ? <Image source={{ uri: photo }} style={card.photo} /> : <View style={[card.photo, { backgroundColor: C.surfaceRaised }]} />}<View style={[card.scrim, { backgroundColor: tone + "18" }]} /><Image source={pin} style={card.pin} resizeMode="contain" /><View style={[card.status, { backgroundColor: tone }]}>{isDone ? <CheckCircle2 color="#FFF" size={11} /> : <Clock3 color="#FFF" size={11} />}<Text style={card.statusText}>{isDone ? "CLEARED" : isUrgent ? "CRITICAL" : "PENDING"}</Text></View></View>
    <View style={card.body}><View style={card.locationRow}><MapPin color={tone} size={14} /><Text style={[card.location, { color: C.text }]} numberOfLines={1}>{item.locationName || item.address || "Reported vector site"}</Text></View><Text style={[card.copy, { color: C.textSub }]} numberOfLines={2}>{item.reasoning || item.notes || "A possible mosquito breeding site requires field verification."}</Text><View style={[card.footer, { borderTopColor: C.border }]}><Text style={[card.date, { color: C.textDim }]}>{item._creationTime ? new Date(item._creationTime).toLocaleDateString([], { month: "short", day: "numeric" }) : "Recently assigned"}</Text><View style={card.open}><Text style={[card.openText, { color: C.accent }]}>{isDone ? "VIEW REPORT" : "OPEN TASK"}</Text><ChevronRight color={C.accent} size={14} /></View></View></View>
  </TouchableOpacity>;
}

const chip = StyleSheet.create({ base: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 11 }, label: { fontSize: 11, fontWeight: "700" }, count: { minWidth: 19, height: 19, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }, countText: { fontSize: 11, fontWeight: "700" } });
const card = StyleSheet.create({ root: { borderWidth: 1, borderRadius: 22, overflow: "hidden" }, visual: { height: 112, position: "relative", overflow: "hidden" }, photo: { ...StyleSheet.absoluteFillObject }, scrim: { ...StyleSheet.absoluteFillObject }, pin: { position: "absolute", width: 78, height: 78, left: 10, bottom: -5 }, status: { position: "absolute", right: 12, top: 12, flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 9 }, statusText: { color: "#FFF", fontSize: 11, fontWeight: "700", letterSpacing: 0.3 }, body: { padding: 14, gap: 9 }, locationRow: { flexDirection: "row", alignItems: "center", gap: 6 }, location: { flex: 1, fontSize: 14, fontWeight: "700" }, copy: { fontSize: 11, lineHeight: 17 }, footer: { borderTopWidth: 1, paddingTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, date: { fontSize: 11 }, open: { flexDirection: "row", alignItems: "center", gap: 2 }, openText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 } });
const createStyles = (C: ThemeColors) => StyleSheet.create({ root: { flex: 1, backgroundColor: C.bg }, loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg, gap: 10 }, loadingPin: { width: 64, height: 64 }, loadingText: { color: C.textSub, fontSize: 12, fontWeight: "700" }, list: { padding: 16, paddingBottom: 118, gap: 12 }, hero: { flexDirection: "row", alignItems: "center", gap: 13, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 23, padding: 17, marginBottom: 14 }, heroIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: C.accentGlow }, heroBody: { flex: 1 }, eyebrow: { color: C.accent, fontSize: 11, fontWeight: "700", letterSpacing: 0.3 }, title: { color: C.text, fontSize: 21, fontWeight: "700", letterSpacing: -0.5, marginTop: 3 }, subtitle: { color: C.textSub, fontSize: 11, marginTop: 3 }, searchBox: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, marginBottom: 13 }, searchInput: { flex: 1, color: C.text, fontSize: 13, paddingVertical: 10 }, filterHeading: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 9 }, filterHeadingText: { color: C.textSub, fontSize: 11, fontWeight: "700", letterSpacing: 0.3 }, filters: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 18 }, resultsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }, resultsTitle: { color: C.text, fontSize: 15, fontWeight: "700" }, resultsMeta: { color: C.safe, fontSize: 11, fontWeight: "700" }, empty: { alignItems: "center", paddingVertical: 45 }, emptyPin: { width: 88, height: 88 }, emptyTitle: { color: C.text, fontSize: 16, fontWeight: "700", marginTop: 5 }, emptyText: { color: C.textSub, fontSize: 12, marginTop: 5 } });
