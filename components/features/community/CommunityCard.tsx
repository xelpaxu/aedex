import { useState } from "react";
import { Image, Pressable, View } from "react-native";
import { ChevronRight, ImageOff, MessageCircle, Send, ThumbsUp } from "lucide-react-native";
import { Text, useAccountTheme } from "@/components/AccountUI";

type Props = { image?: string; userName: string; location: string; timestamp: string; status: string; caption?: string; isFullWidth?: boolean; userAvatar?: string; onPress: () => void; onHelpfulPress?: () => void; isHelpful?: boolean; helpfulCount?: number; onCommentPress?: () => void; commentCount?: number; onSharePress?: () => void };
export default function PostCard({ image, userName, location, timestamp, status, caption, onPress, onHelpfulPress, isHelpful, helpfulCount = 0, onCommentPress, commentCount = 0, onSharePress }: Props) {
  const { colors: C } = useAccountTheme();
  const [failedUri, setFailedUri] = useState<string | undefined>();
  const [expandedCaption, setExpandedCaption] = useState(false);
  const initials = userName.trim().split(/\s+/).filter(Boolean).map(part => part[0]).slice(0, 2).join("").toUpperCase() || "A";
  return <View style={{ backgroundColor: C.surface, paddingBottom: 24 }}>
    <View style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: C.surfaceRaised }}><Text style={{ color: C.actionText, fontSize: 14, fontWeight: "600" }}>{initials}</Text></View>
      <View style={{ flex: 1, gap: 4 }}><Text style={{ color: C.text, fontSize: 15, fontWeight: "600" }}>{userName}</Text><Text style={{ color: C.textSub, fontSize: 12 }}>{location}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Open report details" onPress={onPress} style={({ pressed }) => ({ width: 48, height: 48, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.5 : 1 })}><ChevronRight size={22} color={C.textSub} /></Pressable>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={`View report photo from ${location}`} onPress={onPress} style={{ width: "100%", aspectRatio: 1, maxHeight: 640, backgroundColor: C.surfaceRaised }}>
      {image && failedUri !== image ? <Image source={{ uri: image }} onError={() => setFailedUri(image)} resizeMode="cover" style={{ width: "100%", height: "100%" }} /> : <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}><ImageOff size={30} color={C.textSub} /><Text style={{ color: C.textSub, fontSize: 14 }}>Photo unavailable</Text></View>}
    </Pressable>
    <View style={{ paddingHorizontal: 16, gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 4 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={isHelpful ? "Remove helpful reaction" : "Mark report helpful"} accessibilityState={{ selected: !!isHelpful }} onPress={onHelpfulPress} style={({ pressed }) => ({ width: 48, height: 48, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.5 : 1 })}><ThumbsUp size={25} color={isHelpful ? C.actionText : C.text} fill={isHelpful ? C.accentGlow : "transparent"} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`View comments, ${commentCount} comments`} onPress={onCommentPress} style={({ pressed }) => ({ width: 48, height: 48, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.5 : 1 })}><MessageCircle size={26} color={C.text} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Share report" onPress={onSharePress} style={({ pressed }) => ({ width: 48, height: 48, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.5 : 1 })}><Send size={25} color={C.text} /></Pressable>
        <Text style={{ flex: 1, textAlign: "right", color: C.textSub, fontSize: 12, flexShrink: 1 }}>{status}</Text>
      </View>
      {helpfulCount > 0 && <Text style={{ color: C.text, fontSize: 14, fontWeight: "600" }}>{helpfulCount} found this helpful</Text>}
      <Text numberOfLines={expandedCaption ? undefined : 3} style={{ color: C.text, fontSize: 15, lineHeight: 23 }}><Text style={{ fontWeight: "600" }}>{userName} </Text>{caption || `Reported a site in ${location}.`}</Text>
      {!!caption && caption.length > 140 && <Pressable accessibilityRole="button" accessibilityState={{ expanded: expandedCaption }} accessibilityLabel={expandedCaption ? "Collapse caption" : "Read full caption"} onPress={() => setExpandedCaption(value => !value)} style={({ pressed }) => ({ minHeight: 44, justifyContent: "center", opacity: pressed ? 0.5 : 1 })}><Text style={{ color: C.actionText, fontSize: 14 }}>{expandedCaption ? "Show less" : "Read more"}</Text></Pressable>}
      <Pressable accessibilityRole="button" accessibilityLabel="Open comments" onPress={onCommentPress} style={({ pressed }) => ({ minHeight: 44, justifyContent: "center", opacity: pressed ? 0.5 : 1 })}><Text style={{ color: C.textSub, fontSize: 14 }}>{commentCount ? `View all ${commentCount} comments` : "Add a comment..."}</Text></Pressable>
      <Text style={{ color: C.textDim, fontSize: 12 }}>{timestamp}</Text>
    </View>
  </View>;
}
