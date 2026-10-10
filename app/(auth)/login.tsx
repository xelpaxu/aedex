import { api } from "@/convex/_generated/api";
import { useAuth, useOAuth, useSignIn } from "@clerk/clerk-expo";
import { useMutation } from "convex/react";
import * as Linking from "expo-linking";
import { Link, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  RotateCw,
  Shield,
  ShieldCheck,
  User as UserIcon,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import Svg, { Path } from "react-native-svg";
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

export default function LoginScreen() {
  useWarmUpBrowser();
  const router = useRouter();
  const { colors: C, isDark } = useTheme();
  const { isSignedIn, isLoaded: isAuthLoaded, userId } = useAuth();
  const { signIn, setActive, isLoaded: isSignInLoaded } = useSignIn();

  // Role toggle: citizen vs tanod
  const [role, setRole] = useState<"citizen" | "tanod">("citizen");

  // Email & Password state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Status & Error state
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot Password Modal state
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotStep, setForgotStep] = useState<"request" | "reset">("request");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const createOrUpdateUser = useMutation(api.users.loginWithFirebase);

  const { startOAuthFlow: googleAuth } = useOAuth({ strategy: "oauth_google" });
  const { startOAuthFlow: facebookAuth } = useOAuth({ strategy: "oauth_facebook" });

  useEffect(() => {
    if (isAuthLoaded && isSignedIn && !isProcessing) {
      router.replace("/(root)");
    }
  }, [isAuthLoaded, isSignedIn, isProcessing, router]);

  // Extract human-readable error from Clerk response
  const parseClerkError = (err: any): string => {
    if (err?.errors && Array.isArray(err.errors) && err.errors.length > 0) {
      return (
        err.errors[0]?.longMessage ||
        err.errors[0]?.message ||
        "Authentication failed. Please verify your credentials."
      );
    }
    if (err?.message) return err.message;
    return "An error occurred during authentication. Please try again.";
  };

  // ── Handle Email / Password Login ──
  const handleEmailLogin = async () => {
    if (!isSignInLoaded) return;
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage("Please enter your email address.");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setIsProcessing(true);
    try {
      const signInAttempt = await signIn.create({
        identifier: trimmedEmail,
        password: password,
      });

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });

        try {
          await createOrUpdateUser({
            uid: userId || (signInAttempt as any)?.createdUserId || "user",
            email: trimmedEmail,
            username: trimmedEmail.split("@")[0] || "user",
            displayName: trimmedEmail.split("@")[0] || "User",
            role: role,
          });
        } catch (convexError) {
          console.warn("Convex user sync warning:", convexError);
        }

        router.replace("/(root)");
      } else {
        console.warn("Sign-in incomplete status:", signInAttempt.status);
        setErrorMessage("Additional verification is required for this account.");
      }
    } catch (err: any) {
      console.error("Sign-in error:", err);
      setErrorMessage(parseClerkError(err));
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Handle Social Login (Google / Facebook) ──
  const onSelectSocialAuth = useCallback(
    async (strategy: "google" | "facebook") => {
      if (isProcessing) return;
      setErrorMessage(null);
      setIsProcessing(true);

      const selectedAuth = strategy === "google" ? googleAuth : facebookAuth;

      try {
        const { createdSessionId, setActive: setOAuthActive } = await selectedAuth({
          redirectUrl: Linking.createURL("/", { scheme: "aedex" }),
        });

        if (createdSessionId && setOAuthActive) {
          await setOAuthActive({ session: createdSessionId });

          try {
            await createOrUpdateUser({
              uid: userId || "unknown",
              email: "",
              username: role === "tanod" ? "tanod_user" : "citizen_user",
              displayName: role === "tanod" ? "Tanod Officer" : "Citizen User",
              role: role,
            });
          } catch (convexError) {
            console.error("Convex user sync error:", convexError);
          }

          if (role === "tanod") {
            router.replace({
              pathname: "/(auth)/complete-profile",
              params: { role: "tanod" },
            } as any);
          } else {
            router.replace("/(root)");
          }
        }
      } catch (err: any) {
        console.error("OAuth Error:", err);
        setErrorMessage(parseClerkError(err));
      } finally {
        setIsProcessing(false);
      }
    },
    [googleAuth, facebookAuth, router, createOrUpdateUser, isProcessing, role, userId],
  );

  // ── Forgot Password Handlers ──
  const handleOpenForgot = () => {
    setForgotEmail(email.trim());
    setForgotCode("");
    setForgotNewPassword("");
    setForgotStep("request");
    setForgotError(null);
    setForgotModalVisible(true);
  };

  const handleRequestResetCode = async () => {
    if (!isSignInLoaded) return;
    const trimmed = forgotEmail.trim();
    if (!trimmed) {
      setForgotError("Please enter your registered email address.");
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: trimmed,
      });
      setForgotStep("reset");
    } catch (err: any) {
      setForgotError(parseClerkError(err));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!isSignInLoaded) return;
    if (!forgotCode.trim()) {
      setForgotError("Please enter the verification code.");
      return;
    }
    if (forgotNewPassword.length < 8) {
      setForgotError("New password must be at least 8 characters.");
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: forgotCode.trim(),
        password: forgotNewPassword,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        setForgotModalVisible(false);
        router.replace("/(root)");
      } else {
        setForgotError("Password reset incomplete. Please check your credentials.");
      }
    } catch (err: any) {
      setForgotError(parseClerkError(err));
    } finally {
      setForgotLoading(false);
    }
  };

  const styles = useMemo(() => createStyles(C, isDark), [C, isDark]);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={C.bg}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Brand Header ── */}
          <View style={styles.header}>
            <View style={styles.badgeRow}>
              <View style={styles.pulseDot} />
              <Text style={styles.badgeText}>AEDEX SURVEILLANCE & TRIAGE</Text>
            </View>

            <View style={styles.brandingRow}>
              <View style={styles.logoWrap}>
                <Image
                  source={require("../../assets/logo/aedex.png")}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.titleWrap}>
                <Text style={styles.heroTitle}>Welcome Back</Text>
                <Text style={styles.heroSub}>
                  Sign in to monitor dengue vectors, risk heatmaps, and barangay response actions.
                </Text>
              </View>
            </View>
          </View>

          {/* ── Role Selector Pill ── */}
          <View style={styles.roleContainer}>
            <Text style={styles.roleLabel}>SIGN IN AS</Text>
            <View style={styles.roleTabs}>
              <TouchableOpacity
                style={[
                  styles.roleTab,
                  role === "citizen" && styles.roleTabActiveCitizen,
                ]}
                onPress={() => setRole("citizen")}
                activeOpacity={0.7}
              >
                <UserIcon
                  size={15}
                  color={role === "citizen" ? C.accent : C.textSub}
                />
                <Text
                  style={[
                    styles.roleTabText,
                    role === "citizen" && { color: C.text, fontWeight: "700" },
                  ]}
                >
                  Citizen Resident
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleTab,
                  role === "tanod" && styles.roleTabActiveTanod,
                ]}
                onPress={() => setRole("tanod")}
                activeOpacity={0.7}
              >
                <ShieldCheck
                  size={15}
                  color={role === "tanod" ? C.warn : C.textSub}
                />
                <Text
                  style={[
                    styles.roleTabText,
                    role === "tanod" && { color: C.warn, fontWeight: "700" },
                  ]}
                >
                  Barangay Tanod
                </Text>
              </TouchableOpacity>
            </View>

            {role === "tanod" && (
              <View style={styles.tanodNotice}>
                <Shield size={14} color={C.warn} />
                <Text style={styles.tanodNoticeText}>
                  Field Officer mode: triage breeding sites and dispatch inspection reports.
                </Text>
              </View>
            )}
          </View>

          {/* ── Error Banner ── */}
          {errorMessage && (
            <View style={styles.errorBanner}>
              <AlertCircle size={18} color={C.danger} />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          )}

          {/* ── Email & Password Form ── */}
          <View style={styles.formCard}>
            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <View
                style={[
                  styles.inputWrap,
                  focusedField === "email" && styles.inputWrapFocused,
                ]}
              >
                <Mail
                  size={18}
                  color={focusedField === "email" ? C.accent : C.textDim}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="juan@example.com"
                  placeholderTextColor={C.textDim}
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  editable={!isProcessing}
                />
                {email.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setEmail("")}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={16} color={C.textDim} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <View style={styles.passwordLabelRow}>
                <Text style={styles.inputLabel}>PASSWORD</Text>
                <TouchableOpacity onPress={handleOpenForgot} activeOpacity={0.7}>
                  <Text style={styles.forgotLink}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>
              <View
                style={[
                  styles.inputWrap,
                  focusedField === "password" && styles.inputWrapFocused,
                ]}
              >
                <Lock
                  size={18}
                  color={focusedField === "password" ? C.accent : C.textDim}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your password"
                  placeholderTextColor={C.textDim}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="password"
                  editable={!isProcessing}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}
                >
                  {showPassword ? (
                    <EyeOff size={18} color={C.textDim} />
                  ) : (
                    <Eye size={18} color={C.textDim} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Remember Me Option */}
            <TouchableOpacity
              style={styles.rememberRow}
              onPress={() => setRememberMe(!rememberMe)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.checkbox,
                  rememberMe && { backgroundColor: C.accent, borderColor: C.accent },
                ]}
              >
                {rememberMe && <CheckCircle2 size={13} color="#FFFFFF" />}
              </View>
              <Text style={styles.rememberText}>Keep me signed in on this device</Text>
            </TouchableOpacity>

            {/* Primary Sign In Button */}
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                role === "tanod" && { backgroundColor: C.warn },
                isProcessing && styles.btnDisabled,
              ]}
              onPress={handleEmailLogin}
              activeOpacity={0.8}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <View style={styles.btnRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>AUTHENTICATING...</Text>
                </View>
              ) : (
                <View style={styles.btnRow}>
                  <Text style={styles.primaryBtnText}>
                    Sign In as {role === "tanod" ? "Tanod Officer" : "Citizen"}
                  </Text>
                  <ArrowRight size={18} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Social Auth Divider ── */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ── Social Buttons ── */}
          <View style={styles.socialRow}>
            <TouchableOpacity
              style={styles.socialBtn}
              onPress={() => onSelectSocialAuth("google")}
              activeOpacity={0.7}
              disabled={isProcessing}
            >
              <GoogleLogo size={20} />
              <Text style={styles.socialBtnText}>Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.socialBtn}
              onPress={() => onSelectSocialAuth("facebook")}
              activeOpacity={0.7}
              disabled={isProcessing}
            >
              <FacebookLogo size={20} />
              <Text style={styles.socialBtnText}>Facebook</Text>
            </TouchableOpacity>
          </View>

          {/* ── Footer Link ── */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don&apos;t have an account? </Text>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.footerLink}>Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Forgot Password Modal ── */}
      <Modal
        visible={forgotModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setForgotModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <KeyRound size={22} color={C.accent} />
              </View>
              <TouchableOpacity
                onPress={() => setForgotModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color={C.textDim} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalTitle}>
              {forgotStep === "request" ? "Reset Your Password" : "Enter Verification Code"}
            </Text>
            <Text style={styles.modalSubtitle}>
              {forgotStep === "request"
                ? "Enter your registered email address and we'll send you a password recovery code."
                : `We sent a reset code to ${forgotEmail}. Enter it below along with your new password.`}
            </Text>

            {forgotError && (
              <View style={styles.modalErrorBanner}>
                <AlertCircle size={16} color={C.danger} />
                <Text style={styles.modalErrorText}>{forgotError}</Text>
              </View>
            )}

            {forgotStep === "request" ? (
              <View style={{ gap: 14, marginTop: 12 }}>
                <View style={styles.inputWrap}>
                  <Mail size={18} color={C.textDim} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your registered email"
                    placeholderTextColor={C.textDim}
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!forgotLoading}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, forgotLoading && styles.btnDisabled]}
                  onPress={handleRequestResetCode}
                  activeOpacity={0.8}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Send Reset Code</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 14, marginTop: 12 }}>
                <View style={styles.inputWrap}>
                  <KeyRound size={18} color={C.textDim} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="6-digit reset code"
                    placeholderTextColor={C.textDim}
                    value={forgotCode}
                    onChangeText={setForgotCode}
                    keyboardType="number-pad"
                    editable={!forgotLoading}
                  />
                </View>

                <View style={styles.inputWrap}>
                  <Lock size={18} color={C.textDim} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter new password (min. 8 chars)"
                    placeholderTextColor={C.textDim}
                    value={forgotNewPassword}
                    onChangeText={setForgotNewPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    editable={!forgotLoading}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, forgotLoading && styles.btnDisabled]}
                  onPress={handleResetPassword}
                  activeOpacity={0.8}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Reset Password & Sign In</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resendBtn}
                  onPress={() => setForgotStep("request")}
                  disabled={forgotLoading}
                >
                  <RotateCw size={14} color={C.accent} />
                  <Text style={[styles.resendText, { color: C.accent }]}>
                    Change email or resend code
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (C: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: C.bg,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 22,
      paddingTop: 16,
      paddingBottom: 36,
    },

    // ── Header
    header: {
      marginBottom: 20,
    },
    badgeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      alignSelf: "flex-start",
      paddingVertical: 5,
      paddingHorizontal: 10,
      backgroundColor: C.accentGlow,
      borderColor: C.accent + "33",
      borderWidth: 1,
      borderRadius: 20,
      marginBottom: 14,
    },
    pulseDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: C.safe,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.6,
      color: C.accent,
    },
    brandingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    logoWrap: {
      width: 58,
      height: 58,
      backgroundColor: C.surface,
      borderColor: C.borderBright,
      borderWidth: 1,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      padding: 8,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.4 : 0.08,
      shadowRadius: 10,
      elevation: 3,
    },
    logoImage: {
      width: "100%",
      height: "100%",
    },
    titleWrap: {
      flex: 1,
    },
    heroTitle: {
      fontSize: 26,
      fontWeight: "800",
      color: C.text,
      letterSpacing: -0.6,
      lineHeight: 32,
      marginBottom: 3,
    },
    heroSub: {
      fontSize: 12,
      color: C.textSub,
      lineHeight: 17,
    },

    // ── Role Selector
    roleContainer: {
      marginBottom: 18,
      gap: 8,
    },
    roleLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: C.textDim,
      letterSpacing: 0.8,
    },
    roleTabs: {
      flexDirection: "row",
      backgroundColor: C.surface,
      borderRadius: 14,
      padding: 4,
      borderWidth: 1,
      borderColor: C.border,
      gap: 6,
    },
    roleTab: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 10,
      borderRadius: 10,
    },
    roleTabActiveCitizen: {
      backgroundColor: C.surfaceRaised,
      borderColor: C.accent + "50",
      borderWidth: 1,
    },
    roleTabActiveTanod: {
      backgroundColor: C.warnGlow,
      borderColor: C.warn + "60",
      borderWidth: 1,
    },
    roleTabText: {
      fontSize: 13,
      fontWeight: "600",
      color: C.textSub,
    },
    tanodNotice: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: C.warnGlow,
      borderColor: C.warn + "30",
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    tanodNoticeText: {
      fontSize: 11,
      color: C.warn,
      flex: 1,
      lineHeight: 16,
      fontWeight: "500",
    },

    // ── Error Banner
    errorBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: C.dangerGlow,
      borderColor: C.danger + "40",
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
    },
    errorBannerText: {
      fontSize: 12,
      color: C.danger,
      flex: 1,
      lineHeight: 17,
      fontWeight: "500",
    },

    // ── Form Card
    formCard: {
      backgroundColor: C.surface,
      borderColor: C.border,
      borderWidth: 1,
      borderRadius: 20,
      padding: 18,
      gap: 16,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.35 : 0.05,
      shadowRadius: 12,
      elevation: 2,
    },
    inputGroup: {
      gap: 6,
    },
    inputLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: C.textDim,
      letterSpacing: 0.6,
    },
    passwordLabelRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    forgotLink: {
      fontSize: 11,
      fontWeight: "600",
      color: C.accent,
    },
    inputWrap: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: C.surfaceRaised,
      borderColor: C.border,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      height: 48,
      gap: 10,
    },
    inputWrapFocused: {
      borderColor: C.accent,
      backgroundColor: C.surfaceElevated,
    },
    textInput: {
      flex: 1,
      color: C.text,
      fontSize: 14,
      fontWeight: "500",
      paddingVertical: 0,
    },

    // Remember Row
    rememberRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
    },
    checkbox: {
      width: 18,
      height: 18,
      borderRadius: 5,
      borderWidth: 1.5,
      borderColor: C.textDim,
      alignItems: "center",
      justifyContent: "center",
    },
    rememberText: {
      fontSize: 12,
      color: C.textSub,
      fontWeight: "500",
    },

    // Primary Button
    primaryBtn: {
      backgroundColor: C.accent,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
      shadowColor: C.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 3,
    },
    primaryBtnText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "700",
      letterSpacing: 0.3,
    },
    btnRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    btnDisabled: {
      opacity: 0.65,
    },

    // ── Divider
    dividerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginVertical: 18,
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
      letterSpacing: 0.8,
    },

    // ── Social Row
    socialRow: {
      flexDirection: "row",
      gap: 12,
    },
    socialBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 9,
      backgroundColor: C.surface,
      borderColor: C.border,
      borderWidth: 1,
      borderRadius: 14,
      paddingVertical: 12,
    },
    socialBtnText: {
      fontSize: 13,
      fontWeight: "600",
      color: C.text,
    },

    // ── Footer
    footer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: 24,
    },
    footerText: {
      fontSize: 13,
      color: C.textSub,
      fontWeight: "400",
    },
    footerLink: {
      fontSize: 13,
      fontWeight: "700",
      color: C.accent,
    },

    // ── Forgot Password Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.72)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    modalCard: {
      width: "100%",
      backgroundColor: C.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: C.borderBright,
      padding: 22,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 8,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    modalIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: C.accentGlow,
      borderWidth: 1,
      borderColor: C.accent + "40",
      alignItems: "center",
      justifyContent: "center",
    },
    modalCloseBtn: {
      padding: 6,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: C.text,
      marginBottom: 6,
    },
    modalSubtitle: {
      fontSize: 12,
      color: C.textSub,
      lineHeight: 18,
      marginBottom: 6,
    },
    modalErrorBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: C.dangerGlow,
      borderColor: C.danger + "40",
      borderWidth: 1,
      borderRadius: 10,
      padding: 10,
      marginTop: 6,
    },
    modalErrorText: {
      fontSize: 12,
      color: C.danger,
      flex: 1,
      lineHeight: 16,
    },
    resendBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 8,
    },
    resendText: {
      fontSize: 12,
      fontWeight: "600",
    },
  });
