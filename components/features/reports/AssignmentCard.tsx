import { CheckCircle2, ChevronRight, MapPin, Users } from "lucide-react-native";
import { useState } from "react";
import { Image, Pressable, View } from "react-native";
import { Text } from "@/components/Typography";
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
  const [failedPhoto, setFailedPhoto] = useState(false);
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
        borderRadius: 26,
        borderWidth: 1,
        borderColor: critical ? C.danger + "45" : C.border,
        backgroundColor: pressed ? C.surfaceRaised : C.surface,
        padding: 20,
        gap: 16,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {photo && !failedPhoto ? (
          <Image
            source={{ uri: photo }}
            onError={() => setFailedPhoto(true)}
            accessible={false}
            style={{ width: 68, height: 80, borderRadius: 20 }}
          />
        ) : (
          <View
            style={{
              width: 68,
              height: 80,
              borderRadius: 20,
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
            style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: C.text, textTransform: "capitalize", alignSelf: "flex-start", backgroundColor: resolved ? C.safeGlow : critical ? C.dangerGlow : C.warnGlow, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderLeftWidth: 3, borderLeftColor: color }}
          >
            {label}
          </Text>
          <Text
            numberOfLines={2}
            style={{
              color: C.text,
              fontFamily: "Inter_600SemiBold",
              fontSize: 17,
              lineHeight: 24,
            }}
          >
            {item.locationName || "Reported site"}
          </Text>
          <Text style={{ color: C.textSub, fontSize: 12 }}>
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
          paddingTop: 16,
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
            fontSize: 12,
            fontWeight: "600",
          }}
        >
          {item.isMine ? "My team" : "View only"}
        </Text>
      </View>
    </Pressable>
  );
}
