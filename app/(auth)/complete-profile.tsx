import { useAuth, useUser } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  MapPin,
  Phone,
  Shield,
  ShieldCheck,
  User as UserIcon,
  Users,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { ThemeColors, useTheme } from "../../context/ThemeContext";

const BARANGAYS = [
  { name: "San Juan", desc: "San Juan District • Zone 1-4" },
  { name: "Calumpang", desc: "Calumpang District • Zone 1-6" },
  { name: "South Fundidor", desc: "South Fundidor District • Zone 1-3" },
  { name: "San Rafael", desc: "San Rafael District • Mandurriao" },
  { name: "Jaro", desc: "Jaro Plaza & Heritage District • Zone 1-5" },
  { name: "Bolilao", desc: "Bolilao Commercial & Residential Area" },
  { name: "Lapaz", desc: "La Paz Market & Coastal District" },
] as const;

export default function CompleteProfileScreen() {
  const router = useRouter();
  const { colors: C, isDark } = useTheme();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const params = useLocalSearchParams<{
    role?: string;
    mode?: string;
    isEditing?: string;
  }>();

  const isEditing = params.mode === "edit" || params.isEditing === "true";
  const currentUser = useQuery(api.users.getMe);
  const updateProfile = useMutation(api.users.updateProfile);

  const isTanod =
    params.role === "tanod" || currentUser?.role === "tanod";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [barangay, setBarangay] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<Id<"teams"> | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize/prefill values
  useEffect(() => {
    if (currentUser) {
      if (currentUser.name) {
        const parts = currentUser.name.trim().split(" ");
        setFirstName((prev) => prev || parts[0] || user?.firstName || "");
        setLastName(
          (prev) => prev || parts.slice(1).join(" ") || user?.lastName || "",
        );
      } else if (user) {
        setFirstName((prev) => prev || user.firstName || "");
        setLastName((prev) => prev || user.lastName || "");
      }

      if (currentUser.phone) setPhone((prev) => prev || currentUser.phone || "");
      if (currentUser.barangay)
        setBarangay((prev) => prev || currentUser.barangay || null);
      if (currentUser.teamId)
        setTeamId((prev) => prev || (currentUser.teamId as any) || null);
    } else if (user) {
      setFirstName((prev) => prev || user.firstName || "");
      setLastName((prev) => prev || user.lastName || "");
    }
  }, [currentUser, user]);

  // Query teams AFTER barangay is set
  const teams = useQuery(
    api.users.getTeamsByBarangay,
    barangay ? { barangay } : "skip",
  );

  // Redirect if profile already complete AND not in edit mode
  useEffect(() => {
    if (
      isLoaded &&
      isSignedIn &&
      currentUser?.profileComplete &&
      !isEditing
    ) {
      const timer = setTimeout(() => {
        router.replace("/(root)");
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentUser, isLoaded, isSignedIn, isEditing, router]);

  // Pick avatar photo
  const handlePickAvatar = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please grant photo library access to change your profile picture.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setAvatarUri(asset.uri);

        if (user && asset.base64) {
          try {
            await user.setProfileImage({
              file: `data:image/jpeg;base64,${asset.base64}`,
            });
          } catch (clerkErr) {
            console.warn("Clerk avatar sync warning:", clerkErr);
          }
        }
      }
    } catch (err) {
      console.error("Avatar pick error:", err);
      Alert.alert("Error", "Could not pick image. Please try again.");
    }
  };

  const styles = useMemo(() => createStyles(C), [C]);

  if (!isLoaded || currentUser === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>INITIALIZING PROFILE...</Text>
      </View>
    );
  }

  const validate = () => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = "First name is required";
    if (!lastName.trim()) e.lastName = "Last name is required";
    if (!phone.trim()) e.phone = "Phone number is required";
    if (!barangay) e.barangay = "Please select your barangay";
    if (isTanod && !teamId) e.teamId = "Please select your assigned team";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        barangay: barangay!,
        role: isTanod ? "tanod" : "citizen",
        teamId: teamId ?? undefined,
      });

      // Also update Clerk user full name if available
      if (user) {
        try {
          await user.update({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
          });
        } catch (clerkErr) {
          console.warn("Clerk name sync skipped:", clerkErr);
        }
      }

      if (isEditing) {
        Alert.alert(
          "Profile Updated",
          "Your profile information and location have been successfully updated.",
          [
            {
              text: "Done",
              onPress: () => router.back(),
            },
          ],
        );
      } else {
        setTimeout(() => {
          router.replace("/(root)");
        }, 300);
      }
    } catch (err) {
      console.error("Profile save error:", err);
      Alert.alert("Save Failed", "Could not update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const currentDisplayAvatar =
    avatarUri ||
    user?.imageUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      `${firstName} ${lastName}`.trim() || "User",
    )}&background=1a2240&color=4F8EF7&bold=true&size=120`;

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
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── TOP HEADER / NAV BAR ── */}
          {isEditing ? (
            <View style={styles.editNavHeader}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backBtn}
                activeOpacity={0.7}
              >
                <ArrowLeft color={C.text} size={18} strokeWidth={2.5} />
              </TouchableOpacity>
              <Text style={styles.editNavTitle}>Edit profile</Text>
              <View style={{ width: 38 }} />
            </View>
          ) : (
            <View style={styles.topHeader}>
              <Image
                source={require("../../assets/logo/aedex.png")}
                style={styles.logoImg}
                resizeMode="contain"
              />
              <View style={styles.progressContainer}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: "66%" }]} />
                </View>
                <Text style={styles.progressText}>
                  STEP 2 OF 3 •{" "}
                  {isTanod ? "TANOD VERIFICATION" : "COMMUNITY PROFILE"}
                </Text>
              </View>
            </View>
          )}

          {/* ── AVATAR PROFILE PHOTO PICKER ── */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: currentDisplayAvatar }}
                style={styles.avatarImage}
              />
              <TouchableOpacity
                style={styles.avatarCameraBtn}
                onPress={handlePickAvatar}
                activeOpacity={0.8}
              >
                <Camera color="#FFFFFF" size={14} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.7}>
              <Text style={styles.changePhotoText}>Change Profile Photo</Text>
            </TouchableOpacity>
          </View>

          {/* ── SCREEN TITLE ── */}
          <View style={styles.header}>
            <View
              style={[
                styles.badge,
                isTanod ? styles.badgeTanod : styles.badgeCitizen,
              ]}
            >
              {isTanod ? (
                <Shield color={C.warn} size={12} strokeWidth={2.5} />
              ) : (
                <MapPin color={C.accent} size={12} strokeWidth={2.5} />
              )}
              <Text
                style={[
                  styles.badgeText,
                  { color: isTanod ? C.warn : C.accent },
                ]}
              >
                {isTanod ? "FIELD OFFICER DEPLOYMENT" : "CITIZEN PROFILE"}
              </Text>
            </View>

            <Text style={styles.title}>
              {isEditing
                ? "Update Your\nProfile Details"
                : isTanod
                  ? "Complete Tanod\nRegistration"
                  : "Setup Your\nProfile"}
            </Text>
            <Text style={styles.sub}>
              {isEditing
                ? "Modify your name, mobile contact, and surveillance barangay."
                : isTanod
                  ? "Enter your personal information and assign your barangay response team."
                  : "Enter your contact information to receive vector surveillance alerts in your area."}
            </Text>
          </View>

          {/* ── FORM FIELDS ── */}
          <View style={styles.form}>
            {/* First Name & Last Name Row */}
            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>First name</Text>
                <View
                  style={[
                    styles.inputWrap,
                    errors.firstName ? styles.inputWrapError : null,
                  ]}
                >
                  <UserIcon color={C.textSub} size={16} strokeWidth={2} />
                  <TextInput
                    style={styles.input}
                    placeholder="Juan"
                    placeholderTextColor={C.textDim}
                    value={firstName}
                    onChangeText={(t) => {
                      setFirstName(t);
                      if (errors.firstName)
                        setErrors((p) => ({ ...p, firstName: "" }));
                    }}
                    autoCapitalize="words"
                  />
                </View>
                {errors.firstName && (
                  <Text style={styles.errorText}>{errors.firstName}</Text>
                )}
              </View>

              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Last name</Text>
                <View
                  style={[
                    styles.inputWrap,
                    errors.lastName ? styles.inputWrapError : null,
                  ]}
                >
                  <UserIcon color={C.textSub} size={16} strokeWidth={2} />
                  <TextInput
                    style={styles.input}
                    placeholder="Dela Cruz"
                    placeholderTextColor={C.textDim}
                    value={lastName}
                    onChangeText={(t) => {
                      setLastName(t);
                      if (errors.lastName)
                        setErrors((p) => ({ ...p, lastName: "" }));
                    }}
                    autoCapitalize="words"
                  />
                </View>
                {errors.lastName && (
                  <Text style={styles.errorText}>{errors.lastName}</Text>
                )}
              </View>
            </View>

            {/* Phone Number */}
            <View style={styles.field}>
              <Text style={styles.label}>Mobile phone number</Text>
              <View
                style={[
                  styles.inputWrap,
                  errors.phone ? styles.inputWrapError : null,
                ]}
              >
                <Phone color={C.textSub} size={16} strokeWidth={2} />
                <TextInput
                  style={styles.input}
                  placeholder="0912 345 6789"
                  placeholderTextColor={C.textDim}
                  value={phone}
                  onChangeText={(t) => {
                    setPhone(t);
                    if (errors.phone) setErrors((p) => ({ ...p, phone: "" }));
                  }}
                  keyboardType="phone-pad"
                  maxLength={11}
                />
              </View>
              {errors.phone && (
                <Text style={styles.errorText}>{errors.phone}</Text>
              )}
            </View>

            {/* Barangay Picker */}
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Select barangay</Text>
                <Text style={styles.fieldHint}>Surveillance Zone</Text>
              </View>

              <View style={styles.optionGrid}>
                {BARANGAYS.map((b) => {
                  const selected = barangay === b.name;
                  return (
                    <TouchableOpacity
                      key={b.name}
                      style={[
                        styles.optionCard,
                        selected && styles.optionCardSelected,
                      ]}
                      onPress={() => {
                        setBarangay(b.name);
                        if (errors.barangay)
                          setErrors((p) => ({ ...p, barangay: "" }));
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.optionLeft}>
                        <View
                          style={[
                            styles.checkbox,
                            selected && styles.checkboxSelected,
                          ]}
                        >
                          {selected && (
                            <CheckCircle2
                              color={C.accent}
                              size={14}
                              strokeWidth={3}
                            />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.optionTitle,
                              selected && styles.optionTitleSelected,
                            ]}
                          >
                            Barangay {b.name}
                          </Text>
                          <Text style={styles.optionDesc}>{b.desc}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {errors.barangay && (
                <Text style={styles.errorText}>{errors.barangay}</Text>
              )}
            </View>

            {/* Tanod Team Selection */}
            {isTanod && barangay && (
              <View style={styles.field}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Assigned response team</Text>
                  <Text style={styles.fieldHint}>Teams in {barangay}</Text>
                </View>

                {teams === undefined ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="small" color={C.warn} />
                    <Text style={styles.loadingBoxText}>
                      Fetching teams for {barangay}...
                    </Text>
                  </View>
                ) : teams.length === 0 ? (
                  <View style={styles.emptyTeams}>
                    <Shield color={C.warn} size={22} strokeWidth={2} />
                    <Text style={styles.emptyTeamsTitle}>
                      No Active Teams Found
                    </Text>
                    <Text style={styles.emptyTeamsSub}>
                      No Tanod response units pre-configured for {barangay}.
                      Contact system administrator.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.optionGrid}>
                    {teams.map((team: any) => {
                      const selected = teamId === team._id;
                      return (
                        <TouchableOpacity
                          key={team._id}
                          style={[
                            styles.optionCard,
                            selected && styles.optionCardTanodSelected,
                          ]}
                          onPress={() => {
                            setTeamId(team._id);
                            if (errors.teamId)
                              setErrors((p) => ({ ...p, teamId: "" }));
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.optionLeft}>
                            <View
                              style={[
                                styles.checkbox,
                                selected && styles.checkboxTanodSelected,
                              ]}
                            >
                              {selected && (
                                <ShieldCheck
                                  color={C.warn}
                                  size={14}
                                  strokeWidth={3}
                                />
                              )}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[
                                  styles.optionTitle,
                                  selected && { color: C.warn },
                                ]}
                              >
                                {team.name}
                              </Text>
                              <Text style={styles.optionDesc}>
                                {team.memberNames?.length ?? 0} Active Members
                                {team.leaderId ? " • Leader Assigned" : ""}
                              </Text>
                            </View>
                          </View>
                          <Users
                            color={selected ? C.warn : C.textDim}
                            size={16}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
                {errors.teamId && (
                  <Text style={styles.errorText}>{errors.teamId}</Text>
                )}
              </View>
            )}
          </View>

          {/* ── SAVE / UPDATE BUTTON ── */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color={C.bg} size="small" />
            ) : (
              <View style={styles.saveBtnContent}>
                <Text style={styles.saveBtnText}>
                  {isEditing
                    ? "SAVE PROFILE CHANGES"
                    : isTanod
                      ? "FINALIZE REGISTRATION"
                      : "CONFIRM PROFILE"}
                </Text>
                <ArrowRight color={C.bg} size={16} strokeWidth={3} />
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.footerNote}>
            AEDEX Vector Control System • Protected Profile
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (C: ThemeColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: C.bg,
    },
    loadingContainer: {
      flex: 1,
      backgroundColor: C.bg,
      justifyContent: "center",
      alignItems: "center",
      gap: 12,
    },
    loadingText: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.3,
      color: C.textSub,
    },
    scroll: {
      paddingHorizontal: 24,
      paddingTop: Platform.OS === "ios" ? 10 : 20,
      paddingBottom: 40,
    },

    // Edit Header Nav
    editNavHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 11,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: "center",
      justifyContent: "center",
    },
    editNavTitle: {
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.3,
      color: C.text,
    },

    // Top Header Logo & Progress
    topHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 24,
    },
    logoImg: {
      width: 90,
      height: 32,
    },
    progressContainer: {
      alignItems: "flex-end",
      gap: 4,
    },
    progressTrack: {
      width: 100,
      height: 4,
      borderRadius: 2,
      backgroundColor: C.surfaceRaised,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: C.accent,
      borderRadius: 2,
    },
    progressText: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.3,
      color: C.textSub,
    },

    // Avatar Section
    avatarSection: {
      alignItems: "center",
      marginBottom: 20,
      gap: 8,
    },
    avatarContainer: {
      position: "relative",
      width: 84,
      height: 84,
    },
    avatarImage: {
      width: 84,
      height: 84,
      borderRadius: 26,
      borderWidth: 2,
      borderColor: C.accent,
      backgroundColor: C.surfaceRaised,
    },
    avatarCameraBtn: {
      position: "absolute",
      bottom: -4,
      right: -4,
      width: 28,
      height: 28,
      borderRadius: 10,
      backgroundColor: C.accent,
      borderWidth: 2,
      borderColor: C.bg,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 4,
    },
    changePhotoText: {
      fontSize: 11,
      fontWeight: "700",
      color: C.accent,
    },

    // Screen Header
    header: {
      marginBottom: 24,
      gap: 8,
    },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      alignSelf: "flex-start",
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 6,
      borderWidth: 1,
    },
    badgeCitizen: {
      backgroundColor: C.accentGlow,
      borderColor: C.accent + "40",
    },
    badgeTanod: {
      backgroundColor: C.warnGlow,
      borderColor: C.warn + "40",
    },
    badgeText: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.3,
    },
    title: {
      fontSize: 26,
      fontWeight: "700",
      letterSpacing: -0.5,
      color: C.text,
      lineHeight: 32,
    },
    sub: {
      fontSize: 13,
      color: C.textSub,
      lineHeight: 19,
    },

    // Form
    form: {
      gap: 16,
      marginBottom: 28,
    },
    row: {
      flexDirection: "row",
      gap: 12,
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
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.3,
      color: C.textSub,
    },
    fieldHint: {
      fontSize: 11,
      color: C.textDim,
      fontWeight: "500",
    },
    inputWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      height: 48,
    },
    inputWrapError: {
      borderColor: C.danger,
    },
    input: {
      flex: 1,
      fontSize: 14,
      color: C.text,
      fontWeight: "500",
    },
    errorText: {
      fontSize: 11,
      color: C.danger,
      fontWeight: "600",
      marginTop: 2,
    },

    // Option Grid
    optionGrid: {
      gap: 8,
    },
    optionCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 12,
      padding: 12,
    },
    optionCardSelected: {
      borderColor: C.accent,
      backgroundColor: C.accentGlow,
    },
    optionCardTanodSelected: {
      borderColor: C.warn,
      backgroundColor: C.warnGlow,
    },
    optionLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flex: 1,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: C.borderBright,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxSelected: {
      borderColor: C.accent,
      backgroundColor: C.surface,
    },
    checkboxTanodSelected: {
      borderColor: C.warn,
      backgroundColor: C.surface,
    },
    optionTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: C.text,
    },
    optionTitleSelected: {
      color: C.accent,
    },
    optionDesc: {
      fontSize: 11,
      color: C.textSub,
      marginTop: 1,
    },

    // Loading & Empty States for Teams
    loadingBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: C.surface,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: C.border,
    },
    loadingBoxText: {
      fontSize: 11,
      color: C.textSub,
      fontWeight: "600",
    },
    emptyTeams: {
      alignItems: "center",
      backgroundColor: C.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: C.border,
      gap: 4,
    },
    emptyTeamsTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: C.warn,
      marginTop: 4,
    },
    emptyTeamsSub: {
      fontSize: 11,
      color: C.textSub,
      textAlign: "center",
    },

    // Save Button
    saveBtn: {
      backgroundColor: C.accent,
      borderRadius: 14,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 6,
      marginBottom: 16,
    },
    saveBtnDisabled: {
      opacity: 0.6,
    },
    saveBtnContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    saveBtnText: {
      fontSize: 13,
      fontWeight: "700",
      letterSpacing: 0.3,
      color: C.bg,
    },
    footerNote: {
      fontSize: 11,
      color: C.textDim,
      textAlign: "center",
      letterSpacing: 0.3,
    },
  });
