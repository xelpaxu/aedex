import { useTheme } from "@/context/ThemeContext";
import { useProfile } from "@/context/AccessContext";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Globe2,
  MapPinned,
  ScanLine,
} from "lucide-react-native";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/convex/_generated/api";
import AssignmentCard from "@/components/features/reports/AssignmentCard";
import { filterReports, reportCounts } from "@/lib/tanodReports";

export default function TanodDashboardScreen() {
  const { colors: C } = useTheme();
  const router = useRouter();
  const profile = useProfile();
  const insets = useSafeAreaInsets();
  const assignments = useQuery(api.reports.getAssignedReports, {});
  const summary = useMemo(() => reportCounts(assignments ?? []), [assignments]);
  const queue = useMemo(
    () => filterReports(assignments ?? [], "active").slice(0, 3),
    [assignments],
  );
  const openReports = () => router.push("/(root)/(tanod-tabs)/reports");
  const loading = assignments === undefined;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        padding: 18,
        gap: 24,
        paddingBottom: 100 + Math.max(insets.bottom, 12),
        maxWidth: 680,
        width: "100%",
        alignSelf: "center",
      }}
    >
      <View style={{ gap: 7 }}>
        <Text style={{ color: C.textSub, fontSize: 13 }}>
          {profile?.assignedBarangay || "Your barangay"}
        </Text>
        <Text
          style={{ color: C.text, fontFamily: "Manrope_700Bold", fontSize: 27 }}
        >
          Good day, {profile?.firstName || "Officer"}.
        </Text>
        <Text style={{ color: C.textSub, fontSize: 14 }}>
          Here is your team&apos;s field overview.
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="View my team assignments"
        onPress={openReports}
        style={{
          backgroundColor: C.surface,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: C.border,
          overflow: "hidden",
        }}
      >
        <View style={{ padding: 20, gap: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                padding: 10,
                borderRadius: 12,
                backgroundColor: C.warnGlow,
              }}
            >
              <ClipboardList color={C.warn} size={20} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text
                style={{
                  color: C.text,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 14,
                }}
              >
                {assignments?.[0]?.teamName || "My team"}
              </Text>
              <Text style={{ color: C.textSub, fontSize: 12 }}>
                Assignment overview
              </Text>
            </View>
            <ArrowRight size={20} color={C.textDim} />
          </View>
          <View
            style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}
          >
            {loading ? (
              <ActivityIndicator color={C.warn} />
            ) : (
              <Text
                style={{
                  color: C.text,
                  fontFamily: "Manrope_700Bold",
                  fontSize: 44,
                }}
              >
                {summary.active}
              </Text>
            )}
            <Text style={{ color: C.textSub, fontSize: 15 }}>
              active assignments
            </Text>
          </View>
          <Text style={{ color: C.textSub, fontSize: 13, lineHeight: 20 }}>
            {loading
              ? "Loading the latest assignments..."
              : summary.critical
                ? `${summary.critical} critical ${summary.critical === 1 ? "site needs" : "sites need"} priority attention.`
                : summary.active
                  ? "Review your queue and plan the next site visit."
                  : "No active assignments. Check the map for local activity."}
          </Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            borderTopWidth: 1,
            borderTopColor: C.border,
            backgroundColor: C.surfaceRaised,
          }}
        >
          {[
            { label: "Critical", value: summary.critical, color: C.danger },
            { label: "Resolved", value: summary.resolved, color: C.safe },
            { label: "Total", value: summary.all, color: C.text },
          ].map(({ label, value, color }, index) => (
            <View
              key={label}
              style={{
                flex: 1,
                paddingVertical: 15,
                alignItems: "center",
                gap: 4,
                borderLeftWidth: index ? 1 : 0,
                borderLeftColor: C.border,
              }}
            >
              <Text
                style={{ color, fontFamily: "Inter_600SemiBold", fontSize: 20 }}
              >
                {loading ? "--" : value}
              </Text>
              <Text style={{ color: C.textSub, fontSize: 11 }}>{label}</Text>
            </View>
          ))}
        </View>
      </Pressable>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/(root)/(tanod-tabs)/map")}
          style={{
            flex: 1,
            backgroundColor: C.warnGlow,
            borderColor: C.warn + "40",
            borderWidth: 1,
            borderRadius: 16,
            padding: 16,
            gap: 12,
          }}
        >
          <MapPinned color={C.warn} size={23} />
          <View style={{ gap: 5 }}>
            <Text
              style={{
                color: C.text,
                fontFamily: "Inter_600SemiBold",
                fontSize: 14,
              }}
            >
              Field map
            </Text>
            <Text style={{ color: C.textSub, fontSize: 12, lineHeight: 18 }}>
              Locate assigned sites
            </Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/(root)/capture")}
          style={{
            flex: 1,
            backgroundColor: C.surface,
            borderColor: C.border,
            borderWidth: 1,
            borderRadius: 16,
            padding: 16,
            gap: 12,
          }}
        >
          <ScanLine color={C.textSub} size={23} />
          <View style={{ gap: 5 }}>
            <Text
              style={{
                color: C.text,
                fontFamily: "Inter_600SemiBold",
                fontSize: 14,
              }}
            >
              New report
            </Text>
            <Text style={{ color: C.textSub, fontSize: 12, lineHeight: 18 }}>
              Capture a site photo
            </Text>
          </View>
        </Pressable>
      </View>
      <View style={{ gap: 12 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Text
              style={{
                color: C.text,
                fontFamily: "Inter_600SemiBold",
                fontSize: 18,
              }}
            >
              Next assignments
            </Text>
            <Text style={{ color: C.textSub, fontSize: 12 }}>
              Critical sites appear first
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View all team assignments"
            onPress={openReports}
            style={{
              minHeight: 44,
              paddingHorizontal: 8,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Text style={{ color: C.warn, fontSize: 12, fontWeight: "600" }}>
              View all
            </Text>
            <ChevronRight size={16} color={C.warn} />
          </Pressable>
        </View>
        {loading ? (
          <ActivityIndicator color={C.warn} style={{ padding: 24 }} />
        ) : queue.length ? (
          queue.map((item) => (
            <AssignmentCard
              key={item.assignmentId}
              item={item}
              onPress={() =>
                router.push({
                  pathname: "/results",
                  params: { reportId: item._id },
                })
              }
            />
          ))
        ) : (
          <View
            style={{
              alignItems: "center",
              padding: 24,
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: C.border,
              borderRadius: 18,
              gap: 9,
            }}
          >
            <CheckCircle2 color={C.safe} size={28} />
            <Text
              style={{
                color: C.text,
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
              }}
            >
              No active assignments
            </Text>
            <Text
              style={{
                color: C.textSub,
                fontSize: 13,
                textAlign: "center",
                lineHeight: 20,
              }}
            >
              New assignments will appear here when they are assigned to your
              team.
            </Text>
          </View>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/community-feed")}
        style={{
          flexDirection: "row",
          gap: 12,
          alignItems: "center",
          paddingVertical: 16,
          borderTopWidth: 1,
          borderTopColor: C.border,
        }}
      >
        <Globe2 color={C.textSub} size={21} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            style={{
              color: C.text,
              fontSize: 14,
              fontFamily: "Inter_600SemiBold",
            }}
          >
            Community updates
          </Text>
          <Text style={{ color: C.textSub, fontSize: 12 }}>
            See what residents are reporting
          </Text>
        </View>
        <ChevronRight size={18} color={C.textDim} />
      </Pressable>
    </ScrollView>
  );
}
