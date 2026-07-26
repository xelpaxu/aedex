import { useAuth, useOAuth } from "@clerk/clerk-expo";
import * as Linking from "expo-linking";
import { Link, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect } from "react";
import {
    ActivityIndicator,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useWarmUpBrowser } from "../../hooks/useWarmUpBrowser";

// ─── Colour tokens ─────────────────────────────────────────────────────────────
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
  warn: "#F5A623",
  warnGlow: "#F5A62318",
};

WebBrowser.maybeCompleteAuthSession();

// ─── Social button ─────────────────────────────────────────────────────────────
type SocialBtnProps = {
  onPress: () => void;
  label: string;
  sublabel: string;
  iconChar: string;
  iconColor: string;
  surfaceColor?: string;
  borderColor?: string;
  accentColor?: string;
};

function SocialBtn({
  onPress,
  label,
  sublabel,
  iconChar,
  iconColor,
  surfaceColor = C.surface,
  borderColor = C.border,
  accentColor = C.text,
}: SocialBtnProps) {
  return (
    <TouchableOpacity
      style={[styles.socialBtn, { backgroundColor: surfaceColor, borderColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.socialBtnIcon, { borderColor }]}>
        <Text style={[styles.socialBtnIconText, { color: iconColor }]}>
          {iconChar}
        </Text>
      </View>
      <View style={styles.socialBtnLabels}>
        <Text style={[styles.socialBtnLabel, { color: accentColor }]}>
          {label}
        </Text>
        <Text style={styles.socialBtnSublabel}>{sublabel}</Text>
      </View>
      <Text style={[styles.socialBtnChevron, { color: C.textDim }]}>›</Text>
    </TouchableOpacity>
  );
}

// ─── Step indicator ────────────────────────────────────────────────────────────
function StepDot({ active }: { active?: boolean }) {
  return (
    <View
      style={[
        styles.stepDot,
        active && {
          backgroundColor: C.accent,
          shadowColor: C.accent,
          shadowOpacity: 0.8,
          shadowRadius: 6,
          elevation: 4,
        },
      ]}
    />
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function SignupScreen() {
  useWarmUpBrowser();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  const { startOAuthFlow: googleAuth } = useOAuth({ strategy: "oauth_google" });
  const { startOAuthFlow: facebookAuth } = useOAuth({
    strategy: "oauth_facebook",
  });

  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace("/" as any);
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
        <Text style={styles.loadingText}>INITIALISING</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={styles.screen}>
        {/* ── Back button ── */}
        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backBtnChevron}>‹</Text>
            <Text style={styles.backBtnLabel}>Back to login</Text>
          </TouchableOpacity>
        </Link>

        {/* ── Hero ── */}
        <View style={styles.hero}>
          {/* Onboarding step indicator */}
          <View style={styles.stepRow}>
            <StepDot active />
            <StepDot />
            <StepDot />
            <Text style={styles.stepLabel}>Step 1 of 3 — Create account</Text>
          </View>

          {/* Logo mark */}
          <View style={styles.logoWrap}>
            {/* Outer ring */}
            <View style={styles.logoRing}>
              <View style={styles.logoDot} />
            </View>
          </View>

          {/* Tag */}
          <View style={styles.tagWrap}>
            <View style={styles.tagDot} />
            <Text style={styles.tagText}>NEW NODE REGISTRATION</Text>
          </View>

          <Text style={styles.heroTitle}>Create your{"\n"}account</Text>
          <Text style={styles.heroSub}>
            Join the Moskito vector surveillance network. Choose a method below
            to register your field identity.
          </Text>

          {/* Info strip */}
          <View style={styles.infoStrip}>
            <View style={styles.infoItem}>
              <Text style={styles.infoIcon}>✦</Text>
              <Text style={styles.infoText}>Free to join</Text>
            </View>
            <View style={styles.infoSep} />
            <View style={styles.infoItem}>
              <Text style={styles.infoIcon}>✦</Text>
              <Text style={styles.infoText}>Encrypted data</Text>
            </View>
            <View style={styles.infoSep} />
            <View style={styles.infoItem}>
              <Text style={styles.infoIcon}>✦</Text>
              <Text style={styles.infoText}>No spam</Text>
            </View>
          </View>
        </View>

        {/* ── Auth buttons ── */}
        <View style={styles.cardSection}>
          <SocialBtn
            onPress={() => onSelectAuth("google")}
            label="Sign up with Google"
            sublabel="Register using your Google account"
            iconChar="G"
            iconColor="#4285F4"
          />

          <SocialBtn
            onPress={() => onSelectAuth("facebook")}
            label="Sign up with Facebook"
            sublabel="Register using your Facebook account"
            iconChar="f"
            iconColor="#1877F2"
            surfaceColor="#0F1E3A"
            borderColor="#1D3060"
          />
        </View>

        {/* ── Terms notice ── */}
        <Text style={styles.terms}>
          By creating an account you agree to our{" "}
          <Text style={{ color: C.accent }}>Terms of Service</Text> and{" "}
          <Text style={{ color: C.accent }}>Privacy Policy</Text>.
        </Text>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Log In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

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

  // ── Back button
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: 12,
    paddingBottom: 4,
    alignSelf: "flex-start",
  },
  backBtnChevron: { fontSize: 20, color: C.textSub, lineHeight: 22 },
  backBtnLabel: { fontSize: 12, fontWeight: "600", color: C.textSub },

  // ── Step dots
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 24,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.border,
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: C.textDim,
    letterSpacing: 0.5,
    marginLeft: 6,
  },

  // ── Hero
  hero: { flex: 1, justifyContent: "center", paddingBottom: 8 },

  logoWrap: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  logoRing: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.borderBright,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  logoDot: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: C.accent,
    shadowColor: C.accent,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },

  // Tag
  tagWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 14,
  },
  tagDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.warn,
    shadowColor: C.warn,
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 3,
  },
  tagText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
    color: C.warn,
    textTransform: "uppercase",
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
    marginBottom: 20,
  },

  // Info strip
  infoStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 0,
  },
  infoItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  infoSep: { width: 1, height: 14, backgroundColor: C.border },
  infoIcon: { fontSize: 8, color: C.accent },
  infoText: { fontSize: 10, fontWeight: "600", color: C.textSub },

  // ── Card section
  cardSection: { gap: 10, marginTop: 24 },

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
  socialBtnIconText: { fontSize: 16, fontWeight: "800" },
  socialBtnLabels: { flex: 1, gap: 2 },
  socialBtnLabel: { fontSize: 14, fontWeight: "700", color: C.text },
  socialBtnSublabel: { fontSize: 10, color: C.textSub, fontWeight: "500" },
  socialBtnChevron: { fontSize: 20, color: C.textDim, marginRight: 2 },

  // ── Terms
  terms: {
    fontSize: 10,
    color: C.textDim,
    textAlign: "center",
    lineHeight: 16,
    marginTop: 16,
    paddingHorizontal: 8,
  },

  // ── Footer
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  footerText: { fontSize: 12, color: C.textSub },
  footerLink: { fontSize: 12, fontWeight: "700", color: C.accent },
});
