import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Alert, Share } from "react-native";

export interface ShareReportOptions {
  reportId: string;
  locationName?: string;
  barangay?: string;
  status: string;
  userName?: string;
  creationTime?: number;
  imageUri?: string;
  accuracy?: string;
  reasoning?: string;
  verified?: boolean;
  lat?: number;
  lng?: number;
  description?: string;
}

/**
 * Builds the complete structured tactical surveillance text report
 * emphasizing human-readable Barangay and Location.
 */
export function buildReportAlertText(options: ShareReportOptions): string {
  const {
    reportId,
    locationName = "",
    barangay = "",
    status,
    userName = "Community Citizen",
    creationTime = Date.now(),
    accuracy,
    reasoning,
    verified,
    description,
  } = options;

  const dateStr = new Date(creationTime).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const isCritical =
    status?.toUpperCase() === "CRITICAL" ||
    status?.toUpperCase() === "HIGH RISK";

  const alertHeadline = isCritical
    ? "🚨 [AEDEX ALERT] CRITICAL MOSQUITO BREEDING SITE DETECTED"
    : "⚠️ [AEDEX NOTICE] MOSQUITO VECTOR SURVEILLANCE REPORT";

  // Clean and prioritize human-readable Barangay and Location
  const cleanBarangay = barangay.trim();
  const hasBarangay =
    cleanBarangay.length > 0 && cleanBarangay.toLowerCase() !== "all";

  const rawLoc = locationName.trim();
  const isRawCoords = rawLoc && /^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(rawLoc);

  let formattedLocation = "";
  if (
    hasBarangay &&
    rawLoc &&
    !isRawCoords &&
    rawLoc !== "Unknown" &&
    !rawLoc.toLowerCase().includes(cleanBarangay.toLowerCase())
  ) {
    formattedLocation = `Brgy. ${cleanBarangay.replace(/^(Barangay|Brgy\.?)\s*/i, "")}, ${rawLoc}`;
  } else if (hasBarangay && (!rawLoc || isRawCoords || rawLoc === "Unknown")) {
    formattedLocation = `Barangay ${cleanBarangay.replace(/^(Barangay|Brgy\.?)\s*/i, "")}, Iloilo City`;
  } else if (rawLoc && !isRawCoords && rawLoc !== "Unknown") {
    formattedLocation = rawLoc;
  } else if (hasBarangay) {
    formattedLocation = `Barangay ${cleanBarangay}`;
  } else {
    formattedLocation = "Iloilo City Community Area";
  }

  const barangayDisplay = hasBarangay
    ? cleanBarangay.startsWith("Barangay") || cleanBarangay.startsWith("Brgy")
      ? cleanBarangay
      : `Barangay ${cleanBarangay}`
    : null;

  const verificationBadge = verified
    ? "✅ Verified by Health Unit / Tanod"
    : "⏳ Community Submitted (Pending Field Action)";

  const accuracyText = accuracy
    ? `🎯 AI Detection Confidence: ${accuracy}`
    : "🎯 AI Diagnostics: YOLOv8 + Gemini 2.0 Vision";

  const findingsText =
    reasoning || description
      ? `🔬 AI Diagnostics:\n"${reasoning || description}"`
      : "🔬 AI Diagnostics: Stagnant water and potential mosquito vector habitat identified.";

  return [
    alertHeadline,
    "═══════════════════════════════",
    barangayDisplay ? `🏘️ Barangay: ${barangayDisplay}` : null,
    `📍 Location: ${formattedLocation}`,
    `⚠️ Threat Level: ${status?.toUpperCase() || "ACTIVE RISK"}`,
    `🛡️ Status: ${verificationBadge}`,
    accuracyText,
    `👤 Reported By: ${userName}`,
    `🕒 Timestamp: ${dateStr}`,
    "───────────────────────────────",
    findingsText,
    "───────────────────────────────",
    "🛡️ RECOMMENDED COMMUNITY ACTION:",
    "• Drain and scrub open water buckets, tires, and plant saucers.",
    "• Keep domestic water storage containers tightly covered.",
    "• Report large stagnant water bodies to Barangay Tanods for larvicide treatment.",
    "═══════════════════════════════",
    `📋 Incident Report Reference: #${reportId.slice(-6).toUpperCase()}`,
    "#AEDEX #VectorSurveillance #DenguePrevention #CommunityHealth",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Shares the complete structured text report to WhatsApp, Messenger, SMS, Viber, etc.
 */
export async function shareReportText(options: ShareReportOptions) {
  const message = buildReportAlertText(options);
  const locationTitle =
    options.barangay || options.locationName || "Iloilo City";
  try {
    await Share.share({
      title: `AEDEX Surveillance Alert - ${locationTitle}`,
      message,
    });
  } catch (error) {
    console.error("Error sharing report text:", error);
    Alert.alert(
      "Sharing Failed",
      "Could not open the share sheet. Please try again.",
    );
  }
}

/**
 * Shares the field photo snapshot to Instagram, Stories, Media chats via expo-sharing.
 */
export async function shareReportImage(options: ShareReportOptions) {
  const { reportId, locationName, barangay, imageUri } = options;
  const locationTitle = barangay || locationName || "Community Report";

  if (!imageUri) {
    // If no image, fallback to text share
    return shareReportText(options);
  }

  try {
    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (!isSharingAvailable) {
      return shareReportText(options);
    }

    let localFilePath = "";

    if (imageUri.startsWith("data:") || !imageUri.startsWith("http")) {
      const cleanBase64 = imageUri.replace(/^data:image\/\w+;base64,/, "");
      localFilePath = `${FileSystem.cacheDirectory}aedex-alert-${reportId.slice(-8)}.jpg`;

      await FileSystem.writeAsStringAsync(localFilePath, cleanBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } else if (imageUri.startsWith("http")) {
      localFilePath = `${FileSystem.cacheDirectory}aedex-alert-${reportId.slice(-8)}.jpg`;
      const downloadResult = await FileSystem.downloadAsync(
        imageUri,
        localFilePath,
      );
      localFilePath = downloadResult.uri;
    } else {
      localFilePath = imageUri;
    }

    await Sharing.shareAsync(localFilePath, {
      mimeType: "image/jpeg",
      dialogTitle: `AEDEX Photo Evidence - ${locationTitle}`,
      UTI: "public.jpeg",
    });
  } catch (error) {
    console.error("Error sharing report image:", error);
    // Fallback to text
    shareReportText(options);
  }
}

/**
 * Main dispatcher: Shares full detailed text or image based on preference.
 */
export async function shareCommunityReport(options: ShareReportOptions) {
  return shareReportText(options);
}
