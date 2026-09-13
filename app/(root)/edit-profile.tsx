import { useAuth, useUser } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  MapPin,
  Phone,
  Save,
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

export default function EditProfileScreen() {
  const router = useRouter();
  const { colors: C, isDark } = useTheme();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const currentUser = useQuery(api.users.getMe);
  const updateProfile = useMutation(api.users.updateProfile);

  const isTanod = currentUser?.role === "tanod";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [barangay, setBarangay] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<Id<"teams"> | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Prefill existing user info
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

  // Query teams for the selected barangay
  const teams = useQuery(
    api.users.getTeamsByBarangay,
    barangay ? { barangay } : "skip",
  );

  // Pick and update avatar photo
  const handlePickAvatar = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please grant camera roll access to update your profile photo.",
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
          setUploadingImage(true);
          try {
            await user.setProfileImage({
              file: `data:image/jpeg;base64,${asset.base64}`,
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (clerkErr) {
            console.warn("Clerk avatar sync warning:", clerkErr);
          } finally {
            setUploadingImage(false);
          }
        }
      }
    } catch (err) {
      console.error("Avatar pick error:", err);
      Alert.alert("Error", "Could not select image. Please try again.");
    }
  };

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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        barangay: barangay!,
        role: isTanod ? "tanod" : "citizen",
        teamId: teamId ?? undefined,
      });

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

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Profile Updated",
        "Your profile information and surveillance location have been successfully saved.",
        [
          {
            text: "Done",
            onPress: () => router.back(),
          },
        ],
      );
    } catch (err) {
      console.error("Profile save error:", err);
      Alert.alert("Save Failed", "Could not update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const styles = useMemo(() => createStyles(C), [C]);

  const displayAvatar =
    avatarUri ||
    user?.imageUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      `${firstName} ${lastName}`.trim() || "User",
    )}&background=1a2240&color=4F8EF7&bold=true&size=140`;

  if (!isLoaded || currentUser === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>LOADING PROFILE...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={C.surface}
      />

      {/* ── TOP NAV BAR ── */}
      <View style={styles.topNav}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft color={C.text} size={18} strokeWidth={2.5} />
        </TouchableOpacity>

        <Text style={styles.navTitle}>EDIT PROFILE</Text>

        <TouchableOpacity
          onPress={handleSave}
          style={styles.saveNavBtn}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color={C.accent} />
          ) : (
            <Save color={C.accent} size={18} strokeWidth={2.5} />
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── AVATAR PROFILE PHOTO PICKER ── */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrap}>
              <Image source={{ uri: displayAvatar }} style={styles.avatarImg} />
              <TouchableOpacity
                style={styles.cameraBadge}
                onPress={handlePickAvatar}
                activeOpacity={0.8}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Camera color="#FFFFFF" size={15} strokeWidth={2.5} />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.7}>
              <Text style={styles.changePhotoText}>Change Profile Photo</Text>
            </TouchableOpacity>

            <View
              style={[
                styles.roleBadge,
                {
                  backgroundColor: isTanod ? C.warnGlow : C.safeGlow,
                  borderColor: (isTanod ? C.warn : C.safe) + "40",
                },
              ]}
            >
              {isTanod ? (
                <Shield color={C.warn} size={11} strokeWidth={2.5} />
              ) : (
                <CheckCircle2 color={C.safe} size={11} strokeWidth={2.5} />
              )}
              <Text
                style={[
                  styles.roleBadgeText,
                  { color: isTanod ? C.warn : C.safe },
                ]}
              >
                {isTanod ? "TANOD FIELD OFFICER" : "REGISTERED CITIZEN"}
              </Text>
            </View>
          </View>

          {/* ── FORM FIELDS ── */}
          <View style={styles.formSection}>
            <Text style={styles.sectionHeaderTitle}>PERSONAL DETAILS</Text>

            {/* First & Last Name */}
            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>FIRST NAME</Text>
                <View
                  style={[
                    styles.inputContainer,
                    errors.firstName ? styles.inputContainerError : null,
                  ]}
                >
                  <UserIcon color={C.textSub} size={16} strokeWidth={2} />
                  <TextInput
                    style={styles.input}
                    placeholder="First Name"
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
                <Text style={styles.fieldLabel}>LAST NAME</Text>
                <View
                  style={[
                    styles.inputContainer,
                    errors.lastName ? styles.inputContainerError : null,
                  ]}
                >
                  <UserIcon color={C.textSub} size={16} strokeWidth={2} />
                  <TextInput
                    style={styles.input}
                    placeholder="Last Name"
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

            {/* Mobile Phone */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>MOBILE PHONE NUMBER</Text>
              <View
                style={[
                  styles.inputContainer,
                  errors.phone ? styles.inputContainerError : null,
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
          </View>

          {/* ── BARANGAY LOCATION ── */}
          <View style={styles.formSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>SURVEILLANCE BARANGAY</Text>
              <Text style={styles.sectionHeaderSub}>Zone Assignment</Text>
            </View>

            <View style={styles.barangayGrid}>
              {BARANGAYS.map((b) => {
                const selected = barangay === b.name;
                return (
                  <TouchableOpacity
                    key={b.name}
                    style={[
                      styles.barangayCard,
                      selected && styles.barangayCardSelected,
                    ]}
                    onPress={() => {
                      setBarangay(b.name);
                      if (errors.barangay)
                        setErrors((p) => ({ ...p, barangay: "" }));
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.barangayCardLeft}>
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
                            styles.barangayName,
                            selected && styles.barangayNameSelected,
                          ]}
                        >
                          Barangay {b.name}
                        </Text>
                        <Text style={styles.barangayDesc}>{b.desc}</Text>
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

          {/* ── TANOD TEAM SELECTION (IF OFFICER) ── */}
          {isTanod && barangay && (
            <View style={styles.formSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderTitle}>ASSIGNED TEAM</Text>
                <Text style={styles.sectionHeaderSub}>In {barangay}</Text>
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
                  <Shield color={C.warn} size={20} strokeWidth={2} />
                  <Text style={styles.emptyTeamsTitle}>No Active Teams</Text>
                  <Text style={styles.emptyTeamsSub}>
                    No Tanod units found for Barangay {barangay}.
                  </Text>
                </View>
              ) : (
                <View style={styles.barangayGrid}>
                  {teams.map((team: any) => {
                    const selected = teamId === team._id;
                    return (
                      <TouchableOpacity
                        key={team._id}
                        style={[
                          styles.barangayCard,
                          selected && styles.barangayCardTanodSelected,
                        ]}
                        onPress={() => {
                          setTeamId(team._id);
                          if (errors.teamId)
                            setErrors((p) => ({ ...p, teamId: "" }));
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.barangayCardLeft}>
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
                                styles.barangayName,
                                selected && { color: C.warn },
                              ]}
                            >
                              {team.name}
                            </Text>
                            <Text style={styles.barangayDesc}>
                              {team.memberNames?.length ?? 0} Members
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

          {/* ── SAVE BUTTON ── */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={styles.saveBtnContent}>
                <Save color="#FFFFFF" size={16} strokeWidth={2.5} />
                <Text style={styles.saveBtnText}>SAVE PROFILE CHANGES</Text>
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
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 2,
      color: C.textSub,
    },

    // Nav Bar
    topNav: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: Platform.OS === "ios" ? 10 : 20,
      paddingBottom: 14,
      backgroundColor: C.surface,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 11,
      backgroundColor: C.surfaceRaised,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: "center",
      justifyContent: "center",
    },
    navTitle: {
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 2,
      color: C.text,
    },
    saveNavBtn: {
      width: 38,
      height: 38,
      borderRadius: 11,
      backgroundColor: C.accentGlow,
      borderWidth: 1,
      borderColor: C.accent + "30",
      alignItems: "center",
      justifyContent: "center",
    },

    scroll: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 40,
    },

    // Avatar Section
    avatarSection: {
      alignItems: "center",
      marginBottom: 24,
      gap: 8,
    },
    avatarWrap: {
      position: "relative",
      width: 90,
      height: 90,
    },
    avatarImg: {
      width: 90,
      height: 90,
      borderRadius: 28,
      borderWidth: 2,
      borderColor: C.accent,
      backgroundColor: C.surfaceRaised,
    },
    cameraBadge: {
      position: "absolute",
      bottom: -4,
      right: -4,
      width: 30,
      height: 30,
      borderRadius: 10,
      backgroundColor: C.accent,
      borderWidth: 2,
      borderColor: C.bg,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    changePhotoText: {
      fontSize: 12,
      fontWeight: "700",
      color: C.accent,
    },
    roleBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      marginTop: 2,
    },
    roleBadgeText: {
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 0.8,
    },

    // Form Sections
    formSection: {
      backgroundColor: C.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: C.border,
      padding: 16,
      marginBottom: 16,
      gap: 14,
    },
    sectionHeaderTitle: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.2,
      color: C.textSub,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    sectionHeaderSub: {
      fontSize: 10,
      fontWeight: "600",
      color: C.textDim,
    },
    row: {
      flexDirection: "row",
      gap: 12,
    },
    field: {
      gap: 6,
    },
    fieldLabel: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.8,
      color: C.textSub,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: C.surfaceRaised,
      borderWidth: 1,
      borderColor: C.borderBright,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 46,
    },
    inputContainerError: {
      borderColor: C.danger,
    },
    input: {
      flex: 1,
      fontSize: 13,
      color: C.text,
      fontWeight: "600",
    },
    errorText: {
      fontSize: 11,
      color: C.danger,
      fontWeight: "600",
      marginTop: 2,
    },

    // Barangay Grid
    barangayGrid: {
      gap: 8,
    },
    barangayCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: C.surfaceRaised,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 12,
      padding: 12,
    },
    barangayCardSelected: {
      borderColor: C.accent,
      backgroundColor: C.accentGlow,
    },
    barangayCardTanodSelected: {
      borderColor: C.warn,
      backgroundColor: C.warnGlow,
    },
    barangayCardLeft: {
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
    barangayName: {
      fontSize: 13,
      fontWeight: "700",
      color: C.text,
    },
    barangayNameSelected: {
      color: C.accent,
    },
    barangayDesc: {
      fontSize: 10,
      color: C.textSub,
      marginTop: 1,
    },

    // Loading & Empty for Teams
    loadingBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: C.surfaceRaised,
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
      backgroundColor: C.surfaceRaised,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: C.border,
      gap: 4,
    },
    emptyTeamsTitle: {
      fontSize: 12,
      fontWeight: "800",
      color: C.warn,
      marginTop: 4,
    },
    emptyTeamsSub: {
      fontSize: 10,
      color: C.textSub,
      textAlign: "center",
    },

    // Save Button
    saveBtn: {
      backgroundColor: C.accent,
      borderRadius: 14,
      height: 50,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: C.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 6,
      marginTop: 8,
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
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1.5,
      color: "#FFFFFF",
    },
    footerNote: {
      fontSize: 10,
      color: C.textDim,
      textAlign: "center",
      letterSpacing: 0.5,
    },
  });
