import { Calendar, ChevronRight } from "lucide-react-native";
import React, { useMemo } from "react";
import {
  Image,
  ImageSourcePropType,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemeColors, useTheme } from "../../../context/ThemeContext";

interface HistoryItemProps {
  image: ImageSourcePropType;
  location: string;
  date: string;
  isUrgent?: boolean;
  onPress?: () => void;
}

export default function HistoryItemCard({
  image,
  location,
  date,
  isUrgent,
  onPress,
}: HistoryItemProps) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <Image
        source={typeof image === "string" ? { uri: image } : image}
        style={styles.thumbnail}
        resizeMode="cover"
      />

      <View style={styles.content}>
        <Text style={styles.locationText} numberOfLines={1}>
          {location}
        </Text>
        <View style={styles.dateRow}>
          <Calendar size={12} color={C.textSub} />
          <Text style={styles.dateText}>{date}</Text>
        </View>
        {isUrgent && (
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentText}>Urgent</Text>
          </View>
        )}
      </View>

      <ChevronRight size={20} color={C.textDim} />
    </TouchableOpacity>
  );
}

const createStyles = (C: ThemeColors) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.border,
      padding: 12,
      marginHorizontal: 20,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    thumbnail: {
      width: 80,
      height: 60,
      borderRadius: 10,
      backgroundColor: C.surfaceRaised,
    },
    content: {
      flex: 1,
      marginLeft: 12,
    },
    locationText: {
      fontSize: 14,
      fontWeight: "700",
      color: C.text,
      marginBottom: 4,
    },
    dateRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 6,
    },
    dateText: {
      fontSize: 11,
      color: C.textSub,
      marginLeft: 4,
    },
    urgentBadge: {
      backgroundColor: C.danger,
      alignSelf: "flex-start",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    urgentText: {
      color: "#FFFFFF",
      fontSize: 11,
      fontWeight: "700",
    },
  });
