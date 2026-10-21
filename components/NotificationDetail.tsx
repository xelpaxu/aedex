import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Maximize2, X } from 'lucide-react-native';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { useTheme } from '@/context/ThemeContext';
import { dateLabel, imageSource, notificationLabels, type NotificationDetailData } from '@/lib/notifications';
import NotificationMap from './NotificationMap';

export default function NotificationDetail({ notificationId, onClose }: { notificationId: Id<'notifications'>; onClose: () => void }) {
  const { colors: C } = useTheme();
  const router = useRouter();
  const data = useQuery(api.notifications.getNotificationDetail, { notificationId }) as NotificationDetailData | null | undefined;
  const markAsRead = useMutation(api.notifications.markAsRead);
  const [readError, setReadError] = useState(false);
  const [imageMode, setImageMode] = useState<'original' | 'annotated'>('original');
  const [imageError, setImageError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    setReadError(false);
    void markAsRead({ notificationId }).catch(() => setReadError(true));
  }, [notificationId, markAsRead, retry]);

  const report = data?.report;
  const event = data?.notification.validation;
  const image = imageSource(imageMode === 'annotated' ? report?.processedImage : report?.imageUri);
  useEffect(() => setImageError(false), [image]);
  const field = (label: string, value?: string) => value ? <View style={{ gap: 5 }} key={label}>
    <Text style={{ color: C.textSub, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    <Text selectable style={{ color: C.text, fontSize: 15, lineHeight: 23 }}>{value}</Text>
  </View> : null;
  const card = { padding: 18, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, gap: 16 } as const;

  return <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderColor: C.border }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to notifications" onPress={onClose} style={{ padding: 12 }}><ArrowLeft color={C.text} size={22} /></Pressable>
      <Text style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>Notification details</Text>
    </View>
    {data === undefined ? <ActivityIndicator color={C.accent} style={{ marginTop: 60 }} /> : data === null ? <View style={{ padding: 24, gap: 12 }}>
      <Text style={{ color: C.text, fontSize: 18, fontWeight: '700' }}>This notification is unavailable</Text>
      <Text style={{ color: C.textSub }}>It may have been removed, or it belongs to a different account.</Text>
    </View> : <ScrollView contentContainerStyle={{ padding: 20, gap: 22, paddingBottom: 40, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
      <View style={{ gap: 10 }}>
        <Text style={{ color: C.accent, fontSize: 12, fontWeight: '700' }}>{notificationLabels[data.notification.type] || 'Community update'}</Text>
        <Text style={{ color: C.text, fontSize: 26, lineHeight: 34, fontFamily: 'Manrope_700Bold' }}>{data.notification.title}</Text>
        <Text style={{ color: C.textSub, fontSize: 13 }}>{dateLabel(data.notification.createdAt)}</Text>
        <Text style={{ color: C.text, fontSize: 15, lineHeight: 24 }}>{data.notification.message}</Text>
      </View>

      {report && <View style={{ gap: 12 }}>
        <Text style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>Report evidence</Text>
        {!!report.processedImage && <View style={{ flexDirection: 'row', gap: 10 }}>
          {(['original', 'annotated'] as const).map(mode => <Pressable key={mode} accessibilityRole="button" accessibilityState={{ selected: imageMode === mode }} onPress={() => setImageMode(mode)} style={{ borderRadius: 18, padding: 12, backgroundColor: imageMode === mode ? C.accent : C.surface }}>
            <Text style={{ color: imageMode === mode ? '#fff' : C.text }}>{mode === 'original' ? 'Original image' : 'Annotated image'}</Text>
          </Pressable>)}
        </View>}
        {image && !imageError ? <Pressable accessibilityRole="button" accessibilityLabel="View report image full screen" onPress={() => setExpanded(true)}>
          <Image source={{ uri: image }} resizeMode="contain" onError={() => setImageError(true)} style={{ width: '100%', height: 260, borderRadius: 18, backgroundColor: C.surface }} />
          <View style={{ position: 'absolute', bottom: 12, right: 12, padding: 9, borderRadius: 12, backgroundColor: '#0009' }}><Maximize2 size={18} color="#fff" /></View>
        </Pressable> : <View style={card}>
          <Text style={{ color: C.textSub }}>{imageError ? 'The image could not load. Check your connection and try again.' : 'No image is available for this report.'}</Text>
          {imageError && <Pressable accessibilityRole="button" onPress={() => setImageError(false)}><Text style={{ color: C.accent }}>Retry image</Text></Pressable>}
        </View>}
      </View>}

      {(event || report) && <View style={card}>
        <Text style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>{event ? 'Review recorded with this update' : 'Report information'}</Text>
        {field(event?.outcome === 'verification_undone' ? 'Verification withdrawn' : 'Validated on', event ? dateLabel(event.reviewedAt) : report?.reviewedAt ? dateLabel(report.reviewedAt) : undefined)}
        {field('Reviewed by', event?.reviewedBy || report?.reviewedBy)}
        {field('Submitted on', dateLabel(event?.submittedAt ?? report?.submittedAt))}
        {field('Risk level at review', event?.riskLevel || report?.riskLevel)}
        {field('Confirmed classification', event ? event.classification : report?.classification)}
        {field('Confirmed findings', event ? event.findings : report?.findings)}
        {field('Officer notes', event ? event.notes : report?.notes)}
        {field('Report description', event?.description ?? report?.description)}
        {event && <Text style={{ color: C.textSub, fontSize: 12, lineHeight: 18 }}>These details describe this review. The current report may have changed since then.</Text>}
      </View>}

      {(event || report) && <View style={card}>
        <Text style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>Reported location</Text>
        {field('Location', event?.locationName ?? report?.locationName)}
        {field('Barangay', event?.barangay ?? report?.barangay)}
        <NotificationMap lat={(event?.lat ?? report?.lat)!} lng={(event?.lng ?? report?.lng)!} />
      </View>}

      {report ? <View style={card}>
        <Text style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>Current report status</Text>
        {field('Verification', report.verified ? 'Verified' : 'Awaiting review')}
        {field('Response status', report.status)}
        {report.resolvedAt && field('Resolved on', dateLabel(report.resolvedAt))}
        <Text selectable style={{ color: C.textDim, fontSize: 12 }}>Reference: {report._id}</Text>
        <Pressable accessibilityRole="button" onPress={() => { onClose(); router.push({ pathname: '/results', params: { reportId: report._id } }); }} style={{ minHeight: 48, borderRadius: 14, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontWeight: '700' }}>View Full Report</Text></Pressable>
      </View> : data.notification.reportId ? <View style={card}><Text style={{ color: C.textSub }}>The related report is no longer available. Any recorded review details remain above.</Text></View> : null}

      {readError && <View style={{ gap: 10 }}><Text accessibilityRole="alert" style={{ color: C.danger }}>Could not mark this notification as read.</Text><Pressable accessibilityRole="button" onPress={() => setRetry(value => value + 1)}><Text style={{ color: C.accent }}>Retry</Text></Pressable></View>}
    </ScrollView>}

    <Modal visible={expanded} animationType="fade" onRequestClose={() => setExpanded(false)}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0B1414' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close full-screen image" onPress={() => setExpanded(false)} style={{ padding: 20, alignSelf: 'flex-end' }}><X color="#fff" size={26} /></Pressable>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} maximumZoomScale={4} minimumZoomScale={1} centerContent>
          {image && <Image source={{ uri: image }} resizeMode="contain" style={{ width: '100%', height: '100%', minHeight: 400 }} />}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  </SafeAreaView>;
}
