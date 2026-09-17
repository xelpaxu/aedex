import { useAuth, useOAuth } from "@clerk/clerk-expo";
import { useMutation } from "convex/react";
import * as Linking from "expo-linking";
import { Link, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { api } from "../../../convex/_generated/api";
import { ThemeColors, useTheme } from "../../context/ThemeContext";
import { useWarmUpBrowser } from "../../hooks/useWarmUpBrowser";

WebBrowser.maybeCompleteAuthSession();

// ─── Real Brand Logos ─────────────────────────────────────────────────────────
function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </Svg>
  );
}

function FacebookLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
        fill="#1877F2"
      />
    </Svg>
  );
}

type SocialBtnProps = {
  onPress: () => void;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  surfaceColor?: string;
  borderColor?: string;
  accentColor?: string;
  C: ThemeColors;
};

function SocialBtn({
  onPress,
  label,
  sublabel,
  icon,
  surfaceColor,
  borderColor,
  accentColor,
  C,
}: SocialBtnProps) {
  const bg = surfaceColor ?? C.surface;
  const border = borderColor ?? C.border;
  const textCol = accentColor ?? C.text;

  return (
    <TouchableOpacity
      style={[btnStyles.socialBtn, { backgroundColor: bg, borderColor: border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          btnStyles.socialBtnIcon,
          { backgroundColor: C.surfaceRaised, borderColor: border },
        ]}
      >
        {icon}
      </View>
      <View style={btnStyles.socialBtnLabels}>
        <Text style={[btnStyles.socialBtnLabel, { color: textCol }]}>
          {label}
        </Text>
        <Text style={[btnStyles.socialBtnSublabel, { color: C.textSub }]}>
          {sublabel}
        </Text>
      </View>
      <Text style={[btnStyles.socialBtnChevron, { color: C.textDim }]}>›</Text>
    </TouchableOpacity>
  );
}

const btnStyles = StyleSheet.create({
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  socialBtnIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  socialBtnLabels: {
    flex: 1,
    gap: 2,
  },
  socialBtnLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  socialBtnSublabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  socialBtnChevron: {
    fontSize: 20,
    marginRight: 2,
  },
});

export default function LoginScreen() {
  useWarmUpBrowser();
  const router = useRouter();
  const { colors: C, isDark } = useTheme();
  const { isSignedIn, isLoaded, userId } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const createOrUpdateUser = useMutation(api.users.loginWithFirebase);

  const { startOAuthFlow: googleAuth } = useOAuth({ strategy: "oauth_google" });
  const { startOAuthFlow: facebookAuth } = useOAuth({
    strategy: "oauth_facebook",
  });

  useEffect(() => {
    if (isLoaded && isSignedIn && !isProcessing) {
      router.replace("/(root)");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  const onSelectAuth = useCallback(
    async (strategy: "google" | "facebook") => {
      if (isProcessing) return;

      setIsProcessing(true);
      const selectedAuth = strategy === "google" ? googleAuth : facebookAuth;

      try {
        const { createdSessionId, setActive } = await selectedAuth({
          redirectUrl: Linking.createURL("/", { scheme: "moskito" }),
        });

        if (createdSessionId && setActive) {
          await setActive({ session: createdSessionId });

          try {
            await createOrUpdateUser({
              uid: userId || "unknown",
              email: "",
              username: "citizen_user",
              displayName: "Citizen User",
              role: "citizen",
            });
          } catch (convexError) {
            console.error("Failed to create user in Convex:", convexError);
          }

          router.replace("/(root)");
        }
      } catch (err) {
        console.error("OAuth Error:", err);
        Alert.alert("Login Error", "Failed to sign in. Please try again.");
      } finally {
        setIsProcessing(false);
      }
    },
    [
      googleAuth,
      facebookAuth,
      router,
      createOrUpdateUser,
      isProcessing,
      userId,
    ],
  );

  const handleTanodRegister = useCallback(
    async (strategy: "google" | "facebook") => {
      if (isProcessing) return;

      setIsProcessing(true);
      const selectedAuth = strategy === "google" ? googleAuth : facebookAuth;

      try {
        const { createdSessionId, setActive } = await selectedAuth({
          redirectUrl: Linking.createURL("/", { scheme: "moskito" }),
        });

        if (createdSessionId && setActive) {
          await setActive({ session: createdSessionId });

          try {
            await createOrUpdateUser({
              uid: userId || "unknown",
              email: "",
              username: "tanod_user",
              displayName: "Tanod User",
              role: "tanod",
            });
          } catch (convexError) {
            console.error("Failed to create Tanod in Convex:", convexError);
          }

          router.replace({
            pathname: "/(auth)/complete-profile",
            params: { role: "tanod" },
          } as any);
        }
      } catch (err) {
        console.error("OAuth Error:", err);
        Alert.alert(
          "Registration Error",
          "Failed to register as Tanod. Please try again.",
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [
      googleAuth,
      facebookAuth,
      router,
      createOrUpdateUser,
      isProcessing,
      userId,
    ],
  );

  const styles = useMemo(() => createStyles(C), [C]);

  if (!isLoaded || isProcessing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>
          {isProcessing ? "AUTHENTICATING..." : "LOADING..."}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={C.bg}
      />

      <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={styles.logoWrap}>
            <Image
              source={require("../../assets/logo/aedex.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.eyebrow}>AEDEX surveillance</Text>
          <Text style={styles.heroTitle}>Sign in to{"\n"}your account</Text>
          <Text style={styles.heroSub}>
            Report mosquito breeding sites and follow updates in your barangay.
          </Text>
        </View>

        {/* ── Auth Buttons ── */}
        <View style={styles.cardSection}>
          <SocialBtn
            onPress={() => onSelectAuth("google")}
            label="Continue with Google"
            sublabel="Sign in using your Google account"
            icon={<GoogleLogo size={20} />}
            C={C}
          />

          <SocialBtn
            onPress={() => onSelectAuth("facebook")}
            label="Continue with Facebook"
            sublabel="Sign in using your Facebook account"
            icon={<FacebookLogo size={20} />}
            accentColor={C.text}
            C={C}
          />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>
        </View>

        {/* ── Tanod Registration ── */}
        <View style={styles.tanodSection}>
          <View style={styles.tanodHeader}>
            <Text style={styles.tanodTitle}>Register as Tanod</Text>
            <Text style={styles.tanodSub}>
              Join as a field officer and help resolve reports in your barangay
            </Text>
          </View>
          <TouchableOpacity
            style={styles.tanodBtn}
            onPress={() => handleTanodRegister("google")}
            activeOpacity={0.7}
            disabled={isProcessing}
          >
            <View
              style={[
                styles.socialBtnIcon,
                { backgroundColor: C.surfaceRaised, borderColor: C.border },
              ]}
            >
              <GoogleLogo size={20} />
            </View>
            <View style={styles.socialBtnLabels}>
              <Text style={[styles.socialBtnLabel, { color: C.text }]}>
                Register as Tanod with Google
              </Text>
              <Text style={[styles.socialBtnSublabel, { color: C.textSub }]}>
                Join the field response team
              </Text>
            </View>
            <Text style={[styles.socialBtnChevron, { color: C.textDim }]}>
              ›
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don&apos;t have an account? </Text>
          <Link href="/(auth)/signup" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (C: ThemeColors) =>
  StyleSheet.create({
    socialBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
    },
    socialBtnIcon: {
      width: 38,
      height: 38,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    socialBtnLabels: {
      flex: 1,
      gap: 2,
    },
    socialBtnLabel: {
      fontSize: 14,
      fontWeight: "700",
    },
    socialBtnSublabel: {
      fontSize: 11,
      fontWeight: "500",
    },
    socialBtnChevron: {
      fontSize: 20,
      marginRight: 2,
    },
    root: {
      flex: 1,
      backgroundColor: C.bg,
    },
    loadingContainer: {
      flex: 1,
      backgroundColor: C.bg,
      justifyContent: "center",
      alignItems: "center",
      gap: 14,
    },
    loadingText: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.3,
      color: C.textSub,
    },
    screen: {
      flexGrow: 1,
      paddingTop: 24,
      paddingHorizontal: 24,
      paddingBottom: 24,
    },

    // ── Hero
    hero: {
      flex: 1,
      justifyContent: "center",
      paddingBottom: 8,
    },
    logoWrap: {
      width: 72,
      height: 72,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.borderBright,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
      padding: 10,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0,
      shadowRadius: 12,
      elevation: 0,
    },
    logoImage: {
      width: "100%",
      height: "100%",
    },

    eyebrow: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.3,
      color: C.accent,
      textTransform: "none",
      marginBottom: 8,
    },
    heroTitle: {
      fontSize: 32,
      fontWeight: "700",
      color: C.text,
      lineHeight: 38,
      letterSpacing: -0.5,
      marginBottom: 12,
    },
    heroSub: {
      fontSize: 13,
      color: C.textSub,
      lineHeight: 21,
      fontWeight: "400",
      maxWidth: 300,
    },

    // ── Card Section
    cardSection: {
      gap: 10,
      marginTop: 24,
    },

    // ── Divider
    dividerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginVertical: 4,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: C.border,
    },
    dividerText: {
      fontSize: 11,
      fontWeight: "700",
      color: C.textDim,
      letterSpacing: 0.3,
    },

    // ── Footer
    footer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: 24,
    },
    footerText: {
      fontSize: 12,
      color: C.textSub,
      fontWeight: "400",
    },
    footerLink: {
      fontSize: 12,
      fontWeight: "700",
      color: C.accent,
    },

    // ── Tanod Section
    tanodSection: {
      marginTop: 16,
      gap: 10,
    },
    tanodHeader: {
      alignItems: "center",
      marginBottom: 8,
    },
    tanodTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: C.text,
      marginBottom: 4,
    },
    tanodSub: {
      fontSize: 12,
      color: C.textSub,
      textAlign: "center",
      lineHeight: 18,
    },
    tanodBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.warn + "40",
      backgroundColor: C.warnGlow,
    },
  });
