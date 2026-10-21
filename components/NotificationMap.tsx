import React, { useMemo, useState } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '@/context/ThemeContext';
import { validCoordinates } from '@/lib/notifications';

export default function NotificationMap({ lat, lng }: { lat: number; lng: number }) {
  const { colors: C } = useTheme();
  const [failed, setFailed] = useState(false);
  const [linkError, setLinkError] = useState(false);
  const valid = validCoordinates(lat, lng);
  const html = useMemo(() => valid ? `<!DOCTYPE html><html><head>
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
    <style>html,body,#map{height:100%;margin:0;background:#EEF4F2}</style>
    </head><body><div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>const map=L.map('map',{scrollWheelZoom:false}).setView([${lat},${lng}],16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
    L.marker([${lat},${lng}]).addTo(map);</script></body></html>` : '', [valid, lat, lng]);

  if (!valid) return <Text style={{ color: C.textSub }}>Coordinates were not recorded for this report.</Text>;
  return <View style={{ gap: 10 }}>
    <View style={{ height: 230, borderRadius: 18, overflow: 'hidden', backgroundColor: C.surface }}>
      {failed ? <View style={{ padding: 24, gap: 12 }}>
        <Text style={{ color: C.textSub }}>The map could not load. You can still open the recorded location in Maps.</Text>
        <Pressable accessibilityRole="button" onPress={() => setFailed(false)}><Text style={{ color: C.accent }}>Retry map</Text></Pressable>
      </View> : Platform.OS === 'web'
        ? React.createElement('iframe', { srcDoc: html, title: 'Report location', style: { width: '100%', height: '100%', border: 0 } })
        : <WebView originWhitelist={['*']} source={{ html }} onError={() => setFailed(true)} onHttpError={() => setFailed(true)} javaScriptEnabled scrollEnabled={false} />}
    </View>
    <Text selectable style={{ color: C.textSub, fontSize: 12 }}>{lat.toFixed(6)}, {lng.toFixed(6)}</Text>
    <Pressable accessibilityRole="link" onPress={() => {
      setLinkError(false);
      void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`).catch(() => setLinkError(true));
    }} style={{ minHeight: 44, justifyContent: 'center' }}>
      <Text style={{ color: C.accent, fontWeight: '700' }}>Open location in Maps</Text>
    </Pressable>
    {linkError && <Text accessibilityRole="alert" style={{ color: C.danger }}>Could not open Maps. Please try again.</Text>}
  </View>;
}
