import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { ThemeColors, useTheme } from "../../../context/ThemeContext";

interface StatsProps {
  total: number;
  resolved: number;
  active: number;
  pending: number;
}

// ─── Animated count-up number ─────────────────────────────────────────────────
const CountUp = ({
  value,
  color,
  size = 22,
}: {
  value: number;
  color: string;
  size?: number;
}) => {
  const anim = useRef(new Animated.Value(0)).current;
  const displayed = useRef(0);
  const [display, setDisplay] = React.useState(0);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    const listener = anim.addListener(({ value: v }) => {
      const rounded = Math.round(v);
      if (rounded !== displayed.current) {
        displayed.current = rounded;
        setDisplay(rounded);
      }
    });
    return () => anim.removeListener(listener);
  }, [value]);

  return (
    <Text
      style={{ fontSize: size, fontWeight: "800", color, letterSpacing: -0.5 }}
    >
      {display}
    </Text>
  );
};

// ─── Single stat cell ─────────────────────────────────────────────────────────
const StatCell = ({
  value,
  label,
  color,
  glowColor,
  textColor,
}: {
  value: number;
  label: string;
  color: string;
  glowColor: string;
  textColor: string;
}) => (
  <View
    style={[
      cell.wrap,
      { backgroundColor: glowColor, borderColor: color + "30" },
    ]}
  >
    <CountUp value={value} color={color} size={24} />
    <Text style={[cell.label, { color: textColor }]}>{label}</Text>
    {/* Bottom accent line */}
    <View style={[cell.line, { backgroundColor: color }]} />
  </View>
);

const cell = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    position: "relative",
    overflow: "hidden",
  },
  label: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginTop: 5,
    textTransform: "uppercase",
  },
  line: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.7,
  },
});

// ─── Main card ────────────────────────────────────────────────────────────────
export default function ReportStatsCard({
  total,
  resolved,
  active,
  pending,
}: StatsProps) {
  const { colors: C } = useTheme();

  // Fade + slide in on mount
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const styles = useMemo(() => createStyles(C), [C]);

  return (
    <Animated.View
      style={[
        styles.card,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* ── Header row ── */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.sectionDash} />
          <Text style={styles.sectionLabel}>YOUR ACTIVITY</Text>
        </View>
        {/* Live indicator */}
        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* ── Total ── */}
      <View style={styles.totalRow}>
        <CountUp value={total} color={C.accent} size={52} />
        <View style={styles.totalMeta}>
          <Text style={styles.totalLabel}>TOTAL{"\n"}REPORTS</Text>
          <View style={styles.totalAccentBar} />
        </View>
      </View>

      {/* ── Divider ── */}
      <View style={styles.hdivider} />

      {/* ── Stat cells ── */}
      <View style={styles.cellRow}>
        <StatCell
          value={resolved}
          label="Resolved"
          color={C.safe}
          glowColor={C.safeGlow}
          textColor={C.textSub}
        />
        <StatCell
          value={active}
          label="Active"
          color={C.danger}
          glowColor={C.dangerGlow}
          textColor={C.textSub}
        />
        <StatCell
          value={pending}
          label="Pending"
          color={C.warn}
          glowColor={C.warnGlow}
          textColor={C.textSub}
        />
      </View>
    </Animated.View>
  );
}

const createStyles = (C: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: C.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: C.border,
      marginHorizontal: 20,
      marginBottom: 24,
      padding: 20,
      overflow: "hidden",
    },

    // Header
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
    sectionDash: {
      width: 20,
      height: 2,
      backgroundColor: C.accent,
      borderRadius: 1,
    },
    sectionLabel: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 2,
      color: C.textSub,
    },
    livePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: C.safeGlow,
      borderWidth: 1,
      borderColor: C.safe + "40",
      paddingVertical: 4,
      paddingHorizontal: 9,
      borderRadius: 7,
    },
    liveDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: C.safe,
      shadowColor: C.safe,
      shadowOpacity: 1,
      shadowRadius: 4,
      elevation: 4,
    },
    liveText: {
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1.2,
      color: C.safe,
    },

    // Total
    totalRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginBottom: 20,
    },
    totalMeta: { gap: 6 },
    totalLabel: {
      fontSize: 11,
      fontWeight: "800",
      color: C.textSub,
      letterSpacing: 1.5,
      lineHeight: 16,
    },
    totalAccentBar: {
      width: 32,
      height: 2,
      backgroundColor: C.accent,
      borderRadius: 1,
    },

    // Divider
    hdivider: { height: 1, backgroundColor: C.border, marginBottom: 14 },

    // Cells
    cellRow: { flexDirection: "row", gap: 8 },
  });
