import { useAuth, useOAuth } from "@clerk/clerk-expo";
import * as Linking from "expo-linking";
import { Link, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useWarmUpBrowser } from "../../hooks/useWarmUpBrowser";

// ─── Colour tokens (matches ResultsScreen) ────────────────────────────────────
const C = {
  bg: "#0B0E14",
  surface: "#111520",
  surfaceRaised: "#161C2D",
  border: "#1E2640",
  borderBright: "#2E3A5C",
  text: "#E8EDF8",
  textSub: "#697A9B",
  textDim: "#3C4A66",
  accent: "#4F8EF7",
  accentGlow: "#4F8EF720",
  safe: "#00C896",
  safeGlow: "#00C89618",
};

WebBrowser.maybeCompleteAuthSession();

// ─── Google "G" icon (SVG paths drawn via View) ───────────────────────────────
// We approximate with a styled text for React Native simplicity.
// Replace with react-native-svg if you have it.

// ─── Social button component ──────────────────────────────────────────────────
type SocialBtnProps = {
  onPress: () => void;
  label: string;
  sublabel: string;
  accentColor?: string;
  surfaceColor?: string;
  borderColor?: string;
  iconChar?: string;
  iconColor?: string;
};

function SocialBtn({
  onPress,
  label,
  sublabel,
  accentColor = C.text,
  surfaceColor = C.surface,
  borderColor = C.border,
  iconChar = "G",
  iconColor = "#4285F4",
}: SocialBtnProps) {
  return (
    <TouchableOpacity
      style={[styles.socialBtn, { backgroundColor: surfaceColor, borderColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Icon bubble */}
      <View style={[styles.socialBtnIcon, { borderColor }]}>
        <Text style={[styles.socialBtnIconText, { color: iconColor }]}>
          {iconChar}
        </Text>
      </View>

      {/* Labels */}
      <View style={styles.socialBtnLabels}>
        <Text style={[styles.socialBtnLabel, { color: accentColor }]}>
          {label}
        </Text>
        <Text style={styles.socialBtnSublabel}>{sublabel}</Text>
      </View>

      {/* Chevron */}
      <Text style={[styles.socialBtnChevron, { color: C.textDim }]}>›</Text>
    </TouchableOpacity>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function LoginScreen() {
  useWarmUpBrowser();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  const { startOAuthFlow: googleAuth } = useOAuth({ strategy: "oauth_google" });
  const { startOAuthFlow: facebookAuth } = useOAuth({
    strategy: "oauth_facebook",
  });

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/" as any);
    }
  }, [isSignedIn, isLoaded, router]);

  const onSelectAuth = useCallback(
    async (strategy: "google" | "facebook") => {
      const selectedAuth = strategy === "google" ? googleAuth : facebookAuth;
      try {
        const { createdSessionId, setActive } = await selectedAuth({
          redirectUrl: Linking.createURL("/", { scheme: "moskito" }),
        });
        if (createdSessionId && setActive) {
          await setActive({ session: createdSessionId });
          router.replace("/" as any);
        }
      } catch (err) {
        console.error("OAuth Error:", err);
      }
    },
    [googleAuth, facebookAuth, router],
  );

  if (!isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>AUTHENTICATING</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={styles.screen}>
        {/* ── Hero ── */}
        <View style={styles.hero}>
          {/* Logo mark */}
          <View style={styles.logoWrap}>
            <Image
              source={require("../../assets/images/Aedex.png")}
              style={{
                width: 70,
                height: 70,
                resizeMode: "contain",
              }}
            />
          </View>

          {/* Status badges */}
          <View style={styles.badgeRow}>
            <View style={styles.pulse} />
            <View style={[styles.badge, styles.badgeBlue]}>
              <Text style={[styles.badgeText, { color: C.accent }]}>
                VEC-PRO v2
              </Text>
            </View>
          </View>

          {/* Headlines */}
          <Text style={styles.eyebrow}>Moskito</Text>
          <Text style={styles.heroTitle}>Sign in to{"\n"}your account</Text>
          <Text style={styles.heroSub}>
            Authenticate to access the vector surveillance network and field
            reporting system.
          </Text>
        </View>

        {/* ── Auth buttons ── */}
        <View style={styles.cardSection}>
          <SocialBtn
            onPress={() => onSelectAuth("google")}
            label="Continue with Google"
            sublabel="Sign in using your Google account"
            iconChar="G"
            iconColor="#4285F4"
          />

          <SocialBtn
            onPress={() => onSelectAuth("facebook")}
            label="Continue with Facebook"
            sublabel="Sign in using your Facebook account"
            iconChar="f"
            iconColor="#1877F2"
            surfaceColor="#0F1E3A"
            borderColor="#1D3060"
            accentColor={C.text}
          />

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/signup" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
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
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 3,
    color: C.textSub,
  },
  screen: {
    flex: 1,
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
    borderColor: C.border,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    overflow: "hidden",
  },
  logoDot: {
    width: 22,
    height: 22,
    backgroundColor: C.accent,
    borderRadius: 6,
    shadowColor: C.accent,
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },

  // Badges
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  pulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.safe,
    shadowColor: C.safe,
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 4,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeBlue: {
    backgroundColor: C.accentGlow,
    borderColor: C.accent + "40",
  },
  badgeGreen: {
    backgroundColor: C.safeGlow,
    borderColor: C.safe + "40",
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 3,
    color: C.accent,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "800",
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

  // ── Card section
  cardSection: {
    gap: 10,
    marginTop: 32,
  },
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
    backgroundColor: "#161C2D",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  socialBtnIconText: {
    fontSize: 16,
    fontWeight: "800",
  },
  socialBtnLabels: {
    flex: 1,
    gap: 2,
  },
  socialBtnLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: C.text,
  },
  socialBtnSublabel: {
    fontSize: 10,
    color: C.textSub,
    fontWeight: "500",
  },
  socialBtnChevron: {
    fontSize: 20,
    color: C.textDim,
    marginRight: 2,
  },

  // ── Divider
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 0,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: "700",
    color: C.textDim,
    letterSpacing: 1,
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
});
