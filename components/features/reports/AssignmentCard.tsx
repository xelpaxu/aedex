import { CheckCircle2, ChevronRight, MapPin, Users } from "lucide-react-native";
import { Image, Pressable, Text, View } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { AssignedReport, isCritical, isResolved } from "@/lib/tanodReports";

export default function AssignmentCard({
  item,
  onPress,
}: {
  item: AssignedReport;
  onPress: () => void;
}) {
  const { colors: C } = useTheme();
  const resolved = isResolved(item);
  const critical = isCritical(item);
  const color = resolved ? C.safe : critical ? C.danger : C.warn;
  const label = resolved
    ? "Resolved"
    : critical
      ? "Critical"
      : item.assignmentStatus;
  const rawPhoto = item.processedImage || item.imageUri;
  const photo = !rawPhoto
    ? ""
    : /^(https?:|data:|file:)/.test(rawPhoto)
      ? rawPhoto
      : `data:image/jpeg;base64,${rawPhoto}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${item.locationName}, assigned to ${item.teamName}. View report`}
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: 16,
        borderWidth: 1,
        borderColor: critical ? C.danger + "45" : C.border,
        backgroundColor: pressed ? C.surfaceRaised : C.surface,
        padding: 16,
        gap: 13,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {photo ? (
          <Image
            source={{ uri: photo }}
            style={{ width: 64, height: 72, borderRadius: 12 }}
          />
        ) : (
          <View
            style={{
              width: 58,
              height: 64,
              borderRadius: 12,
              backgroundColor: resolved
                ? C.safeGlow
                : critical
                  ? C.dangerGlow
                  : C.warnGlow,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {resolved ? (
              <CheckCircle2 color={color} size={24} />
            ) : (
              <MapPin color={color} size={24} />
            )}
          </View>
        )}
        <View style={{ flex: 1, gap: 5 }}>
          <Text
            style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color, textTransform: "capitalize" }}
          >
            {label}
          </Text>
          <Text
            numberOfLines={2}
            style={{
              color: C.text,
              fontFamily: "Inter_600SemiBold",
              fontSize: 16,
              lineHeight: 21,
            }}
          >
            {item.locationName || "Reported site"}
          </Text>
          <Text style={{ color: C.textSub, fontSize: 11 }}>
            Assigned{" "}
            {new Date(item.assignedAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </Text>
        </View>
        <ChevronRight size={18} color={C.textDim} />
      </View>
      <Text
        numberOfLines={2}
        style={{ color: C.textSub, fontSize: 13, lineHeight: 20 }}
      >
        {item.reasoning ||
          item.description ||
          "Open the report to review site evidence and assignment details."}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 7,
          borderTopWidth: 1,
          borderTopColor: C.border,
          paddingTop: 11,
        }}
      >
        <Users color={C.textSub} size={14} />
        <Text
          numberOfLines={1}
          style={{ flex: 1, color: C.textSub, fontSize: 12 }}
        >
          {item.teamName}
        </Text>
        <Text
          style={{
            color: item.isMine ? C.warn : C.textDim,
            fontSize: 11,
            fontWeight: "600",
          }}
        >
          {item.isMine ? "My team" : "View only"}
        </Text>
      </View>
    </Pressable>
  );
}
