import { useAuth, useUser } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronRight,
  Database,
  Globe,
  Info,
  LocateFixed,
  LogOut,
  Map,
  Moon,
  Shield,
  Smartphone,
  Sun,
  User
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { api } from "../../../convex/_generated/api";
import { useTheme } from "../../context/ThemeContext";

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const currentUser = useQuery(api.users.getMe);
  const { theme, colors, setTheme, toggleTheme } = useTheme();

  const isTanod = currentUser?.role === "tanod";

  // Notification Toggles
  const [outbreakAlerts, setOutbreakAlerts] = useState(true);
  const [teamDispatchAlerts, setTeamDispatchAlerts] = useState(true);
  const [radiusProximityAlerts, setRadiusProximityAlerts] = useState(true);

  // Map & GPS Toggles
  const [highAccuracyGps, setHighAccuracyGps] = useState(true);
  const [autoRecenterMap, setAutoRecenterMap] = useState(true);
  const [defaultSatellite, setDefaultSatellite] = useState(false);

  const handleLogout = async () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to sign out of your AEDEX account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut();
              router.replace("/(auth)/login" as any);
            } catch (error) {
              console.error("Error signing out:", error);
            }
          },
        },
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      "Cache Cleared",
      "Local map tiles and offline report data have been successfully cleared.",
      [{ text: "OK" }]
    );
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* ── HEADER BAR ─────────────────────────────────────── */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft color={colors.text} size={18} strokeWidth={2.5} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Settings & Preferences
        </Text>

        <TouchableOpacity
          onPress={toggleTheme}
          style={[
            styles.quickThemeBtn,
            { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
          ]}
        >
          {theme === "dark" ? (
            <Sun color={colors.gold} size={16} />
          ) : (
            <Moon color={colors.accent} size={16} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── PROFILE CARD ──────────────────────────────────── */}
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.profileHeader}
            activeOpacity={0.85}
            onPress={() => router.push("/(root)/edit-profile" as any)}
          >
            <View style={styles.avatarWrapper}>
              <Image
                source={{
                  uri:
                    user?.imageUrl ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      user?.fullName || "User",
                    )}&background=1a2240&color=4F8EF7&bold=true&size=120`,
                }}
                style={[styles.avatar, { borderColor: colors.accent }]}
              />
              <View
                style={[
                  styles.roleBadgeDot,
                  { backgroundColor: isTanod ? colors.accent : colors.safe },
                ]}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.userName, { color: colors.text }]}>
                {user?.fullName || user?.username || "AEDEX User"}
              </Text>
              <Text style={[styles.userEmail, { color: colors.textSub }]}>
                {user?.primaryEmailAddress?.emailAddress}
              </Text>

              <View style={styles.badgeRow}>
                {currentUser?.barangay && (
                  <View
                    style={[
                      styles.pillBadge,
                      {
                        backgroundColor: colors.accentGlow,
                        borderColor: colors.accent + "40",
                      },
                    ]}
                  >
                    <Globe color={colors.accent} size={11} />
                    <Text
                      style={[styles.pillBadgeText, { color: colors.accent }]}
                    >
                      {currentUser.barangay}
                    </Text>
                  </View>
                )}

                <View
                  style={[
                    styles.pillBadge,
                    {
                      backgroundColor: isTanod
                        ? colors.accentGlow
                        : colors.safeGlow,
                      borderColor:
                        (isTanod ? colors.accent : colors.safe) + "40",
                    },
                  ]}
                >
                  <Shield
                    color={isTanod ? colors.accent : colors.safe}
                    size={11}
                  />
                  <Text
                    style={[
                      styles.pillBadgeText,
                      { color: isTanod ? colors.accent : colors.safe },
                    ]}
                  >
                    {isTanod ? "TANOD OFFICER" : "CITIZEN"}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.editProfileBtn,
              {
                backgroundColor: colors.surfaceRaised,
                borderColor: colors.border,
              },
            ]}
            onPress={() => router.push("/(root)/edit-profile" as any)}
          >
            <User color={colors.accent} size={14} />
            <Text style={[styles.editProfileBtnText, { color: colors.text }]}>
              EDIT PROFILE & LOCATION
            </Text>
            <ChevronRight color={colors.textSub} size={14} />
          </TouchableOpacity>
        </View>

        {/* ── APPEARANCE & THEME ────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSub }]}>
            APPEARANCE & THEME
          </Text>
        </View>

        <View
          style={[
            styles.cardGroup,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.themeSelectorRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setTheme("dark")}
              style={[
                styles.themeCardOption,
                {
                  backgroundColor:
                    theme === "dark" ? colors.accentGlow : colors.surfaceRaised,
                  borderColor:
                    theme === "dark" ? colors.accent : colors.border,
                },
              ]}
            >
              <View style={styles.themeOptionHeader}>
                <Moon
                  color={theme === "dark" ? colors.accent : colors.textSub}
                  size={20}
                />
                {theme === "dark" && (
                  <CheckCircle2 color={colors.accent} size={16} />
                )}
              </View>
              <Text
                style={[
                  styles.themeOptionTitle,
                  { color: theme === "dark" ? colors.accent : colors.text },
                ]}
              >
                Tactical Dark
              </Text>
              <Text style={[styles.themeOptionSub, { color: colors.textSub }]}>
                OLED High contrast dark mode
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setTheme("light")}
              style={[
                styles.themeCardOption,
                {
                  backgroundColor:
                    theme === "light" ? colors.accentGlow : colors.surfaceRaised,
                  borderColor:
                    theme === "light" ? colors.accent : colors.border,
                },
              ]}
            >
              <View style={styles.themeOptionHeader}>
                <Sun
                  color={theme === "light" ? colors.accent : colors.textSub}
                  size={20}
                />
                {theme === "light" && (
                  <CheckCircle2 color={colors.accent} size={16} />
                )}
              </View>
              <Text
                style={[
                  styles.themeOptionTitle,
                  { color: theme === "light" ? colors.accent : colors.text },
                ]}
              >
                Clean Light
              </Text>
              <Text style={[styles.themeOptionSub, { color: colors.textSub }]}>
                Daylight high visibility theme
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── NOTIFICATIONS & ALERTS ────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSub }]}>
            NOTIFICATIONS & FIELD ALERTS
          </Text>
        </View>

        <View
          style={[
            styles.cardGroup,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.settingRow}>
            <View style={styles.settingIconBg}>
              <AlertTriangle color={colors.danger} size={16} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Dengue Outbreak Alerts
              </Text>
              <Text style={[styles.settingSub, { color: colors.textSub }]}>
                Emergency warnings for high-density breeding zones
              </Text>
            </View>
            <Switch
              value={outbreakAlerts}
              onValueChange={setOutbreakAlerts}
              trackColor={{ false: colors.border, true: colors.accent + "80" }}
              thumbColor={outbreakAlerts ? colors.accent : colors.textSub}
            />
          </View>

          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

          {isTanod && (
            <>
              <View style={styles.settingRow}>
                <View style={styles.settingIconBg}>
                  <Bell color={colors.accent} size={16} />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>
                    Team Dispatch Notifications
                  </Text>
                  <Text style={[styles.settingSub, { color: colors.textSub }]}>
                    Immediate alerts when new incidents are assigned
                  </Text>
                </View>
                <Switch
                  value={teamDispatchAlerts}
                  onValueChange={setTeamDispatchAlerts}
                  trackColor={{
                    false: colors.border,
                    true: colors.accent + "80",
                  }}
                  thumbColor={teamDispatchAlerts ? colors.accent : colors.textSub}
                />
              </View>

              <View
                style={[styles.rowDivider, { backgroundColor: colors.border }]}
              />
            </>
          )}

          <View style={styles.settingRow}>
            <View style={styles.settingIconBg}>
              <Smartphone color={colors.warn} size={16} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Proximity Sound & Haptics
              </Text>
              <Text style={[styles.settingSub, { color: colors.textSub }]}>
                Vibrate when approaching active risk hotspots
              </Text>
            </View>
            <Switch
              value={radiusProximityAlerts}
              onValueChange={setRadiusProximityAlerts}
              trackColor={{ false: colors.border, true: colors.accent + "80" }}
              thumbColor={radiusProximityAlerts ? colors.accent : colors.textSub}
            />
          </View>
        </View>

        {/* ── TACTICAL MAP PREFERENCES ─────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSub }]}>
            TACTICAL MAP & GPS PREFERENCES
          </Text>
        </View>

        <View
          style={[
            styles.cardGroup,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.settingRow}>
            <View style={styles.settingIconBg}>
              <LocateFixed color={colors.safe} size={16} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                High Precision Native GPS
              </Text>
              <Text style={[styles.settingSub, { color: colors.textSub }]}>
                Uses device hardware GPS for precise positioning
              </Text>
            </View>
            <Switch
              value={highAccuracyGps}
              onValueChange={setHighAccuracyGps}
              trackColor={{ false: colors.border, true: colors.safe + "80" }}
              thumbColor={highAccuracyGps ? colors.safe : colors.textSub}
            />
          </View>

          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingIconBg}>
              <Map color={colors.accent} size={16} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Auto-Recenter Map
              </Text>
              <Text style={[styles.settingSub, { color: colors.textSub }]}>
                Lock map focus to phone location on opening
              </Text>
            </View>
            <Switch
              value={autoRecenterMap}
              onValueChange={setAutoRecenterMap}
              trackColor={{ false: colors.border, true: colors.accent + "80" }}
              thumbColor={autoRecenterMap ? colors.accent : colors.textSub}
            />
          </View>

          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingIconBg}>
              <Globe color={colors.gold} size={16} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Default Satellite Layer
              </Text>
              <Text style={[styles.settingSub, { color: colors.textSub }]}>
                Start maps with Esri Satellite imagery
              </Text>
            </View>
            <Switch
              value={defaultSatellite}
              onValueChange={setDefaultSatellite}
              trackColor={{ false: colors.border, true: colors.accent + "80" }}
              thumbColor={defaultSatellite ? colors.accent : colors.textSub}
            />
          </View>
        </View>

        {/* ── SYSTEM & DATA STORAGE ────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSub }]}>
            SYSTEM & STORAGE
          </Text>
        </View>

        <View
          style={[
            styles.cardGroup,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={styles.settingRow}
            onPress={handleClearCache}
            activeOpacity={0.7}
          >
            <View style={styles.settingIconBg}>
              <Database color={colors.textSub} size={16} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Clear Cache & Map Tiles
              </Text>
              <Text style={[styles.settingSub, { color: colors.textSub }]}>
                Frees up local storage used for map caching
              </Text>
            </View>
            <ChevronRight color={colors.textSub} size={16} />
          </TouchableOpacity>

          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingIconBg}>
              <Info color={colors.accent} size={16} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                App Build Version
              </Text>
              <Text style={[styles.settingSub, { color: colors.textSub }]}>
                AEDEX Tactical v1.2.4 (Build 2026)
              </Text>
            </View>
            <View
              style={[
                styles.versionTag,
                { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.versionTagText, { color: colors.accent }]}>
                Stable
              </Text>
            </View>
          </View>
        </View>

        {/* ── LOGOUT BUTTON ───────────────────────────────── */}
        <TouchableOpacity
          style={[
            styles.logoutCard,
            {
              backgroundColor: colors.dangerGlow,
              borderColor: colors.danger + "40",
            },
          ]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <LogOut color={colors.danger} size={18} strokeWidth={2.5} />
          <Text style={[styles.logoutText, { color: colors.danger }]}>
            Log out of account
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  quickThemeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 40,
    gap: 16,
  },

  // Profile Card
  profileCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
  },
  roleBadgeDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  userName: {
    fontSize: 17,
    fontWeight: "700",
  },
  userEmail: {
    fontSize: 12,
    marginTop: 1,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  pillBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  pillBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  editProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  editProfileBtnText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    flex: 1,
    marginLeft: 10,
  },

  // Section Headers
  sectionHeader: {
    marginTop: 6,
    marginBottom: -6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // Cards Group
  cardGroup: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },

  // Theme Option Grid
  themeSelectorRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 10,
  },
  themeCardOption: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 6,
  },
  themeOptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  themeOptionTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  themeOptionSub: {
    fontSize: 11,
    lineHeight: 14,
  },

  // Settings Rows
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  settingIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(100,100,100,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  settingSub: {
    fontSize: 11,
    marginTop: 2,
  },
  rowDivider: {
    height: 1,
    opacity: 0.5,
  },

  // Version Tag
  versionTag: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  versionTagText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // Logout Card
  logoutCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
