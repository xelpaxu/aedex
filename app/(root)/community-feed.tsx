import PostCard from "@/components/features/community/CommunityCard";
import CommunityCommentsModal, { CommentItem } from "@/components/features/community/CommunityCommentsModal";
import CommunityShareModal from "@/components/features/community/CommunityShareModal";
import { useUser } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Plus, Globe } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, BackButton, useAccountTheme as useTheme } from "@/components/AccountUI";
import { imageSource } from "@/lib/notifications";
import { api } from "@/convex/_generated/api";
const STORAGE_KEY_HELPFUL = "@aedex_helpful_reactions_v1";
const STORAGE_KEY_COMMENTS = "@aedex_community_comments_v1";
export default function CommunityFeedScreen() {
  const router = useRouter();
  const { colors: C } = useTheme();
  const allReports = useQuery(api.reports.getAllReports);
  const currentUser = useQuery(api.users.getMe);

  // Reactions & Comments state
  const [helpfulState, setHelpfulState] = useState<
    Record<string, { count: number; isHelpful: boolean }>
  >({});
  const [commentsState, setCommentsState] = useState<
    Record<string, CommentItem[]>
  >({});
  const [activeCommentReport, setActiveCommentReport] = useState<any | null>(
    null,
  );
  const [activeShareReport, setActiveShareReport] = useState<any | null>(null);

  // Load saved reactions & comments from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const [savedHelpful, savedComments] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_HELPFUL),
          AsyncStorage.getItem(STORAGE_KEY_COMMENTS),
        ]);
        if (savedHelpful) setHelpfulState(JSON.parse(savedHelpful));
        if (savedComments) setCommentsState(JSON.parse(savedComments));
      } catch (err) {
        console.warn("Could not load local community reactions:", err);
      }
    })();
  }, []);

  // Toggle Helpful reaction
  const handleHelpfulPress = async (reportId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch { }

    setHelpfulState((prev) => {
      const current = prev[reportId] || { count: 0, isHelpful: false };
      const nextIsHelpful = !current.isHelpful;
      const nextCount = nextIsHelpful
        ? current.count + 1
        : Math.max(0, current.count - 1);
      const updated = {
        ...prev,
        [reportId]: {
          count: nextCount,
          isHelpful: nextIsHelpful,
        },
      };
      AsyncStorage.setItem(
        STORAGE_KEY_HELPFUL,
        JSON.stringify(updated),
      ).catch(() => { });
      return updated;
    });
  };

  const { user: clerkUser } = useUser();

  // Add Comment
  const handleAddComment = (
    reportId: string,
    text: string,
    profile?: {
      userName?: string;
      userAvatar?: string;
      userRole?: string;
      userBarangay?: string;
    },
  ) => {
    const authorName =
      profile?.userName ||
      currentUser?.name ||
      clerkUser?.fullName ||
      clerkUser?.firstName ||
      clerkUser?.username ||
      "Citizen";

    const authorAvatar =
      profile?.userAvatar ||
      clerkUser?.imageUrl ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        authorName,
      )}&background=1a2240&color=4F8EF7&bold=true`;

    const newComment: CommentItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      reportId,
      userName: authorName,
      userAvatar: authorAvatar,
      userRole: profile?.userRole || currentUser?.role,
      userBarangay: profile?.userBarangay || currentUser?.barangay,
      text,
      timestamp: Date.now(),
    };

    setCommentsState((prev) => {
      const list = prev[reportId] || [];
      const updated = {
        ...prev,
        [reportId]: [...list, newComment],
      };
      AsyncStorage.setItem(
        STORAGE_KEY_COMMENTS,
        JSON.stringify(updated),
      ).catch(() => { });
      return updated;
    });
  };

  // Share report
  const handleSharePress = (report: any) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch { }
    setActiveShareReport(report);
  };

  const communityReports = useMemo(() => [...(allReports ?? [])].sort((a, b) => (b.timestamp || b._creationTime) - (a.timestamp || a._creationTime)), [allReports]);
  return <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: C.bg }}>
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, borderBottomWidth: 0.5, borderColor: C.border, minHeight: 58 }}>
      <BackButton onPress={() => router.canGoBack() ? router.back() : router.replace("/(root)")} />
      <Text accessibilityRole="header" style={{ flex: 1, color: C.text, fontSize: 25, fontWeight: "700", letterSpacing: -0.7 }}>Community</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Capture a new report" onPress={() => router.push("/(root)/capture")} style={({ pressed }) => ({ width: 48, height: 48, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.5 : 1 })}><Plus size={28} color={C.actionText} /></Pressable>
    </View>
    {allReports === undefined ? <ActivityIndicator color={C.actionText} style={{ marginTop: 48 }} /> : <FlatList data={communityReports} keyExtractor={item => item._id} showsVerticalScrollIndicator={false} initialNumToRender={4} maxToRenderPerBatch={4} contentContainerStyle={{ paddingBottom: 24, maxWidth: 640, width: "100%", alignSelf: "center" }}
      ListHeaderComponent={<View style={{ paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 0.5, borderColor: C.border }}><Text style={{ color: C.textSub, fontSize: 13 }}>{currentUser?.barangay ? `Your community / ${currentUser.barangay}` : "Reports from the community"}</Text></View>}
      ItemSeparatorComponent={() => <View style={{ height: 0.5, backgroundColor: C.border }} />}
      ListEmptyComponent={<View style={{ alignItems: "center", padding: 40, gap: 14 }}><Globe size={32} color={C.textSub} /><Text style={{ color: C.text, fontWeight: "600", fontSize: 20 }}>No community posts yet</Text><Text style={{ color: C.textSub, fontSize: 15, textAlign: "center", lineHeight: 22 }}>Reports shared by your community will appear here.</Text></View>}
      renderItem={({ item }) => <PostCard image={imageSource(item.processedImage || item.imageUri) || undefined} userName={item.userName || "Community member"} location={item.barangay ? `Brgy. ${item.barangay}` : item.locationName || "Iloilo City"} timestamp={new Date(item.timestamp || item._creationTime).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} status={item.status || "Pending"} caption={item.description} onPress={() => router.push({ pathname: "/results", params: { reportId: item._id } })} isHelpful={helpfulState[item._id]?.isHelpful || false} helpfulCount={helpfulState[item._id]?.count || 0} onHelpfulPress={() => void handleHelpfulPress(item._id)} commentCount={commentsState[item._id]?.length || 0} onCommentPress={() => setActiveCommentReport(item)} onSharePress={() => handleSharePress(item)} />}
    />}
    <CommunityCommentsModal visible={!!activeCommentReport} onClose={() => setActiveCommentReport(null)} report={activeCommentReport} comments={activeCommentReport ? commentsState[activeCommentReport._id] || [] : []} onAddComment={handleAddComment} currentUser={currentUser} />
    <CommunityShareModal visible={!!activeShareReport} onClose={() => setActiveShareReport(null)} report={activeShareReport} />
  </SafeAreaView>;
}
