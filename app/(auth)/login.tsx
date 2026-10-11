import { api } from "@/convex/_generated/api";
import { useAuth, useOAuth, useSignIn } from "@clerk/clerk-expo";
import { useMutation } from "convex/react";
import * as Linking from "expo-linking";
import { Link, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Shield,
  User,
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
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { ThemeColors, useTheme } from "../../context/ThemeContext";
import { useWarmUpBrowser } from "../../hooks/useWarmUpBrowser";

WebBrowser.maybeCompleteAuthSession();

function GoogleLogo({ size = 18 }: { size?: number }) {
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

function FacebookLogo({ size = 18 }: { size?: number }) {
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

  // Role toggle
  const [role, setRole] = useState<"citizen" | "tanod">("citizen");

  // Input states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<"email" | "password" | null>(null);

  // Status & Errors
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot password
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

  const parseClerkError = (err: any): string => {
    if (err?.errors && Array.isArray(err.errors) && err.errors.length > 0) {
      return (
        err.errors[0]?.longMessage ||
        err.errors[0]?.message ||
        "Authentication failed. Please check your credentials."
      );
    }
    if (err?.message) return err.message;
    return "An error occurred. Please try again.";
  };

  const handleEmailLogin = async () => {
    if (!isSignInLoaded) return;
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage("Please enter your email.");
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
        setErrorMessage("Verification required for this account.");
      }
    } catch (err: any) {
      setErrorMessage(parseClerkError(err));
    } finally {
      setIsProcessing(false);
    }
  };

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
        setErrorMessage(parseClerkError(err));
      } finally {
        setIsProcessing(false);
      }
    },
    [googleAuth, facebookAuth, router, createOrUpdateUser, isProcessing, role, userId],
  );

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
      setForgotError("Please enter your email.");
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
      setForgotError("Please enter the code.");
      return;
    }
    if (forgotNewPassword.length < 8) {
      setForgotError("Password must be at least 8 characters.");
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
        setForgotError("Reset incomplete. Please try again.");
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
          {/* ── Brand & Welcome ── */}
          <View style={styles.header}>
            <Image
              source={require("../../assets/logo/aedex.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Sign in to AEDEX</Text>
            <Text style={styles.subtitle}>
              Monitor dengue breeding risk and response updates
            </Text>
          </View>

          {/* ── Minimal Segmented Role Switcher ── */}
          <View style={styles.segmentContainer}>
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                role === "citizen" && styles.segmentBtnActive,
              ]}
              onPress={() => setRole("citizen")}
              activeOpacity={0.8}
            >
              <User
                size={15}
                color={role === "citizen" ? C.text : C.textSub}
              />
              <Text
                style={[
                  styles.segmentText,
                  role === "citizen" && styles.segmentTextActive,
                ]}
              >
                Resident
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentBtn,
                role === "tanod" && styles.segmentBtnActiveTanod,
              ]}
              onPress={() => setRole("tanod")}
              activeOpacity={0.8}
            >
              <Shield
                size={15}
                color={role === "tanod" ? C.warn : C.textSub}
              />
              <Text
                style={[
                  styles.segmentText,
                  role === "tanod" && { color: C.warn, fontWeight: "600" },
                ]}
              >
                Tanod Officer
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Error Notice ── */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <AlertCircle size={15} color={C.danger} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* ── Form Inputs ── */}
          <View style={styles.form}>
            {/* Email */}
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <View
                style={[
                  styles.inputWrap,
                  focusedField === "email" && styles.inputWrapFocused,
                ]}
              >
                <Mail size={17} color={C.textDim} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor={C.textDim}
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
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
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <X size={15} color={C.textDim} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Password */}
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Password</Text>
                <TouchableOpacity onPress={handleOpenForgot} activeOpacity={0.7}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <View
                style={[
                  styles.inputWrap,
                  focusedField === "password" && styles.inputWrapFocused,
                ]}
              >
                <Lock size={17} color={C.textDim} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={C.textDim}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
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
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                >
                  {showPassword ? (
                    <EyeOff size={17} color={C.textDim} />
                  ) : (
                    <Eye size={17} color={C.textDim} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                role === "tanod" && { backgroundColor: C.warn },
                isProcessing && { opacity: 0.7 },
              ]}
              onPress={handleEmailLogin}
              activeOpacity={0.85}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  Sign In
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Divider ── */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ── Social Buttons ── */}
          <View style={styles.socialRow}>
            <TouchableOpacity
              style={styles.socialBtn}
              onPress={() => onSelectSocialAuth("google")}
              activeOpacity={0.75}
              disabled={isProcessing}
            >
              <GoogleLogo size={18} />
              <Text style={styles.socialText}>Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.socialBtn}
              onPress={() => onSelectSocialAuth("facebook")}
              activeOpacity={0.75}
              disabled={isProcessing}
            >
              <FacebookLogo size={18} />
              <Text style={styles.socialText}>Facebook</Text>
            </TouchableOpacity>
          </View>

          {/* ── Footer Link ── */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don&apos;t have an account? </Text>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.footerLink}>Sign up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Forgot Password Sheet ── */}
      <Modal
        visible={forgotModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setForgotModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {forgotStep === "request" ? "Reset password" : "Enter reset code"}
              </Text>
              <TouchableOpacity
                onPress={() => setForgotModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={18} color={C.textSub} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              {forgotStep === "request"
                ? "Enter your email address and we'll send you a password reset code."
                : `We sent a code to ${forgotEmail}. Enter it below with your new password.`}
            </Text>

            {forgotError && (
              <View style={styles.errorBox}>
                <AlertCircle size={14} color={C.danger} />
                <Text style={styles.errorText}>{forgotError}</Text>
              </View>
            )}

            {forgotStep === "request" ? (
              <View style={{ gap: 14, marginTop: 6 }}>
                <View style={styles.inputWrap}>
                  <Mail size={17} color={C.textDim} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="name@example.com"
                    placeholderTextColor={C.textDim}
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!forgotLoading}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, forgotLoading && { opacity: 0.7 }]}
                  onPress={handleRequestResetCode}
                  activeOpacity={0.85}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Send reset code</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 14, marginTop: 6 }}>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.input}
                    placeholder="Reset code"
                    placeholderTextColor={C.textDim}
                    value={forgotCode}
                    onChangeText={setForgotCode}
                    keyboardType="number-pad"
                    editable={!forgotLoading}
                  />
                </View>

                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.input}
                    placeholder="New password (min 8 chars)"
                    placeholderTextColor={C.textDim}
                    value={forgotNewPassword}
                    onChangeText={setForgotNewPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    editable={!forgotLoading}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, forgotLoading && { opacity: 0.7 }]}
                  onPress={handleResetPassword}
                  activeOpacity={0.85}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Update password</Text>
                  )}
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
      paddingHorizontal: 24,
      paddingTop: 32,
      paddingBottom: 40,
      justifyContent: "center",
    },

    // ── Header
    header: {
      marginBottom: 28,
    },
    logo: {
      width: 44,
      height: 44,
      marginBottom: 16,
    },
    title: {
      fontSize: 26,
      fontWeight: "700",
      color: C.text,
      letterSpacing: -0.4,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 14,
      color: C.textSub,
      lineHeight: 20,
    },

    // ── Clean Segmented Role Switcher
    segmentContainer: {
      flexDirection: "row",
      backgroundColor: C.surfaceRaised,
      borderRadius: 12,
      padding: 3,
      marginBottom: 22,
    },
    segmentBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      paddingVertical: 10,
      borderRadius: 10,
    },
    segmentBtnActive: {
      backgroundColor: C.surface,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 3,
      elevation: 1,
    },
    segmentBtnActiveTanod: {
      backgroundColor: C.surface,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 3,
      elevation: 1,
    },
    segmentText: {
      fontSize: 13,
      fontWeight: "500",
      color: C.textSub,
    },
    segmentTextActive: {
      color: C.text,
      fontWeight: "600",
    },

    // ── Error Notice
    errorBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: isDark ? "#2A1519" : "#FEE2E2",
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 18,
    },
    errorText: {
      fontSize: 13,
      color: C.danger,
      flex: 1,
      lineHeight: 18,
    },

    // ── Form
    form: {
      gap: 16,
    },
    field: {
      gap: 6,
    },
    labelRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    label: {
      fontSize: 13,
      fontWeight: "500",
      color: C.text,
    },
    forgotText: {
      fontSize: 13,
      fontWeight: "500",
      color: C.accent,
    },
    inputWrap: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: C.surfaceRaised,
      borderRadius: 12,
      paddingHorizontal: 14,
      height: 50,
      borderWidth: 1,
      borderColor: "transparent",
    },
    inputWrapFocused: {
      borderColor: C.accent,
      backgroundColor: C.surface,
    },
    inputIcon: {
      marginRight: 10,
    },
    input: {
      flex: 1,
      color: C.text,
      fontSize: 15,
      paddingVertical: 0,
    },

    // ── Primary Button
    primaryBtn: {
      backgroundColor: C.accent,
      borderRadius: 12,
      height: 50,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 6,
    },
    primaryBtnText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "600",
    },

    // ── Divider
    divider: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginVertical: 24,
    },
    dividerLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: C.border,
    },
    dividerText: {
      fontSize: 12,
      color: C.textDim,
    },

    // ── Social
    socialRow: {
      flexDirection: "row",
      gap: 12,
    },
    socialBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: C.surfaceRaised,
      borderRadius: 12,
      height: 48,
    },
    socialText: {
      fontSize: 14,
      fontWeight: "500",
      color: C.text,
    },

    // ── Footer
    footer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: 28,
    },
    footerText: {
      fontSize: 14,
      color: C.textSub,
    },
    footerLink: {
      fontSize: 14,
      fontWeight: "600",
      color: C.accent,
    },

    // ── Modal
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "center",
      padding: 20,
    },
    modalSheet: {
      backgroundColor: C.surface,
      borderRadius: 20,
      padding: 22,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 6,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: C.text,
    },
    modalSub: {
      fontSize: 13,
      color: C.textSub,
      lineHeight: 18,
      marginBottom: 14,
    },
  });
