import React, { useState } from "react";
import { Modal, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SlidersHorizontal, X, Check, Layers, Maximize2, Minimize2, MapPin } from "lucide-react-native";
import { useTheme } from "@/context/ThemeContext";
type Props = {
  tanod: boolean;
  barangay?: string;
  filter: string;
  onFilter: (value: string) => void;
  counts: Record<string, number>;
  mode: "vector" | "satellite";
  onMode: (mode: "vector" | "satellite") => void;
  zones: boolean;
  onZones: (value: boolean) => void;
  pins: boolean;
  onPins: (value: boolean) => void;
  expanded: boolean;
  onExpand: () => void;
};
export default function MapControls(p: Props) {
  const { colors: C } = useTheme();
  const [open, setOpen] = useState(false);
  const accent = p.tanod ? C.warn : C.accent;
  const options = p.tanod
    ? [
        ["ASSIGNED", "My team", "assigned"],
        ["CRITICAL", "Urgent", "critical"],
        ["ALL", "All sites", "all"],
        ["PENDING", "Pending", "pending"],
        ["RESOLVED", "Resolved", "resolved"],
      ]
    : [
        ["ALL", "All sites", "all"],
        ["NEARBY", "Nearby", "nearby"],
        ["CRITICAL", "Critical", "critical"],
        ["RESOLVED", "Treated", "resolved"],
      ];
  const selected = options.find((o) => o[0] === p.filter);
  return (
    <>
      <View
        style={{
          backgroundColor: C.surface,
          borderColor: C.border,
          borderWidth: 1,
          borderRadius: 22,
          shadowColor: "#000", shadowOpacity: 0.14, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 6,
          padding: 14,
          gap: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ padding: 10, borderRadius: 14, backgroundColor: p.tanod ? C.warnGlow : C.accentGlow }}><MapPin color={accent} size={22} /></View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: accent, fontSize: 11, fontWeight: "700" }}>
              {p.tanod ? "FIELD OPERATIONS" : "COMMUNITY MAP"}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                color: C.text,
                fontWeight: "600",
                fontSize: 14,
                marginTop: 3,
              }}
            >
              {p.barangay || "Pilot area"} · {selected?.[1]}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Map filters and layers"
            onPress={() => setOpen(true)}
            style={{
              minHeight: 44,
              minWidth: 44,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 12,
              backgroundColor: C.surfaceRaised,
            }}
          >
            <SlidersHorizontal color={C.text} size={20} />
          </Pressable>
        </View>
        {!p.expanded && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>
            {options.map(([value, label, key]) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: p.filter === value }}
                onPress={() => p.onFilter(value)}
                style={{
                  minWidth: 90,
                  minHeight: 44,
                  justifyContent: "center",
                  alignItems: "center",
                  paddingHorizontal: 4,
                  borderRadius: 10,
                  backgroundColor:
                    p.filter === value ? accent : C.surfaceRaised,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color:
                      p.filter === value
                        ? p.tanod
                          ? "#111827"
                          : "#fff"
                        : C.text,
                  }}
                >
                  {label} {p.counts[key] ?? 0}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
        {!p.expanded && <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Switch map style" onPress={() => p.onMode(p.mode === "vector" ? "satellite" : "vector")} style={{ flex: 1, flexDirection: "row", gap: 7, alignItems: "center", padding: 12, borderRadius: 12, backgroundColor: C.surfaceRaised }}>
            <Layers color={accent} size={17} /><Text style={{ color: C.text, fontSize: 12, fontWeight: "600" }}>{p.mode === "vector" ? "Street map" : "Satellite"}</Text>
          </Pressable>
          <Pressable accessibilityRole="switch" accessibilityState={{ checked: p.zones }} accessibilityLabel="Risk zones" onPress={() => p.onZones(!p.zones)} style={{ padding: 12, borderRadius: 12, backgroundColor: p.zones ? C.accentGlow : C.surfaceRaised }}>
            <Text style={{ color: p.zones ? C.accent : C.textSub, fontSize: 12, fontWeight: "600" }}>Risk zones {p.zones ? "on" : "off"}</Text>
          </Pressable>
        </View>}
        <Pressable accessibilityRole="button" onPress={p.onExpand} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 36 }}>
          {p.expanded ? <Minimize2 size={15} color={accent} /> : <Maximize2 size={15} color={accent} />}
          <Text style={{ color: accent, fontSize: 12, fontWeight: "600" }}>{p.expanded ? "Show map controls" : "Focus on the map"}</Text>
        </Pressable>
      </View>
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(0,0,0,.45)",
          }}
        >
          <Pressable
            accessibilityLabel="Close map options"
            style={{ flex: 1 }}
            onPress={() => setOpen(false)}
          />
          <SafeAreaView
            edges={["bottom"]}
            style={{
              maxHeight: "85%",
              backgroundColor: C.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
            }}
          >
            <ScrollView contentContainerStyle={{ padding: 22, gap: 18 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{ color: C.text, fontSize: 20, fontWeight: "700" }}
                >
                  Map options
                </Text>
                <Pressable
                  accessibilityLabel="Close map options"
                  onPress={() => setOpen(false)}
                  style={{ padding: 10 }}
                >
                  <X color={C.text} size={22} />
                </Pressable>
              </View>
              <Text style={{ color: C.textSub, fontSize: 13 }}>
                Show on the map
              </Text>
              <View style={{ gap: 8 }}>
                {options.map(([value, label, key]) => (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: p.filter === value }}
                    onPress={() => {
                      p.onFilter(value);
                      setOpen(false);
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      borderRadius: 12,
                      padding: 14,
                      backgroundColor: C.surfaceRaised,
                    }}
                  >
                    <Text style={{ color: C.text, flex: 1, fontWeight: "600" }}>
                      {label}
                    </Text>
                    <Text style={{ color: C.textSub }}>
                      {p.counts[key] ?? 0}
                    </Text>
                    {p.filter === value && <Check color={accent} size={18} />}
                  </Pressable>
                ))}
              </View>
              <Text style={{ color: C.textSub, fontSize: 13 }}>Map style</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {(["vector", "satellite"] as const).map((mode) => (
                  <Pressable
                    key={mode}
                    accessibilityState={{ selected: p.mode === mode }}
                    onPress={() => p.onMode(mode)}
                    style={{
                      flex: 1,
                      padding: 14,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: p.mode === mode ? accent : C.border,
                    }}
                  >
                    <Text style={{ color: C.text, textAlign: "center" }}>
                      {mode === "vector" ? "Street map" : "Satellite"}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ color: C.text }}>Risk zones</Text>
                <Switch
                  accessibilityLabel="Show risk zones"
                  value={p.zones}
                  onValueChange={p.onZones}
                />
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ color: C.text }}>Report pins</Text>
                <Switch
                  accessibilityLabel="Show report pins"
                  value={p.pins}
                  onValueChange={p.onPins}
                />
              </View>
              <Pressable
                onPress={() => {
                  p.onExpand();
                  setOpen(false);
                }}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: C.surfaceRaised,
                }}
              >
                <Text style={{ color: C.text, textAlign: "center" }}>
                  {p.expanded ? "Exit focused view" : "Use focused map view"}
                </Text>
              </Pressable>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}
