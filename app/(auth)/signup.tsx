import { useAuth, useOAuth, useSignIn, useSignUp } from "@clerk/clerk-expo";
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
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
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

export default function SignupScreen() {
  useWarmUpBrowser();
  const router = useRouter();
  const { colors: C, isDark } = useTheme();
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth();
  const { signUp, setActive, isLoaded: isSignUpLoaded } = useSignUp();
  const { signIn, isLoaded: isSignInLoaded } = useSignIn();

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<
    "fullName" | "email" | "password" | "confirmPassword" | null
  >(null);

  // Status & Errors
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Social OAuth
  const { startOAuthFlow: googleAuth } = useOAuth({ strategy: "oauth_google" });
  const { startOAuthFlow: facebookAuth } = useOAuth({ strategy: "oauth_facebook" });

  useEffect(() => {
    if (isAuthLoaded && isSignedIn && !isProcessing) {
      router.replace("/(auth)/complete-profile");
    }
  }, [isAuthLoaded, isSignedIn, isProcessing, router]);

  const parseClerkError = (err: any): string => {
    if (err?.errors && Array.isArray(err.errors) && err.errors.length > 0) {
      return (
        err.errors[0]?.longMessage ||
        err.errors[0]?.message ||
        "Registration failed. Please check your information."
      );
    }
    if (err?.message) return err.message;
    return "An error occurred. Please try again.";
  };

  const handleEmailSignUp = async () => {
    if (!isSignUpLoaded) return;
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    const trimmedName = fullName.trim();

    if (!trimmedName) {
      setErrorMessage("Please enter your name.");
      return;
    }
    if (!trimmedEmail) {
      setErrorMessage("Please enter your email.");
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

    try {
      const nameParts = trimmedName.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const createdUser = await signUp.create({
        emailAddress: trimmedEmail,
        password: password,
        firstName: firstName,
        lastName: lastName,
      });

      if (createdUser.status === "complete" || createdUser.createdSessionId) {
        if (createdUser.createdSessionId) {
          await setActive({ session: createdUser.createdSessionId });
        }
        router.replace("/(auth)/complete-profile");
        return;
      }

      // Immediately establish session without requiring verification code
      if (isSignInLoaded) {
        try {
          let signInAttempt = await signIn.create({
            identifier: trimmedEmail,
            password: password,
          });

          if (signInAttempt.status === "needs_first_factor") {
            signInAttempt = await signIn.attemptFirstFactor({
              strategy: "password",
              password: password,
            });
          }

          if (signInAttempt.status === "complete" || signInAttempt.createdSessionId) {
            if (signInAttempt.createdSessionId) {
              await setActive({ session: signInAttempt.createdSessionId });
            }
            router.replace("/(auth)/complete-profile");
            return;
          }
        } catch (signInErr) {
          console.warn("Direct sign-in attempt warning:", signInErr);
        }
      }

      // Proceed directly to complete profile
      router.replace("/(auth)/complete-profile");
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
          router.replace("/(auth)/complete-profile");
        }
      } catch (err: any) {
        console.error("OAuth Error:", err);
        setErrorMessage(parseClerkError(err));
      } finally {
        setIsProcessing(false);
      }
    },
    [googleAuth, facebookAuth, router, isProcessing],
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
          {/* ── Brand & Welcome ── */}
          <View style={styles.header}>
            <Image
              source={require("../../assets/logo/aedex.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.appTitle}>AEDEX</Text>
            <Text style={styles.appSubtitle}>VECTOR SURVEILLANCE & TRIAGE</Text>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>
              Join your community dengue surveillance network
            </Text>
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
            {/* Full Name */}
            <View style={styles.field}>
              <Text style={styles.label}>Full name</Text>
              <View
                style={[
                  styles.inputWrap,
                  focusedField === "fullName" && styles.inputWrapFocused,
                ]}
              >
                <User size={17} color={C.textDim} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Juan dela Cruz"
                  placeholderTextColor={C.textDim}
                  value={fullName}
                  onChangeText={(t) => {
                    setFullName(t);
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
              </View>
            </View>

            {/* Password */}
            <View style={styles.field}>
              <Text style={styles.label}>Password (min. 8 characters)</Text>
              <View
                style={[
                  styles.inputWrap,
                  focusedField === "password" && styles.inputWrapFocused,
                ]}
              >
                <Lock size={17} color={C.textDim} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Create a password"
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
                  textContentType="newPassword"
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

            {/* Confirm Password */}
            <View style={styles.field}>
              <Text style={styles.label}>Confirm password</Text>
              <View
                style={[
                  styles.inputWrap,
                  focusedField === "confirmPassword" && styles.inputWrapFocused,
                ]}
              >
                <Lock size={17} color={C.textDim} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter your password"
                  placeholderTextColor={C.textDim}
                  value={confirmPassword}
                  onChangeText={(t) => {
                    setConfirmPassword(t);
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
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                >
                  {showConfirmPassword ? (
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
                isProcessing && { opacity: 0.7 },
              ]}
              onPress={handleEmailSignUp}
              activeOpacity={0.85}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  Create Account
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
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.footerLink}>Sign in</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
      alignItems: "center",
      marginBottom: 26,
    },
    logo: {
      width: 80,
      height: 80,
      marginBottom: 12,
    },
    appTitle: {
      fontSize: 26,
      fontWeight: "800",
      letterSpacing: 2.5,
      color: C.text,
      textAlign: "center",
    },
    appSubtitle: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1.5,
      color: C.accent,
      textTransform: "uppercase",
      marginTop: 2,
      marginBottom: 14,
      textAlign: "center",
    },
    title: {
      fontSize: 19,
      fontWeight: "700",
      color: C.text,
      letterSpacing: -0.3,
      marginBottom: 4,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 13,
      color: C.textSub,
      lineHeight: 18,
      textAlign: "center",
      maxWidth: 280,
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
    label: {
      fontSize: 13,
      fontWeight: "500",
      color: C.text,
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
  });
