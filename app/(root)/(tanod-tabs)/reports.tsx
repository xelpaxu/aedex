import { useTheme } from "@/context/ThemeContext";
import { useProfile } from "@/context/AccessContext";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { Search, Users, X, LayoutDashboard, ArrowUpRight, ClipboardList } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, View } from "react-native";
import { Text, TextInput } from "@/components/Typography";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/convex/_generated/api";
import AssignmentCard from "@/components/features/reports/AssignmentCard";
import { filterReports, reportCounts, ReportFilter, AssignedReport } from "@/lib/tanodReports";

export default function TanodReportsScreen() {
  const router = useRouter();
  const { colors: C } = useTheme();
  const profile = useProfile();
  const insets = useSafeAreaInsets();
  const [scope, setScope] = useState<"mine" | "others">("mine");
  const [filter, setFilter] = useState<ReportFilter>("all");
  const [query, setQuery] = useState("");
  const [team, setTeam] = useState("");
  const assignments = useQuery(api.reports.getAssignedReports, {
    scope: "barangay",
  }) as AssignedReport[] | undefined;
  const mine = useMemo(
    () => assignments?.filter((item) => item.isMine) ?? [],
    [assignments],
  );
  const others = useMemo(
    () => assignments?.filter((item) => !item.isMine) ?? [],
    [assignments],
  );
  const teams = useMemo(
    () =>
      Array.from(
        new Map(others.map((item) => [item.teamId, item.teamName])).entries(),
      ).sort((a, b) => a[1].localeCompare(b[1])),
    [others],
  );
  const scoped = useMemo(
    () =>
      scope === "mine"
        ? mine
        : others.filter((item) => !team || item.teamId === team),
    [scope, mine, others, team],
  );
  const counts = reportCounts(scoped);
  const visible = useMemo(
    () => filterReports(scoped, filter, query),
    [scoped, filter, query],
  );
  const narrowed = !!query || filter !== "all" || !!team;
  const reset = () => {
    setQuery("");
    setFilter("all");
    setTeam("");
  };
  const filters: [ReportFilter, string][] = [
    ["all", "All"],
    ["active", "Active"],
    ["critical", "Critical"],
    ["resolved", "Resolved"],
  ];
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.assignmentId}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 116 + Math.max(insets.bottom, 12),
          maxWidth: 680,
          width: "100%",
          alignSelf: "center",
        }}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        renderItem={({ item }) => (
          <AssignmentCard
            item={item}
            onPress={() =>
              router.push({
                pathname: "/results",
                params: { reportId: item._id },
              })
            }
          />
        )}
        ListHeaderComponent={
          <View style={{ gap: 20, paddingBottom: 20 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Open field dashboard" onPress={() => router.push("/(root)/(tanod-tabs)/dashboard")} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, minHeight: 56, borderRadius: 22, borderWidth: 1, borderColor: C.border, backgroundColor: pressed ? C.surfaceRaised : C.surface })}>
              <LayoutDashboard color={C.warn} size={20} />
              <Text style={{ flex: 1, color: C.text, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>Field overview</Text>
              <ArrowUpRight color={C.textSub} size={20} />
            </Pressable>
            <View style={{ gap: 6 }}>
              <Text
                style={{
                  color: C.text,
                  fontFamily: "Inter_700Bold",
                  fontSize: 30,
                }}
              >
                Field reports
              </Text>
              <Text style={{ color: C.textSub, fontSize: 13, lineHeight: 20 }}>
                Follow your assignments and team activity in{" "}
                {profile?.assignedBarangay || "your barangay"}.
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                padding: 6,
                borderRadius: 28,
                backgroundColor: C.surfaceRaised,
              }}
            >
              {(["mine", "others"] as const).map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: scope === value }}
                  onPress={() => {
                    setScope(value);
                    reset();
                  }}
                  style={{
                    flex: 1,
                    minHeight: 48,
                    borderRadius: 24,
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 7,
                    backgroundColor:
                      scope === value ? C.surface : "transparent",
                    borderWidth: 1,
                    borderColor:
                      scope === value ? C.borderBright : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color: scope === value ? C.text : C.textSub,
                      fontSize: 13,
                      fontFamily: "Inter_600SemiBold",
                    }}
                  >
                    {value === "mine" ? "My team" : "Other teams"}
                  </Text>
                  {assignments !== undefined && (
                    <Text
                      style={{
                        color: scope === value ? C.warn : C.textDim,
                        fontSize: 12,
                      }}
                    >
                      {value === "mine" ? mine.length : others.length}
                    </Text>
                  )}
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {([{ key: "active", label: "Active", color: C.text }, { key: "critical", label: "Critical", color: C.danger }, { key: "resolved", label: "Resolved", color: C.safe }] as const).map(stat => (
                <Pressable key={stat.key} accessibilityRole="button" accessibilityLabel={`${stat.label}: ${assignments === undefined ? "loading" : counts[stat.key]}. Filter assignments`} accessibilityState={{ selected: filter === stat.key }} onPress={() => setFilter(stat.key)} style={({ pressed }) => ({ flex: 1, minWidth: 85, padding: 14, gap: 8, borderRadius: 22, borderWidth: 1, borderColor: filter === stat.key ? stat.color : C.border, backgroundColor: pressed ? C.surfaceRaised : C.surface })}>
                  <Text style={{ color: stat.color, fontFamily: "Inter_700Bold", fontSize: 26 }}>{assignments === undefined ? "--" : counts[stat.key]}</Text>
                  <Text style={{ color: C.textSub, fontSize: 12, fontWeight: "600" }}>{stat.label}</Text>
                </Pressable>
              ))}
            </View>
            {scope === "others" && (
              <View
                style={{
                  flexDirection: "row",
                  gap: 8,
                  alignItems: "flex-start",
                }}
              >
                <Users color={C.textSub} size={16} />
                <Text
                  style={{
                    flex: 1,
                    color: C.textSub,
                    fontSize: 12,
                    lineHeight: 18,
                  }}
                >
                  Browse other tanod teams&apos; assignments. Their reports are
                  available to view.
                </Text>
              </View>
            )}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                minHeight: 56,
                paddingHorizontal: 16,
                borderWidth: 1,
                borderColor: C.border,
                borderRadius: 20,
                backgroundColor: C.surface,
              }}
            >
              <Search size={18} color={C.textDim} />
              <TextInput
                accessibilityLabel="Search reports by location or team"
                value={query}
                onChangeText={setQuery}
                placeholder="Search location, team or report"
                placeholderTextColor={C.textDim}
                style={{
                  flex: 1,
                  color: C.text,
                  fontSize: 13,
                  paddingVertical: 13,
                }}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
              />
              {!!query && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  onPress={() => setQuery("")}
                  style={{ minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" }}
                >
                  <X size={16} color={C.textSub} />
                </Pressable>
              )}
            </View>
            {scope === "others" && teams.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: !team }}
                  onPress={() => setTeam("")}
                  style={{
                    minHeight: 48,
                    justifyContent: "center",
                    paddingHorizontal: 12,
                    borderRadius: 24,
                    backgroundColor: !team ? C.warnGlow : C.surface,
                  }}
                >
                  <Text
                    style={{ color: !team ? C.warn : C.textSub, fontSize: 12 }}
                  >
                    All teams
                  </Text>
                </Pressable>
                {teams.map(([id, name]) => (
                  <Pressable
                    key={id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: team === id }}
                    onPress={() => setTeam(id)}
                    style={{
                      minHeight: 48,
                      justifyContent: "center",
                      paddingHorizontal: 12,
                      borderRadius: 24,
                      backgroundColor: team === id ? C.warnGlow : C.surface,
                    }}
                  >
                    <Text
                      style={{
                        color: team === id ? C.warn : C.textSub,
                        fontSize: 12,
                      }}
                    >
                      {name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 7 }}
            >
              {filters.map(([value, label]) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: filter === value }}
                  onPress={() => setFilter(value)}
                  style={{
                    minHeight: 48,
                    justifyContent: "center",
                    paddingHorizontal: 14,
                    borderRadius: 24,
                    borderWidth: 1,
                    borderColor: filter === value ? C.warn : C.border,
                    backgroundColor: filter === value ? C.warnGlow : C.surface,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Text
                    style={{
                      color: filter === value ? C.warn : C.textSub,
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    {label}
                  </Text>
                  {assignments !== undefined && <Text style={{ color: filter === value ? C.warn : C.textSub, fontSize: 12, fontWeight: "700", backgroundColor: C.surfaceRaised, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 }}>{counts[value]}</Text>}
                </Pressable>
              ))}
            </ScrollView>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{
                  color: C.text,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 14,
                }}
              >
                {assignments === undefined
                  ? "Loading assignments"
                  : `${visible.length} ${visible.length === 1 ? "assignment" : "assignments"}`}
              </Text>
              <Text style={{ color: C.textDim, fontSize: 12 }}>
                Critical first
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          assignments === undefined ? (
            <ActivityIndicator color={C.warn} style={{ padding: 35 }} />
          ) : (
            <View
              style={{
                padding: 30,
                gap: 12,
                alignItems: "center",
                backgroundColor: C.surface,
                borderRadius: 28,
              }}
            >
              <View style={{ padding: 20, borderRadius: 28, backgroundColor: C.warnGlow }}><ClipboardList color={C.warn} size={28} /></View>
              <Text
                style={{
                  color: C.text,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 17,
                }}
              >
                {narrowed
                  ? "No matching assignments"
                  : scope === "mine"
                    ? "No assignments yet"
                    : "No other team assignments"}
              </Text>
              <Text
                style={{
                  color: C.textSub,
                  textAlign: "center",
                  fontSize: 13,
                  lineHeight: 20,
                }}
              >
                {narrowed
                  ? "Try another location or adjust your filters."
                  : scope === "mine"
                    ? "Reports assigned to your team will appear here."
                    : "Assignments for other teams in your barangay will appear here."}
              </Text>
              {narrowed && (
                <Pressable
                  accessibilityRole="button"
                  onPress={reset}
                  style={{
                    minHeight: 48,
                    justifyContent: "center",
                    paddingHorizontal: 16,
                  }}
                >
                  <Text style={{ color: C.warn, fontWeight: "600" }}>
                    Clear filters
                  </Text>
                </Pressable>
              )}
            </View>
          )
        }
      />
    </View>
  );
}
