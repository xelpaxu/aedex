import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { ChevronRight, ClipboardList, Globe, Search } from "lucide-react-native";
import { Text, useAccountTheme } from "@/components/AccountUI";
import { TextInput } from "@/components/Typography";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { imageSource } from "@/lib/notifications";

type Filter = "all" | "pending" | "verified" | "resolved";
const resolved = (r: Doc<"reports">) => ["resolved", "completed"].includes((r.status || "").toLowerCase());
function ReportRow({ report, onPress }: { report: Doc<"reports">; onPress: () => void }) {
  const { colors: C } = useAccountTheme();
  const [failed, setFailed] = useState(false);
  const uri = imageSource(report.imageUri || report.processedImage);
  const status = resolved(report) ? "Resolved" : report.verified ? "Verified" : "Awaiting review";
  return <Pressable accessibilityRole="button" accessibilityLabel={`${report.locationName || "Reported site"}, ${status}. View report`} onPress={onPress} style={({ pressed }) => ({ paddingVertical: 18, flexDirection: "row", alignItems: "center", gap: 14, borderBottomWidth: 0.5, borderColor: C.border, backgroundColor: pressed ? C.surfaceRaised : "transparent" })}>
    {uri && !failed ? <Image accessible={false} source={{ uri }} onError={() => setFailed(true)} style={{ width: 66, height: 76, borderRadius: 12, backgroundColor: C.surfaceRaised }} /> : <View style={{ width: 66, height: 76, borderRadius: 12, backgroundColor: C.surfaceRaised, alignItems: "center", justifyContent: "center" }}><ClipboardList size={24} color={C.textSub} /></View>}
    <View style={{ flex: 1, gap: 6 }}><Text style={{ color: C.text, fontSize: 17, fontWeight: "600", lineHeight: 23 }}>{report.locationName || "Reported site"}</Text><Text style={{ color: C.textSub, fontSize: 13 }}>{new Date(report.timestamp || report._creationTime).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</Text><Text style={{ color: resolved(report) || report.verified ? C.actionText : C.textSub, fontSize: 13, fontWeight: "500" }}>{status}{report.verified && !resolved(report) && report.riskLevel ? ` / ${report.riskLevel}` : ""}</Text></View><ChevronRight color={C.textDim} size={18} />
  </Pressable>;
}
export default function ReportsScreen() {
  const { colors: C } = useAccountTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reports = useQuery(api.reports.getMyReports);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const counts = useMemo(() => ({ all: reports?.length ?? 0, pending: reports?.filter(r => !r.verified && !resolved(r)).length ?? 0, verified: reports?.filter(r => r.verified && !resolved(r)).length ?? 0, resolved: reports?.filter(resolved).length ?? 0 }), [reports]);
  const visible = useMemo(() => (reports ?? []).filter(r => (filter === "all" || (filter === "resolved" ? resolved(r) : filter === "verified" ? r.verified && !resolved(r) : !r.verified && !resolved(r))) && `${r.locationName || ""} ${r.description || ""}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => (b.timestamp || b._creationTime) - (a.timestamp || a._creationTime)), [reports, filter, query]);
  return <View style={{ flex: 1, backgroundColor: C.bg }}>
    <FlatList data={visible} keyExtractor={item => item._id} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 + insets.bottom, maxWidth: 640, width: "100%", alignSelf: "center", flexGrow: 1 }}
      ListHeaderComponent={<View style={{ gap: 24 }}>
        <View style={{ gap: 8 }}><Text accessibilityRole="header" style={{ color: C.text, fontSize: 34, fontWeight: "700", letterSpacing: -1 }}>My reports</Text><Text style={{ color: C.textSub, fontSize: 15 }}>Follow the progress of the sites you report.</Text></View>
        <View style={{ flexDirection: "row", paddingVertical: 18, borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: C.border }}>
          {([{ key: "all", label: "Submitted" }, { key: "pending", label: "In review" }, { key: "resolved", label: "Resolved" }] as const).map(stat => <Pressable key={stat.key} accessibilityRole="button" accessibilityLabel={`${counts[stat.key]} ${stat.label}. Filter reports`} onPress={() => setFilter(stat.key)} style={({ pressed }) => ({ flex: 1, minHeight: 56, gap: 6, opacity: pressed ? 0.5 : 1 })}><Text style={{ color: C.text, fontSize: 28, fontWeight: "600" }}>{reports === undefined ? "--" : counts[stat.key]}</Text><Text style={{ color: C.textSub, fontSize: 13 }}>{stat.label}</Text></Pressable>)}
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push("/community-feed")} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, opacity: pressed ? 0.5 : 1 })}><Globe size={22} color={C.actionText} /><View style={{ flex: 1, gap: 4 }}><Text style={{ color: C.text, fontSize: 16, fontWeight: "600" }}>Community feed</Text><Text style={{ color: C.textSub, fontSize: 13 }}>See reports from your community</Text></View><ChevronRight size={18} color={C.textDim} /></Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, borderRadius: 12, backgroundColor: C.surfaceRaised, gap: 8 }}><Search color={C.textSub} size={19} /><TextInput accessibilityLabel="Search my reports" placeholder="Search reports" placeholderTextColor={C.textDim} value={query} onChangeText={setQuery} style={{ flex: 1, minHeight: 48, color: C.text, fontSize: 16 }} clearButtonMode="while-editing" /></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>{(["all", "pending", "verified", "resolved"] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: filter === value }} onPress={() => setFilter(value)} style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 16, justifyContent: "center", borderRadius: 10, backgroundColor: filter === value ? C.surface : "transparent", borderWidth: 1, borderColor: filter === value ? C.actionText : C.border, opacity: pressed ? 0.5 : 1 })}><Text style={{ color: filter === value ? C.actionText : C.textSub, fontSize: 14, fontWeight: filter === value ? "600" : "400" }}>{value === "pending" ? "In review" : value[0].toUpperCase() + value.slice(1)}</Text></Pressable>)}</ScrollView>
      </View>}
      ListEmptyComponent={reports === undefined ? <ActivityIndicator color={C.actionText} style={{ marginTop: 40 }} /> : <View style={{ alignItems: "center", gap: 12, paddingVertical: 40 }}><ClipboardList size={32} color={C.textSub} /><Text style={{ color: C.text, fontSize: 20, fontWeight: "600" }}>{reports.length ? "No matching reports" : "Your reports will appear here"}</Text><Text style={{ color: C.textSub, fontSize: 15, textAlign: "center", lineHeight: 22 }}>{reports.length ? "Try a different search or status filter." : "Capture a site to submit your first report."}</Text><Pressable accessibilityRole="button" onPress={() => reports.length ? (setQuery(""), setFilter("all")) : router.push("/(root)/(tabs)/capture")} style={{ minHeight: 48, justifyContent: "center", paddingHorizontal: 16 }}><Text style={{ color: C.actionText, fontWeight: "600", fontSize: 16 }}>{reports.length ? "Clear filters" : "Capture a site"}</Text></Pressable></View>}
      renderItem={({ item }) => <ReportRow report={item} onPress={() => router.push({ pathname: "/results", params: { reportId: item._id } })} />} />
  </View>;
}
