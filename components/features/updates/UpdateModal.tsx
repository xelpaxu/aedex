import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import * as Updates from "expo-updates";
import {
  AlertTriangle,
  CheckCircle2,
  CloudDownload,
  Download,
  RotateCw,
  Sparkles,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

export type UpdateStatus =
  | "idle"
  | "checking"
  | "downloading"
  | "ready"
  | "apk_available"
  | "up-to-date"
  | "error";

interface UpdateModalProps {
  visible: boolean;
  onFinish: () => void;
  autoCheckOnMount?: boolean;
}

interface NewReleaseInfo {
  tagName: string;
  releaseName: string;
  downloadUrl: string;
  htmlUrl: string;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  visible,
  onFinish,
  autoCheckOnMount = true,
}) => {
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("Checking for updates...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [newRelease, setNewRelease] = useState<NewReleaseInfo | null>(null);

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Pulsing effect
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start();

      if (autoCheckOnMount) {
        handleCheckForUpdates();
      }
    }
  }, [visible]);

  const checkGitHubRelease = async (): Promise<boolean> => {
    try {
      const res = await fetch(
        "https://api.github.com/repos/xelpaxu/aedex/releases/latest",
        {
          headers: { Accept: "application/vnd.github.v3+json" },
        },
      );
      if (!res.ok) return false;
      const data = await res.json();
      const tagName = data.tag_name || "";
      const apkAsset = data.assets?.find((a: any) =>
        a.name?.toLowerCase().endsWith(".apk"),
      );
      const downloadUrl = apkAsset?.browser_download_url || data.html_url;

      const currentVersion = Constants.expoConfig?.version || "1.0.0";

      // If GitHub release tag indicates a new major/minor build and has an APK asset
      if (tagName && !tagName.includes(currentVersion) && apkAsset) {
        setNewRelease({
          tagName,
          releaseName: data.name || tagName,
          downloadUrl,
          htmlUrl: data.html_url,
        });
        setStatus("apk_available");
        setStatusMessage(
          `New base release (${tagName}) with native updates is available for download.`,
        );
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleCheckForUpdates = async () => {
    // In local development or Expo Go, expo-updates does not run live OTA updates
    if (__DEV__) {
      setStatus("checking");
      setStatusMessage("Development environment detected");

      const timer = setTimeout(() => {
        setStatus("up-to-date");
        setStatusMessage("App is running latest local code");
        const dismissTimer = setTimeout(() => {
          onFinish();
        }, 1200);
        return () => clearTimeout(dismissTimer);
      }, 1000);
      return () => clearTimeout(timer);
    }

    try {
      setStatus("checking");
      setStatusMessage("Connecting to AEDEX update channel...");

      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        setStatus("downloading");
        setStatusMessage("Downloading new AEDEX update package...");

        // Animate progress bar smoothly to 85%
        Animated.timing(progressAnim, {
          toValue: 0.85,
          duration: 3500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }).start();

        const result = await Updates.fetchUpdateAsync();

        if (result.isNew) {
          // Finish progress bar
          Animated.timing(progressAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: false,
          }).start();

          setStatus("ready");
          setStatusMessage("Update downloaded! Restart to apply changes now, or continue and apply on next launch.");
          return;
        }
      }

      // If no OTA update, check if there's a new standalone APK release on GitHub
      const hasNewApk = await checkGitHubRelease();
      if (!hasNewApk) {
        setStatus("up-to-date");
        setStatusMessage("You are running the latest AEDEX build");
        setTimeout(onFinish, 1200);
      }
    } catch (err: any) {
      console.warn("Update check error:", err);
      // Fallback: check GitHub release on OTA error
      const hasNewApk = await checkGitHubRelease();
      if (!hasNewApk) {
        setStatus("error");
        setErrorMessage(err?.message || "Could not connect to update servers");
        setTimeout(onFinish, 2500);
      }
    }
  };

  const handleSafeRestart = async () => {
    setStatusMessage("Applying update and restarting AEDEX...");
    // Stop ongoing animated loops to prevent native freeze
    pulseAnim.stopAnimation();
    fadeAnim.stopAnimation();

    // Small delay allows the React view and native layout to stabilize before context recreation
    setTimeout(async () => {
      try {
        await Updates.reloadAsync();
      } catch (e) {
        console.warn("ReloadAsync failed, proceeding:", e);
        onFinish();
      }
    }, 400);
  };

  const handleDownloadApk = async () => {
    if (newRelease?.downloadUrl) {
      try {
        await Linking.openURL(newRelease.downloadUrl);
      } catch (err) {
        console.error("Could not open download URL:", err);
      }
    }
  };

  if (!visible) return null;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
          {/* Glowing Header Gradient */}
          <LinearGradient
            colors={["rgba(79, 142, 247, 0.15)", "rgba(34, 211, 238, 0.03)"]}
            style={styles.cardHeader}
          >
            {/* Status Icon */}
            <Animated.View
              style={[
                styles.iconWrapper,
                (status === "checking" || status === "downloading") && {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              {status === "checking" && (
                <RotateCw size={34} color="#4F8EF7" />
              )}
              {status === "downloading" && (
                <CloudDownload size={36} color="#22D3EE" />
              )}
              {status === "ready" && (
                <CheckCircle2 size={36} color="#10B981" />
              )}
              {status === "apk_available" && (
                <Download size={36} color="#38BDF8" />
              )}
              {status === "up-to-date" && (
                <Sparkles size={34} color="#10B981" />
              )}
              {status === "error" && (
                <AlertTriangle size={34} color="#F59E0B" />
              )}
            </Animated.View>

            <Text style={styles.title}>
              {status === "ready"
                ? "Update Ready"
                : status === "downloading"
                  ? "Updating AEDEX"
                  : status === "apk_available"
                    ? "New APK Available"
                    : status === "up-to-date"
                      ? "Up to Date"
                      : status === "error"
                        ? "Update Notice"
                        : "Checking Updates"}
            </Text>

            <Text style={styles.subtitle}>{statusMessage}</Text>

            {/* Progress Bar for Downloading */}
            {status === "downloading" && (
              <View style={styles.progressTrack}>
                <Animated.View
                  style={[styles.progressBar, { width: progressWidth }]}
                >
                  <LinearGradient
                    colors={["#4F8EF7", "#22D3EE"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>
              </View>
            )}

            {/* Ready Status: Safe Restart or Continue */}
            {status === "ready" && (
              <View style={styles.readyContainer}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.restartButton}
                  onPress={handleSafeRestart}
                >
                  <LinearGradient
                    colors={["#10B981", "#059669"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.buttonGradient}
                  >
                    <Text style={styles.restartButtonText}>Restart AEDEX Now</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.skipButton, { marginTop: 10, alignSelf: "center" }]}
                  onPress={onFinish}
                  activeOpacity={0.7}
                >
                  <Text style={styles.skipButtonText}>Apply on Next Launch</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* APK Available Status: Direct Download Button */}
            {status === "apk_available" && (
              <View style={styles.readyContainer}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.restartButton}
                  onPress={handleDownloadApk}
                >
                  <LinearGradient
                    colors={["#38BDF8", "#0284C7"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.buttonGradient}
                  >
                    <Text style={styles.restartButtonText}>
                      Download APK ({newRelease?.tagName || "Latest"})
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* Error, skip, or continue button */}
            {(status === "error" ||
              status === "up-to-date" ||
              status === "apk_available") && (
                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={onFinish}
                  activeOpacity={0.7}
                >
                  <Text style={styles.skipButtonText}>Continue to App</Text>
                </TouchableOpacity>
              )}

            {/* Spinner indicator during check */}
            {status === "checking" && (
              <View style={styles.spinnerRow}>
                <ActivityIndicator size="small" color="#4F8EF7" />
                <Text style={styles.spinnerText}>Syncing with server...</Text>
              </View>
            )}
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(5, 8, 14, 0.88)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: Math.min(width - 48, 380),
    backgroundColor: "#101622",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(79, 142, 247, 0.22)",
    overflow: "hidden",
    shadowColor: "#4F8EF7",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  cardHeader: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(22, 28, 42, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(79, 142, 247, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  title: {
    fontFamily: "Manrope_700Bold",
    fontSize: 20,
    color: "#FFFFFF",
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  progressTrack: {
    width: "100%",
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 3,
    overflow: "hidden",
    marginVertical: 12,
  },
  progressBar: {
    height: "100%",
    borderRadius: 3,
  },
  readyContainer: {
    width: "100%",
    marginTop: 8,
  },
  restartButton: {
    width: "100%",
    height: 48,
    borderRadius: 14,
    overflow: "hidden",
  },
  buttonGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  restartButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
  },
  skipButton: {
    marginTop: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  skipButtonText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "#CBD5E1",
  },
  spinnerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  spinnerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#64748B",
  },
});

export default UpdateModal;
