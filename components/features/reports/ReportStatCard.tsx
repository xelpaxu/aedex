import { View } from "react-native";
import { Text, useAccountTheme } from "@/components/AccountUI";
interface StatsProps { total: number; resolved: number; active: number; pending: number }
export default function ReportStatsCard({ total, resolved, active, pending }: StatsProps) {
  const { colors: C } = useAccountTheme();
  return <View style={{ marginHorizontal: 20, marginBottom: 28, padding: 20, borderRadius: 20, backgroundColor: C.surface, borderWidth: 0.5, borderColor: C.border }}>
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10, marginBottom: 20 }}><Text style={{ color: C.text, fontSize: 40, fontWeight: "700", letterSpacing: -1 }}>{total}</Text><Text style={{ color: C.textSub, fontSize: 15 }}>reports submitted</Text></View>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16, paddingTop: 18, borderTopWidth: 0.5, borderColor: C.border }}>
      {[{ label: "In review", value: pending }, { label: "Verified", value: active }, { label: "Resolved", value: resolved }].map(stat => <View key={stat.label} style={{ flex: 1, minWidth: 65, gap: 6 }}><Text style={{ color: C.actionText, fontSize: 24, fontWeight: "600" }}>{stat.value}</Text><Text style={{ color: C.textSub, fontSize: 13 }}>{stat.label}</Text></View>)}
    </View>
  </View>;
}
