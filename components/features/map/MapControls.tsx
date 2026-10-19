import React, { useState } from "react";
import { Modal, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SlidersHorizontal, X, Check } from "lucide-react-native";
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
          borderRadius: 18,
          padding: 12,
          gap: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
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
          <View style={{ flexDirection: "row", gap: 6 }}>
            {options.slice(0, 3).map(([value, label, key]) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: p.filter === value }}
                onPress={() => p.onFilter(value)}
                style={{
                  flex: 1,
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
          </View>
        )}
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
