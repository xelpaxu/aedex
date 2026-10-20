import { LinearGradient } from "expo-linear-gradient";
import {
  AlertTriangle,
  CheckCircle2,
  CloudDownload,
  Download,
  ExternalLink,
  RotateCw,
  ShieldAlert,
} from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../../../context/ThemeContext";
import {
  getCurrentBuildNumber,
  getCurrentVersionName,
  ReleaseManifest,
} from "../../../services/update_service";

export type UpdateState =
  | { phase: "idle" }
  | { phase: "checking" }
  | { phase: "ota_downloading" }
  | { phase: "ota_ready" }
  | { phase: "ota_reloading" }
  | { phase: "apk_available"; manifest: ReleaseManifest; error?: string }
  | {
      phase: "apk_downloading";
      manifest: ReleaseManifest;
      downloadedBytes: number;
      totalBytes: number;
      fraction: number;
    }
  | {
      phase: "apk_ready";
      manifest: ReleaseManifest;
      downloadedBytes: number;
      totalBytes: number;
      error?: string;
    }
  | { phase: "apk_installing"; manifest: ReleaseManifest };

export interface UpdateModalProps {
  state: UpdateState;
  onDownload: () => void;
  onInstall: () => void;
  onApplyOta: () => void;
  onAllowInstall: () => void;
  onCancelDownload: () => void;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "--";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  state,
  onDownload,
  onInstall,
  onApplyOta,
  onAllowInstall,
  onCancelDownload,
}) => {
  const { colors } = useTheme();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const phase = state.phase;
  const busy =
    phase === "checking" ||
    phase === "ota_downloading" ||
    phase === "apk_downloading" ||
    phase === "apk_installing";

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (!busy) return;
    pulseAnim.setValue(1);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [busy, pulseAnim]);

  // OTA has no byte-level progress, so drive an indeterminate sweep.
  useEffect(() => {
    if (phase !== "ota_downloading") {
      progressAnim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 1400,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [phase, progressAnim]);

  const fraction =
    phase === "apk_downloading"
      ? state.fraction
      : phase === "apk_ready"
        ? 1
        : 0;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: fraction,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [fraction, progressAnim]);

  if (phase === "idle" || phase === "checking") return null;

  if (phase === "ota_reloading") {
    return (
      <View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: colors.bg,
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
            zIndex: 999999,
            elevation: 999,
          },
        ]}
      >
        <ActivityIndicator size="large" color={colors.accent} />
        <Text
          style={{
            fontFamily: "Manrope_700Bold",
            fontSize: 18,
            color: colors.text,
            marginTop: 18,
            textAlign: "center",
          }}
        >
          Restarting AEDEX
        </Text>
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 13,
            color: colors.textSub,
            marginTop: 6,
            textAlign: "center",
          }}
        >
          Applying latest update...
        </Text>
      </View>
    );
  }

  const manifest: ReleaseManifest | null =
    phase === "ota_downloading" || phase === "ota_ready" ? null : state.manifest;

  const title = (() => {
    switch (phase) {
      case "apk_available":
        return "Update Required";
      case "apk_downloading":
        return "Downloading Update";
      case "apk_ready":
        return "Ready to Install";
      case "apk_installing":
        return "Installing Update";
      case "ota_downloading":
        return "Downloading Update";
      case "ota_ready":
        return "Update Ready";
      default:
        return "Update";
    }
  })();

  const subtitle = (() => {
    switch (phase) {
      case "apk_available":
        return manifest
          ? `AEDEX ${manifest.version} is available. You must install it to continue.`
          : "You must install it to continue.";
      case "apk_downloading":
        return "Keep AEDEX open until the download finishes.";
      case "apk_ready":
        return state.error ?? "The update is downloaded and ready to install.";
      case "apk_installing":
        return "Confirm the install in the system installer to continue.";
      case "ota_downloading":
        return "Fetching the latest app code...";
      case "ota_ready":
        return "Restart AEDEX to apply the update.";
      default:
        return "";
    }
  })();

  const showProgress = phase === "apk_downloading" || phase === "ota_downloading";
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const icon = (() => {
    switch (phase) {
      case "apk_available":
        return <Download size={36} color={colors.accent} />;
      case "apk_downloading":
      case "ota_downloading":
        return (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <CloudDownload size={36} color={colors.accent} />
          </Animated.View>
        );
      case "apk_ready":
        return <CheckCircle2 size={36} color={colors.safe} />;
      case "apk_installing":
        return (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <RotateCw size={36} color={colors.accent} />
          </Animated.View>
        );
      case "ota_ready":
        return <CheckCircle2 size={36} color={colors.safe} />;
      default:
        return null;
    }
  })();

  const needsInstallPermission =
    phase === "apk_ready" && !!state.error;

  return (
    <Modal
      visible
      animationType="none"
      statusBarTranslucent
      // Hard block: back and dismiss are swallowed so a mandatory update cannot be skipped.
      onRequestClose={() => {}}
    >
      <View style={[styles.backdrop, { backgroundColor: colors.bg }]}>
        <Animated.View style={[styles.card, { opacity: fadeAnim, borderColor: colors.border }]}>
          <LinearGradient
            colors={[colors.accentGlow, "rgba(0,0,0,0)"]}
            style={styles.header}
          >
            <View
              style={[
                styles.iconWrapper,
                { backgroundColor: colors.surfaceRaised, borderColor: colors.borderBright },
              ]}
            >
              {icon}
            </View>

            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: colors.textSub }]}>{subtitle}</Text>

            {manifest ? (
              <View style={[styles.versionPill, { backgroundColor: colors.surfaceElevated }]}>
                <Text style={[styles.versionText, { color: colors.textSub }]}>
                  v{getCurrentVersionName()} (build {getCurrentBuildNumber()}) → v
                  {manifest.version} (build {manifest.buildNumber})
                </Text>
              </View>
            ) : null}

            {showProgress ? (
              <View style={styles.progressBlock}>
                <View style={[styles.progressTrack, { backgroundColor: colors.surfaceElevated }]}>
                  <Animated.View style={[styles.progressBar, { width: progressWidth }]}>
                    <LinearGradient
                      colors={[colors.accent, colors.safe]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </Animated.View>
                </View>

                <View style={styles.progressMeta}>
                  {phase === "apk_downloading" ? (
                    <Text style={[styles.progressText, { color: colors.textDim }]}>
                      {formatBytes(state.downloadedBytes)} of{" "}
                      {formatBytes(state.totalBytes)} ·{" "}
                      {Math.floor(state.fraction * 100)}%
                    </Text>
                  ) : (
                    <ActivityIndicator size="small" color={colors.accent} />
                  )}
                  {phase === "apk_downloading" ? (
                    <TouchableOpacity onPress={onCancelDownload} hitSlop={10}>
                      <Text style={[styles.linkText, { color: colors.textSub }]}>Cancel</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ) : null}

            {needsInstallPermission ? (
              <View style={[styles.warnRow, { backgroundColor: colors.warnGlow }]}>
                <ShieldAlert size={18} color={colors.warn} />
                <Text style={[styles.warnText, { color: colors.warn }]}>
                  Android needs permission for AEDEX to install updates.
                </Text>
              </View>
            ) : null}

            {phase === "apk_available" && state.error ? (
              <View style={[styles.warnRow, { backgroundColor: colors.dangerGlow }]}>
                <AlertTriangle size={18} color={colors.danger} />
                <Text style={[styles.warnText, { color: colors.danger }]}>{state.error}</Text>
              </View>
            ) : null}

            {manifest?.notes ? (
              <View style={[styles.notes, { borderColor: colors.border }]}>
                <Text style={[styles.notesText, { color: colors.textSub }]} numberOfLines={4}>
                  {manifest.notes}
                </Text>
              </View>
            ) : null}

            {/* ---- Actions ---- */}
            {phase === "apk_available" ? (
              <PrimaryButton label={state.error ? "Try Download Again" : "Download Update"} onPress={onDownload} />
            ) : null}

            {phase === "apk_ready" ? (
              <>
                {needsInstallPermission ? (
                  <PrimaryButton label="Allow Installation" onPress={onAllowInstall} />
                ) : null}
                {needsInstallPermission ? (
                  <TouchableOpacity style={styles.secondary} onPress={onInstall}>
                    <Text style={[styles.secondaryText, { color: colors.textSub }]}>
                      I have allowed it — install now
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <PrimaryButton label="Install Now" onPress={onInstall} />
                )}
              </>
            ) : null}

            {phase === "apk_installing" ? (
              <View style={styles.waitRow}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={[styles.waitText, { color: colors.textDim }]}>
                  Waiting for the system installer...
                </Text>
              </View>
            ) : null}

            {phase === "ota_ready" ? (
              <PrimaryButton label="Restart AEDEX" onPress={onApplyOta} />
            ) : null}

            {phase === "apk_available" || phase === "apk_ready" ? (
              <TouchableOpacity
                style={styles.secondary}
                onPress={() => Linking.openURL(manifest!.downloadUrl)}
              >
                <Text style={[styles.secondaryText, { color: colors.textDim }]}>
                  <ExternalLink size={13} /> Download manually instead
                </Text>
              </TouchableOpacity>
            ) : null}

            </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const PrimaryButton: React.FC<{ label: string; onPress: () => void }> = ({
  label,
  onPress,
}) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.primary}
      onPress={onPress}
    >
      <LinearGradient
        colors={[colors.accent, colors.safe]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.primaryGradient}
      >
        <Text style={styles.primaryText}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  header: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 0,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  title: {
    fontFamily: "Manrope_700Bold",
    fontSize: 20,
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 16,
  },
  versionPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    marginBottom: 4,
  },
  versionText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    textAlign: "center",
  },
  progressBlock: {
    width: "100%",
    marginTop: 20,
  },
  progressTrack: {
    width: "100%",
    height: 7,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  progressMeta: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  progressText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  linkText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  warnRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 12,
    marginTop: 16,
  },
  warnText: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 17,
  },
  notes: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  notesText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  primary: {
    width: "100%",
    height: 50,
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 20,
  },
  primaryGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
  },
  secondary: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  secondaryText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  waitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 22,
  },
  waitText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
});

export default UpdateModal;