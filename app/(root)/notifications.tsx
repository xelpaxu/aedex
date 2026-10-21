import { BackButton } from "@/components/AccountUI";
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Pressable, View } from "react-native";
import { Text } from "@/components/Typography";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, CheckCheck, CheckCircle2, ChevronRight, RefreshCw } from 'lucide-react-native';
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { useTheme } from '@/context/ThemeContext';
import { dateLabel, imageSource, notificationLabels, type InboxNotification } from '@/lib/notifications';
import NotificationDetail from '@/components/NotificationDetail';

function NotificationRow({ item, onOpen }: { item: InboxNotification; onOpen: () => void }) {
  const { colors: C } = useTheme();
  const preview = useQuery(api.notifications.getNotificationPreview, item.reportId ? { notificationId: item._id } : 'skip') as { imageUri: string } | null | undefined;
  const uri = imageSource(preview?.imageUri);
  const [failed, setFailed] = useState(false);
  const personal = !!item.validation;
  const Icon = item.type === 'verification_undone' ? RefreshCw : personal || item.type === 'resolved' ? CheckCircle2 : Bell;
  return <Pressable accessibilityRole="button" accessibilityLabel={`${item.read ? '' : 'Unread: '}${item.title}. View details`} onPress={onOpen}
    style={({ pressed }) => ({ flexDirection: 'row', gap: 14, padding: 18, borderRadius: 24, backgroundColor: pressed ? C.surfaceRaised : C.surface, borderWidth: 1, borderColor: item.read ? C.border : C.accent + '70' })}>
    {uri && !failed ? <Image source={{ uri }} onError={() => setFailed(true)} style={{ width: 58, height: 66, borderRadius: 12 }} />
      : <View style={{ width: 54, height: 54, borderRadius: 16, backgroundColor: C.accentGlow, alignItems: 'center', justifyContent: 'center' }}><Icon color={C.accent} size={23} /></View>}
    <View style={{ flex: 1, gap: 6 }}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Text style={{ flex: 1, color: C.accent, fontWeight: '700', fontSize: 11 }}>{notificationLabels[item.type] || 'Community update'}</Text>
        {!item.read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent }} />}
      </View>
      <Text style={{ color: C.text, fontSize: 15, lineHeight: 21, fontWeight: item.read ? '600' : '700' }}>{item.title}</Text>
      <Text numberOfLines={2} style={{ color: C.textSub, fontSize: 13, lineHeight: 20 }}>{item.message}</Text>
      {!!item.validation?.locationName && <Text numberOfLines={1} style={{ color: C.textSub, fontSize: 12 }}>{item.validation.locationName}</Text>}
      <Text style={{ color: C.textDim, fontSize: 12 }}>{dateLabel(item.createdAt)}</Text>
    </View>
    <ChevronRight size={16} color={C.textDim} style={{ alignSelf: 'center' }} />
  </Pressable>;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors: C } = useTheme();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selected, setSelected] = useState<Id<'notifications'> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { results, status, loadMore } = usePaginatedQuery(api.notifications.getMyNotificationsPage, { unreadOnly }, { initialNumItems: 15 });
  const unread = (useQuery(api.notifications.getUnreadCount) as number | undefined) ?? 0;
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  const readAll = async () => {
    setBusy(true); setError('');
    try { await markAllAsRead(); } catch { setError('Could not mark updates as read. Please try again.'); }
    finally { setBusy(false); }
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
    <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 24 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <BackButton onPress={() => router.canGoBack() ? router.back() : router.replace("/(root)")} />
        <Pressable accessibilityRole="button" accessibilityLabel="Mark all notifications as read" disabled={!unread || busy} onPress={readAll} style={{ flexDirection: 'row', alignItems: 'center', gap: 7, padding: 12, opacity: unread ? 1 : 0.4 }}>
          {busy ? <ActivityIndicator color={C.accent} /> : <CheckCheck size={18} color={C.accent} />}
          <Text style={{ color: C.accent, fontWeight: '600', fontSize: 12 }}>Mark all read</Text>
        </Pressable>
      </View>
      <View style={{ gap: 6 }}>
        <Text style={{ color: C.text, fontSize: 32, fontFamily: 'Inter_700Bold' }}>Notifications</Text>
        <Text style={{ color: C.textSub, fontSize: 14 }}>{unread ? `${unread} unread ${unread === 1 ? 'update' : 'updates'}` : 'Updates about your reports, in one place.'}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, backgroundColor: C.surfaceRaised, padding: 6, borderRadius: 30, alignSelf: 'flex-start' }}>
        {[false, true].map(value => <Pressable key={String(value)} accessibilityRole="button" accessibilityState={{ selected: unreadOnly === value }} onPress={() => setUnreadOnly(value)} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 18, borderRadius: 22, backgroundColor: unreadOnly === value ? C.accent : C.surface, borderWidth: 1, borderColor: unreadOnly === value ? C.accent : C.border }}>
          <Text style={{ color: unreadOnly === value ? '#fff' : C.textSub, fontWeight: '600', fontSize: 13 }}>{value ? `Unread (${unread})` : 'All updates'}</Text>
        </Pressable>)}
      </View>
      {!!error && <Text accessibilityRole="alert" style={{ color: C.danger }}>{error}</Text>}
    </View>
    {status === 'LoadingFirstPage' ? <ActivityIndicator style={{ marginTop: 60 }} color={C.accent} /> : <FlatList
      data={results as InboxNotification[]}
      keyExtractor={item => item._id}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, flexGrow: 1 }}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      onEndReached={() => { if (status === 'CanLoadMore') loadMore(15); }}
      onEndReachedThreshold={0.3}
      ListEmptyComponent={<View style={{ padding: 32, gap: 12, alignItems: 'center' }}>
        <View style={{ width: 80, height: 80, borderRadius: 28, backgroundColor: C.accentGlow, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}><Bell color={C.accent} size={32} /></View>
        <Text style={{ color: C.text, fontSize: 18, fontWeight: '700' }}>{unreadOnly ? "You're all caught up" : 'No updates yet'}</Text>
        <Text style={{ color: C.textSub, textAlign: 'center', lineHeight: 21 }}>When an officer validates your report, its image, location and review details will appear here.</Text>
      </View>}
      ListFooterComponent={status === 'LoadingMore' ? <ActivityIndicator color={C.accent} style={{ padding: 20 }} /> : status === 'CanLoadMore' ? <Pressable accessibilityRole="button" onPress={() => loadMore(15)} style={{ padding: 20, alignItems: 'center' }}><Text style={{ color: C.accent, fontWeight: '600' }}>Load older updates</Text></Pressable> : null}
      renderItem={({ item }) => <NotificationRow item={item} onOpen={() => setSelected(item._id)} />}
    />}
    <Modal visible={selected !== null} animationType="slide" onRequestClose={() => setSelected(null)}>
      {selected && <NotificationDetail key={selected} notificationId={selected} onClose={() => setSelected(null)} />}
    </Modal>
  </SafeAreaView>;
}
