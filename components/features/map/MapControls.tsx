import React, { useState } from "react";
import { Image, Modal, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  SlidersHorizontal,
  X,
  Check,
  Maximize2,
  Minimize2,
  MapPin,
} from "lucide-react-native";
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
      <View style={{ gap: 8 }} pointerEvents="box-none">
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: C.surface,
            borderRadius: 26,
            padding: 10,
            borderWidth: 1,
            borderColor: C.border,
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 5,
          }}
        >
          <MapPin size={19} color={accent} style={{ marginLeft: 8 }} />
          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              style={{
                color: C.text,
                fontFamily: "Inter_600SemiBold",
                fontSize: 14,
              }}
            >
              {p.barangay || "Community map"}
            </Text>
            <Text style={{ color: C.textSub, fontSize: 12, marginTop: 4 }}>
              {selected?.[1]} · {p.counts[selected?.[2] || "all"] ?? 0} sites
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              p.expanded ? "Exit focused map view" : "Use focused map view"
            }
            onPress={p.onExpand}
            style={{ padding: 14 }}
          >
            {p.expanded ? (
              <Minimize2 size={18} color={C.textSub} />
            ) : (
              <Maximize2 size={18} color={C.textSub} />
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Map filters and layers"
            onPress={() => setOpen(true)}
            style={{
              padding: 14,
              borderRadius: 24,
              backgroundColor: C.surfaceRaised,
            }}
          >
            <SlidersHorizontal color={C.text} size={20} />
          </Pressable>
        </View>
        {!p.expanded && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingBottom: 6 }}
          >
            {options.map(([value, label, key]) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: p.filter === value }}
                onPress={() => p.onFilter(value)}
                style={{
                  minHeight: 48,
                  paddingHorizontal: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 7,
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: p.filter === value ? accent : C.border,
                  backgroundColor: p.filter === value ? (p.tanod ? C.warnGlow : C.accentGlow) : C.surface,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color:
                      p.filter === value ? accent : C.text,
                  }}
                >
                  {label}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    color:
                      p.filter === value ? accent : C.textSub,
                  }}
                >
                  {p.counts[key] ?? 0}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
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
              maxHeight: "92%",
              width: "100%",
              maxWidth: 640,
              alignSelf: "center",
              backgroundColor: C.surface,
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
            }}
          >
            <View style={{ alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: C.borderBright, marginTop: 10 }} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, gap: 24 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ padding: 14, borderRadius: 20, backgroundColor: C.surfaceRaised }}><SlidersHorizontal color={accent} size={24} /></View>
                <View style={{ flex: 1, gap: 4 }}><Text accessibilityRole="header" style={{ color: C.text, fontFamily: "Manrope_700Bold", fontSize: 24 }}>Your map, your view</Text><Text style={{ color: C.textSub, fontSize: 13 }}>Filters & layers</Text></View>
                <Pressable accessibilityRole="button" accessibilityLabel="Close map options" onPress={() => setOpen(false)} style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, backgroundColor: pressed ? C.surfaceRaised : C.bg, alignItems: "center", justifyContent: "center" })}><X color={C.text} size={20} /></Pressable>
              </View>
              <View style={{ gap: 12 }}>
                <Text accessibilityRole="header" style={{ color: C.text, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>Show sites</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  {options.map(([value, label, key]) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: p.filter === value }} onPress={() => p.onFilter(value)} style={({ pressed }) => ({ flexGrow: 1, flexBasis: "44%", minHeight: 56, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: p.filter === value ? accent : C.border, backgroundColor: pressed || p.filter === value ? C.surfaceRaised : C.surface, flexDirection: "row", alignItems: "center", gap: 8 })}>
                    <Text style={{ flex: 1, color: C.text, fontWeight: "600", fontSize: 13 }}>{label}</Text>
                    <Text style={{ color: C.textSub, fontSize: 12 }}>{p.counts[key] ?? 0}</Text>
                    {p.filter === value && <Check color={accent} size={16} />}
                  </Pressable>)}
                </View>
              </View>
              <View style={{ gap: 12 }}>
                <View style={{ gap: 4 }}><Text accessibilityRole="header" style={{ color: C.text, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>Map style</Text><Text style={{ color: C.textSub, fontSize: 13 }}>Choose how you explore your community.</Text></View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                  {(["vector", "satellite"] as const).map(mode => <Pressable key={mode} accessibilityRole="radio" accessibilityLabel={mode === "vector" ? "Street map" : "Satellite"} accessibilityState={{ checked: p.mode === mode }} onPress={() => p.onMode(mode)} style={({ pressed }) => ({ flex: 1, minWidth: 125, borderRadius: 22, overflow: "hidden", borderWidth: 2, borderColor: p.mode === mode ? accent : C.border, backgroundColor: pressed ? C.surfaceRaised : C.bg, opacity: pressed ? 0.85 : 1 })}>
                    <MapStylePreview mode={mode} />
                    <View style={{ padding: 14, gap: 6 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Text style={{ flex: 1, color: C.text, fontWeight: "700", fontSize: 14 }}>{mode === "vector" ? "Street map" : "Satellite"}</Text><View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: p.mode === mode ? accent : C.borderBright, backgroundColor: p.mode === mode ? accent : "transparent", alignItems: "center", justifyContent: "center" }}>{p.mode === mode && <Check color={p.tanod ? "#111827" : "#FFFFFF"} size={14} />}</View></View>
                      <Text style={{ color: C.textSub, fontSize: 12, lineHeight: 18 }}>{mode === "vector" ? "Roads & place names" : "Terrain & aerial detail"}</Text>
                    </View>
                  </Pressable>)}
                </View>
              </View>
              <View style={{ gap: 12 }}>
                <Text accessibilityRole="header" style={{ color: C.text, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>Map overlays</Text>
                <View style={{ borderWidth: 1, borderColor: C.border, borderRadius: 22, paddingHorizontal: 16, backgroundColor: C.bg }}>
                  {[{ label: "Risk zones", detail: "Highlight areas around reported risks", value: p.zones, onChange: p.onZones }, { label: "Report pins", detail: "Show individual reported locations", value: p.pins, onChange: p.onPins }].map((layer, i) => <View key={layer.label} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 18, borderTopWidth: i ? 1 : 0, borderColor: C.border }}><View style={{ flex: 1, gap: 5 }}><Text style={{ color: C.text, fontWeight: "600", fontSize: 14 }}>{layer.label}</Text><Text style={{ color: C.textSub, fontSize: 12, lineHeight: 18 }}>{layer.detail}</Text></View><Switch accessibilityLabel={`Show ${layer.label.toLowerCase()}`} trackColor={{ false: C.borderBright, true: accent }} value={layer.value} onValueChange={layer.onChange} /></View>)}
                </View>
              </View>
              <Pressable accessibilityRole="button" onPress={() => { p.onExpand(); setOpen(false); }} style={({ pressed }) => ({ padding: 16, minHeight: 52, borderRadius: 18, backgroundColor: pressed ? C.surfaceRaised : C.bg, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 })}><Maximize2 color={C.textSub} size={18} /><Text style={{ color: C.text, fontWeight: "600" }}>{p.expanded ? "Exit focused view" : "Use focused map view"}</Text></Pressable>
            </ScrollView>
            <View style={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: 16, borderTopWidth: 1, borderTopColor: C.border }}>
              <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={({ pressed }) => ({ minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: accent, opacity: pressed ? 0.8 : 1 })}>
                <Text style={{ color: p.tanod ? "#111827" : "#FFFFFF", fontWeight: "700", fontSize: 15 }}>Back to map</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

function MapStylePreview({ mode }: { mode: "vector" | "satellite" }) {
  const [failed, setFailed] = useState(false);
  const satellite = mode === "satellite";
  return <View style={{ height: 116, backgroundColor: satellite ? "#263E32" : "#E8EDE3", overflow: "hidden" }}>
    {!failed ? <Image accessible={false} onError={() => setFailed(true)} source={{ uri: satellite ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/14/7702/13767" : "https://tile.openstreetmap.org/14/13767/7702.png" }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 6 }}><MapPin color={satellite ? "#FFFFFF" : "#48635C"} size={24} /><Text style={{ color: satellite ? "#FFFFFF" : "#48635C", fontSize: 11 }}>Preview unavailable</Text></View>}
    <Text style={{ position: "absolute", bottom: 0, right: 0, backgroundColor: "#FFFFFFE8", color: "#263E32", fontSize: 9, paddingHorizontal: 4, paddingVertical: 2 }}>{satellite ? "Tiles: Esri" : "(c) OpenStreetMap contributors"}</Text>
  </View>;
}
