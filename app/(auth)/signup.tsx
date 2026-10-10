import { useAuth, useOAuth, useSignUp } from "@clerk/clerk-expo";
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
  Sparkles,
  User as UserIcon,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  View,
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

export default function SignupScreen() {
  useWarmUpBrowser();
  const router = useRouter();
  const { colors: C, isDark } = useTheme();
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth();
  const { signUp, setActive, isLoaded: isSignUpLoaded } = useSignUp();

  // Selected Role: Citizen vs Tanod
  const [selectedRole, setSelectedRole] = useState<"citizen" | "tanod">("citizen");
  const isTanodRegistration = useRef(false);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Status & Error state
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // OTP Verification Modal state (for email code confirmation)
  const [verificationModalVisible, setVerificationModalVisible] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Social OAuth hooks
  const { startOAuthFlow: googleAuth } = useOAuth({ strategy: "oauth_google" });
  const { startOAuthFlow: facebookAuth } = useOAuth({ strategy: "oauth_facebook" });

  useEffect(() => {
    if (isAuthLoaded && isSignedIn && !isProcessing) {
      router.replace({
        pathname: "/(auth)/complete-profile",
        params: { role: isTanodRegistration.current ? "tanod" : selectedRole },
      });
    }
  }, [isAuthLoaded, isSignedIn, isProcessing, router, selectedRole]);

  const parseClerkError = (err: any): string => {
    if (err?.errors && Array.isArray(err.errors) && err.errors.length > 0) {
      return (
        err.errors[0]?.longMessage ||
        err.errors[0]?.message ||
        "Registration failed. Please check your information."
      );
    }
    if (err?.message) return err.message;
    return "An error occurred during account creation. Please try again.";
  };

  // ── Handle Email / Password Sign Up ──
  const handleEmailSignUp = async () => {
    if (!isSignUpLoaded) return;
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    const trimmedName = fullName.trim();

    if (!trimmedName) {
      setErrorMessage("Please enter your full name.");
      return;
    }
    if (!trimmedEmail) {
      setErrorMessage("Please enter your email address.");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter a password.");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsProcessing(true);
    isTanodRegistration.current = selectedRole === "tanod";

    try {
      const nameParts = trimmedName.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      await signUp.create({
        emailAddress: trimmedEmail,
        password: password,
        firstName: firstName,
        lastName: lastName,
      });

      // Prepare email verification if required
      if (signUp.status === "complete") {
        await setActive({ session: signUp.createdSessionId });
        router.replace({
          pathname: "/(auth)/complete-profile",
          params: { role: selectedRole },
        });
      } else {
        // Send email verification code
        await signUp.prepareEmailAddressVerification({
          strategy: "email_code",
        });
        setVerificationError(null);
        setVerificationCode("");
        setVerificationModalVisible(true);
      }
    } catch (err: any) {
      console.error("Sign-up error:", err);
      setErrorMessage(parseClerkError(err));
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Submit OTP Verification Code ──
  const handleVerifyEmail = async () => {
    if (!isSignUpLoaded) return;
    const trimmedCode = verificationCode.trim();
    if (!trimmedCode) {
      setVerificationError("Please enter the verification code sent to your email.");
      return;
    }

    setVerificationLoading(true);
    setVerificationError(null);

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: trimmedCode,
      });

      if (completeSignUp.status === "complete") {
        await setActive({ session: completeSignUp.createdSessionId });
        setVerificationModalVisible(false);
        router.replace({
          pathname: "/(auth)/complete-profile",
          params: { role: selectedRole },
        });
      } else {
        setVerificationError(
          "Verification status incomplete. Please check your verification code.",
        );
      }
    } catch (err: any) {
      console.error("Verification error:", err);
      setVerificationError(parseClerkError(err));
    } finally {
      setVerificationLoading(false);
    }
  };

  // ── Resend OTP Code ──
  const handleResendCode = async () => {
    if (!isSignUpLoaded) return;
    try {
      setVerificationLoading(true);
      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });
      Alert.alert("Code Resent", "A new verification code has been sent to your email.");
    } catch (err: any) {
      setVerificationError(parseClerkError(err));
    } finally {
      setVerificationLoading(false);
    }
  };

  // ── Handle Social Registration (Google / Facebook) ──
  const onSelectSocialAuth = useCallback(
    async (strategy: "google" | "facebook") => {
      if (isProcessing) return;
      setErrorMessage(null);
      setIsProcessing(true);
      isTanodRegistration.current = selectedRole === "tanod";

      const selectedAuth = strategy === "google" ? googleAuth : facebookAuth;

      try {
        const { createdSessionId, setActive: setOAuthActive } = await selectedAuth({
          redirectUrl: Linking.createURL("/", { scheme: "aedex" }),
        });

        if (createdSessionId && setOAuthActive) {
          await setOAuthActive({ session: createdSessionId });
          router.replace({
            pathname: "/(auth)/complete-profile",
            params: { role: selectedRole },
          } as any);
        }
      } catch (err: any) {
        console.error("OAuth Error:", err);
        setErrorMessage(parseClerkError(err));
      } finally {
        setIsProcessing(false);
      }
    },
    [googleAuth, facebookAuth, router, isProcessing, selectedRole],
  );

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
          {/* ── Top Bar & Step Counter ── */}
          <View style={styles.topBar}>
            <View style={styles.stepBadge}>
              <View style={styles.stepDotActive} />
              <View style={styles.stepDotInactive} />
              <Text style={styles.stepBadgeText}>STEP 1 OF 2 • ACCOUNT SETUP</Text>
            </View>
          </View>

          {/* ── Brand Header ── */}
          <View style={styles.header}>
            <View style={styles.brandingRow}>
              <View style={styles.logoWrap}>
                <Image
                  source={require("../../assets/logo/aedex.png")}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.titleWrap}>
                <Text style={styles.heroTitle}>Create Account</Text>
                <Text style={styles.heroSub}>
                  Join your community in early detection and reporting of mosquito breeding sites.
                </Text>
              </View>
            </View>
          </View>

          {/* ── Account Role Selection Cards ── */}
          <View style={styles.roleSection}>
            <Text style={styles.roleSectionLabel}>CHOOSE YOUR ACCOUNT TYPE</Text>
            <View style={styles.roleCardsRow}>
              {/* Citizen Card */}
              <TouchableOpacity
                style={[
                  styles.roleCard,
                  selectedRole === "citizen" && styles.roleCardActiveCitizen,
                ]}
                onPress={() => setSelectedRole("citizen")}
                activeOpacity={0.7}
              >
                <View style={styles.roleCardTop}>
                  <View
                    style={[
                      styles.roleIconCircle,
                      selectedRole === "citizen" && {
                        backgroundColor: C.accentGlow,
                        borderColor: C.accent,
                      },
                    ]}
                  >
                    <UserIcon
                      size={18}
                      color={selectedRole === "citizen" ? C.accent : C.textSub}
                    />
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      selectedRole === "citizen" && {
                        borderColor: C.accent,
                        backgroundColor: C.accent,
                      },
                    ]}
                  >
                    {selectedRole === "citizen" && (
                      <CheckCircle2 size={12} color="#FFFFFF" />
                    )}
                  </View>
                </View>
                <Text
                  style={[
                    styles.roleCardTitle,
                    selectedRole === "citizen" && { color: C.text },
                  ]}
                >
                  Citizen Resident
                </Text>
                <Text style={styles.roleCardDesc}>
                  Report breeding hazards, track community heatmaps & receive safety tips.
                </Text>
              </TouchableOpacity>

              {/* Barangay Tanod Card */}
              <TouchableOpacity
                style={[
                  styles.roleCard,
                  selectedRole === "tanod" && styles.roleCardActiveTanod,
                ]}
                onPress={() => setSelectedRole("tanod")}
                activeOpacity={0.7}
              >
                <View style={styles.roleCardTop}>
                  <View
                    style={[
                      styles.roleIconCircle,
                      selectedRole === "tanod" && {
                        backgroundColor: C.warnGlow,
                        borderColor: C.warn,
                      },
                    ]}
                  >
                    <ShieldCheck
                      size={18}
                      color={selectedRole === "tanod" ? C.warn : C.textSub}
                    />
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      selectedRole === "tanod" && {
                        borderColor: C.warn,
                        backgroundColor: C.warn,
                      },
                    ]}
                  >
                    {selectedRole === "tanod" && (
                      <CheckCircle2 size={12} color="#FFFFFF" />
                    )}
                  </View>
                </View>
                <Text
                  style={[
                    styles.roleCardTitle,
                    selectedRole === "tanod" && { color: C.warn },
                  ]}
                >
                  Barangay Tanod
                </Text>
                <Text style={styles.roleCardDesc}>
                  Field response team • verify incident reports and coordinate barangay actions.
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Error Banner ── */}
          {errorMessage && (
            <View style={styles.errorBanner}>
              <AlertCircle size={18} color={C.danger} />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          )}

          {/* ── Email & Password Registration Form ── */}
          <View style={styles.formCard}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>FULL NAME</Text>
              <View
                style={[
                  styles.inputWrap,
                  focusedField === "fullName" && styles.inputWrapFocused,
                ]}
              >
                <UserIcon
                  size={18}
                  color={focusedField === "fullName" ? C.accent : C.textDim}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Maria Clara Santos"
                  placeholderTextColor={C.textDim}
                  value={fullName}
                  onChangeText={(val) => {
                    setFullName(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onFocus={() => setFocusedField("fullName")}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!isProcessing}
                />
              </View>
            </View>

            {/* Email Address */}
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
                  placeholder="maria@example.com"
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
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD (MIN. 8 CHARS)</Text>
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
                  placeholder="Create a strong password"
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
                  textContentType="newPassword"
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

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
              <View
                style={[
                  styles.inputWrap,
                  focusedField === "confirmPassword" && styles.inputWrapFocused,
                ]}
              >
                <Lock
                  size={18}
                  color={focusedField === "confirmPassword" ? C.accent : C.textDim}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Re-enter your password"
                  placeholderTextColor={C.textDim}
                  value={confirmPassword}
                  onChangeText={(val) => {
                    setConfirmPassword(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onFocus={() => setFocusedField("confirmPassword")}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  editable={!isProcessing}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} color={C.textDim} />
                  ) : (
                    <Eye size={18} color={C.textDim} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Terms notice */}
            <Text style={styles.termsNotice}>
              By creating an account, you agree to AEDEX community surveillance guidelines and barangay data protection protocols.
            </Text>

            {/* Primary Sign Up Button */}
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                selectedRole === "tanod" && { backgroundColor: C.warn },
                isProcessing && styles.btnDisabled,
              ]}
              onPress={handleEmailSignUp}
              activeOpacity={0.8}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <View style={styles.btnRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>CREATING ACCOUNT...</Text>
                </View>
              ) : (
                <View style={styles.btnRow}>
                  <Text style={styles.primaryBtnText}>
                    Continue as {selectedRole === "tanod" ? "Barangay Tanod" : "Citizen"}
                  </Text>
                  <ArrowRight size={18} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Social Sign-Up Divider ── */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR SIGN UP WITH</Text>
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
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.footerLink}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Email Verification OTP Modal ── */}
      <Modal
        visible={verificationModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setVerificationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Mail size={22} color={C.accent} />
              </View>
              <TouchableOpacity
                onPress={() => setVerificationModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color={C.textDim} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalTitle}>Verify Your Email</Text>
            <Text style={styles.modalSubtitle}>
              We sent a verification code to{"\n"}
              <Text style={{ color: C.text, fontWeight: "700" }}>{email.trim()}</Text>.
              Please enter it below to finish creating your account.
            </Text>

            {verificationError && (
              <View style={styles.modalErrorBanner}>
                <AlertCircle size={16} color={C.danger} />
                <Text style={styles.modalErrorText}>{verificationError}</Text>
              </View>
            )}

            <View style={{ gap: 14, marginTop: 14 }}>
              <View style={[styles.inputWrap, { height: 52 }]}>
                <KeyRound size={20} color={C.accent} />
                <TextInput
                  style={[styles.textInput, { fontSize: 18, letterSpacing: 3, fontWeight: "700" }]}
                  placeholder="123456"
                  placeholderTextColor={C.textDim}
                  value={verificationCode}
                  onChangeText={(val) => {
                    setVerificationCode(val);
                    if (verificationError) setVerificationError(null);
                  }}
                  keyboardType="number-pad"
                  autoFocus
                  editable={!verificationLoading}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, verificationLoading && styles.btnDisabled]}
                onPress={handleVerifyEmail}
                activeOpacity={0.8}
                disabled={verificationLoading}
              >
                {verificationLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <View style={styles.btnRow}>
                    <Text style={styles.primaryBtnText}>Verify & Proceed</Text>
                    <ArrowRight size={18} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendBtn}
                onPress={handleResendCode}
                disabled={verificationLoading}
              >
                <RotateCw size={14} color={C.accent} />
                <Text style={[styles.resendText, { color: C.accent }]}>
                  Didn&apos;t get the code? Resend
                </Text>
              </TouchableOpacity>
            </View>
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
      paddingTop: 14,
      paddingBottom: 36,
    },

    // ── Top Bar & Step Badge
    topBar: {
      marginBottom: 12,
    },
    stepBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      alignSelf: "flex-start",
      paddingVertical: 5,
      paddingHorizontal: 10,
      backgroundColor: C.surfaceRaised,
      borderColor: C.border,
      borderWidth: 1,
      borderRadius: 20,
    },
    stepDotActive: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: C.accent,
    },
    stepDotInactive: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: C.borderBright,
    },
    stepBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.6,
      color: C.textSub,
      marginLeft: 2,
    },

    // ── Header
    header: {
      marginBottom: 18,
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

    // ── Role Section
    roleSection: {
      marginBottom: 18,
      gap: 8,
    },
    roleSectionLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: C.textDim,
      letterSpacing: 0.8,
    },
    roleCardsRow: {
      flexDirection: "row",
      gap: 10,
    },
    roleCard: {
      flex: 1,
      backgroundColor: C.surface,
      borderColor: C.border,
      borderWidth: 1.5,
      borderRadius: 16,
      padding: 12,
      gap: 6,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.04,
      shadowRadius: 6,
      elevation: 1,
    },
    roleCardActiveCitizen: {
      borderColor: C.accent,
      backgroundColor: C.accentGlow,
    },
    roleCardActiveTanod: {
      borderColor: C.warn,
      backgroundColor: C.warnGlow,
    },
    roleCardTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4,
    },
    roleIconCircle: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: C.surfaceRaised,
      borderColor: C.border,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    radioCircle: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1.5,
      borderColor: C.borderBright,
      alignItems: "center",
      justifyContent: "center",
    },
    roleCardTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: C.textSub,
    },
    roleCardDesc: {
      fontSize: 11,
      color: C.textDim,
      lineHeight: 15,
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
      gap: 14,
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
    termsNotice: {
      fontSize: 11,
      color: C.textDim,
      lineHeight: 16,
      textAlign: "center",
      paddingHorizontal: 4,
      marginVertical: 2,
    },

    // Primary Button
    primaryBtn: {
      backgroundColor: C.accent,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
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
      marginTop: 22,
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

    // ── Verification Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.75)",
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
      fontSize: 20,
      fontWeight: "800",
      color: C.text,
      marginBottom: 6,
    },
    modalSubtitle: {
      fontSize: 13,
      color: C.textSub,
      lineHeight: 19,
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
