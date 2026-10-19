import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import Constants from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import * as Updates from "expo-updates";

const REPO = "xelpaxu/aedex";

/**
 * Served straight from the GitHub CDN. Unlike api.github.com this is not subject to
 * the 60 requests/hour unauthenticated rate limit, which matters because every
 * device polls it and mobile carriers put many users behind one NAT address.
 */
const CDN_MANIFEST_URL = `https://github.com/${REPO}/releases/latest/download/update.json`;
const API_LATEST_URL = `https://api.github.com/repos/${REPO}/releases/latest`;

const MANIFEST_TIMEOUT_MS = 15000;
const RESUME_STORAGE_KEY = "aedex.update.resumable";
const APK_DIR = "updates/";
const APK_MIME = "application/vnd.android.package-archive";

/** Intent.FLAG_GRANT_READ_URI_PERMISSION. expo-intent-launcher takes raw int flags. */
const FLAG_GRANT_READ_URI_PERMISSION = 0x00000001;

export interface ReleaseManifest {
  /** Human readable version, e.g. "1.0.4". */
  version: string;
  /** Android versionCode of the published APK. Compared against the running build. */
  buildNumber: number;
  /** Builds below this are blocked from using the app. */
  minSupportedBuildNumber: number;
  /** Whether the update screen can be dismissed. */
  mandatory: boolean;
  notes: string | null;
  publishedAt: string;
  downloadUrl: string;
  sizeBytes: number;
}

export type UpdateKind = "none" | "ota" | "apk";

export interface UpdateCheckResult {
  kind: UpdateKind;
  manifest: ReleaseManifest | null;
  /** expo-updates manifest id, when kind === "ota". */
  otaId: string | null;
}

export interface DownloadProgress {
  receivedBytes: number;
  totalBytes: number;
  fraction: number;
}

// ---------------------------------------------------------------------------
// Current build identity
// ---------------------------------------------------------------------------

/**
 * The versionCode of the APK that is actually installed on the device. This is the
 * only trustworthy source: eas.json uses appVersionSource "remote", so the repo
 * copy of app.json / build.gradle does not necessarily reflect what shipped.
 */
export function getCurrentBuildNumber(): number {
  const native = Number.parseInt(Application.nativeBuildVersion ?? "", 10);
  if (Number.isInteger(native) && native > 0) return native;

  const configured = Number.parseInt(
    String(Constants.expoConfig?.android?.versionCode ?? ""),
    10,
  );
  return Number.isInteger(configured) && configured > 0 ? configured : 0;
}

export function getCurrentVersionName(): string {
  return (
    Application.nativeApplicationVersion ||
    Constants.expoConfig?.version ||
    "1.0.0"
  );
}

export function getInstalledPackageId(): string {
  return (
    Application.applicationId ||
    Constants.expoConfig?.android?.package ||
    "com.xelpaxu.aedex"
  );
}

// ---------------------------------------------------------------------------
// Release manifest
// ---------------------------------------------------------------------------

function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MANIFEST_TIMEOUT_MS);
  return fetch(url, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}

/**
 * Derives a manifest from a GitHub release payload. Handles the `v<version>-<build>`
 * tag format produced by the release workflow; returns null for anything else,
 * because a tag we cannot read a build number out of is not safe to act on.
 */
function manifestFromRelease(data: any): ReleaseManifest | null {
  const tagName: string = data?.tag_name || "";
  const tagMatch = /^v?(\d+\.\d+\.\d+)-(\d+)$/.exec(tagName);
  if (!tagMatch) return null;

  const [, version, buildNumber] = tagMatch;
  const apk = (data.assets || []).find((a: any) =>
    a?.name?.toLowerCase().endsWith(".apk"),
  );
  if (!apk?.browser_download_url) return null;

  return {
    version,
    buildNumber: Number(buildNumber),
    minSupportedBuildNumber: Number(buildNumber),
    mandatory: true,
    notes: data.body || null,
    publishedAt: data.published_at || new Date().toISOString(),
    downloadUrl: apk.browser_download_url,
    sizeBytes: Number(apk.size) || 0,
  };
}

function normalizeManifest(raw: any): ReleaseManifest | null {
  // Number(null) is 0 and Number("") is 0, so a missing buildNumber would sail
  // through a plain isFinite check and masquerade as a real release. Require a
  // positive integer instead: without one there is nothing to compare against and
  // the update must be ignored rather than guessed at.
  const buildNumber = Number(raw?.buildNumber);
  const downloadUrl: string = raw?.downloadUrl || "";
  if (!Number.isInteger(buildNumber) || buildNumber <= 0 || !downloadUrl) return null;

  const minSupported = Number(raw?.minSupportedBuildNumber);
  const sizeBytes = Number(raw?.sizeBytes);
  return {
    version: String(raw?.version || "1.0.0"),
    buildNumber,
    minSupportedBuildNumber: Number.isInteger(minSupported) && minSupported > 0
      ? minSupported
      : buildNumber,
    mandatory: raw?.mandatory !== false,
    notes: raw?.notes ? String(raw.notes) : null,
    publishedAt: String(raw?.publishedAt || new Date().toISOString()),
    downloadUrl,
    sizeBytes: Number.isInteger(sizeBytes) && sizeBytes > 0 ? sizeBytes : 0,
  };
}

export async function fetchReleaseManifest(): Promise<ReleaseManifest | null> {
  try {
    const res = await fetchWithTimeout(CDN_MANIFEST_URL, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const normalized = normalizeManifest(await res.json());
      if (normalized) return normalized;
    }
  } catch {
    // fall through to the API
  }

  try {
    const res = await fetchWithTimeout(API_LATEST_URL, {
      headers: { Accept: "application/vnd.github.v3+json" },
    });
    if (!res.ok) return null;
    return manifestFromRelease(await res.json());
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Update check
// ---------------------------------------------------------------------------

export async function checkForOtaUpdate(): Promise<string | null> {
  if (__DEV__ || !Updates.isEnabled) return null;
  try {
    const result = await Updates.checkForUpdateAsync();
    return result.isAvailable ? result.manifest.id : null;
  } catch (err) {
    console.warn("[update] OTA check failed:", err);
    return null;
  }
}

export async function fetchOtaUpdate(): Promise<boolean> {
  const result = await Updates.fetchUpdateAsync();
  return result.isNew;
}

export async function reloadToApplyOtaUpdate(): Promise<void> {
  await Updates.reloadAsync();
}

/**
 * Resolves which kind of update, if any, is pending. OTA wins over APK: a JavaScript
 * only update never needs an install, so making the user reinstall for it would be
 * strictly worse.
 */
export async function checkForUpdate(): Promise<UpdateCheckResult> {
  const otaId = await checkForOtaUpdate();
  if (otaId) return { kind: "ota", manifest: null, otaId };

  const manifest = await fetchReleaseManifest();
  if (manifest && manifest.buildNumber > getCurrentBuildNumber()) {
    return { kind: "apk", manifest, otaId: null };
  }

  return { kind: "none", manifest: null, otaId: null };
}

// ---------------------------------------------------------------------------
// APK download
// ---------------------------------------------------------------------------

export function apkLocalPath(buildNumber: number): string {
  return `${FileSystem.documentDirectory}${APK_DIR}aedex-${buildNumber}.apk`;
}

async function deleteQuietly(uri: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Nothing to clean up.
  }
}

async function isAlreadyDownloaded(
  uri: string,
  expectedSize: number,
): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return false;
    if (!expectedSize) return true;
    return info.size === expectedSize;
  } catch {
    return false;
  }
}

/**
 * Downloads the release APK to app-private storage, reporting real byte progress.
 * Safe to call again after a failure or an app restart: a complete file is reused,
 * and a partial one resumes from its saved range.
 */
export async function downloadApk(
  manifest: ReleaseManifest,
  onProgress: (progress: DownloadProgress) => void,
): Promise<string> {
  const dirUri = `${FileSystem.documentDirectory}${APK_DIR}`;
  await FileSystem.makeDirectoryAsync(dirUri, { intermediates: true });
  const targetUri = apkLocalPath(manifest.buildNumber);

  if (await isAlreadyDownloaded(targetUri, manifest.sizeBytes)) {
    onProgress({
      receivedBytes: manifest.sizeBytes,
      totalBytes: manifest.sizeBytes,
      fraction: 1,
    });
    return targetUri;
  }

  let resumeData: string | undefined;
  const saved = await AsyncStorage.getItem(RESUME_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed?.url === manifest.downloadUrl) {
        resumeData = parsed.savable ?? undefined;
      } else {
        await deleteQuietly(targetUri);
      }
    } catch {
      await deleteQuietly(targetUri);
    }
  } else {
    await deleteQuietly(targetUri);
  }

  const resumable = FileSystem.createDownloadResumable(
    manifest.downloadUrl,
    targetUri,
    {},
    ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
      const total =
        totalBytesExpectedToWrite > 0
          ? totalBytesExpectedToWrite
          : manifest.sizeBytes;
      onProgress({
        receivedBytes: totalBytesWritten,
        totalBytes: total,
        fraction: total > 0 ? totalBytesWritten / total : 0,
      });
    },
    resumeData,
  );

  try {
    const result = await resumable.downloadAsync();
    await AsyncStorage.removeItem(RESUME_STORAGE_KEY);
    return result?.uri ?? targetUri;
  } catch (err) {
    const savable = resumable.savable();
    if (savable) {
      await AsyncStorage.setItem(
        RESUME_STORAGE_KEY,
        JSON.stringify({ url: manifest.downloadUrl, savable }),
      ).catch(() => {});
    }
    throw err;
  }
}

export async function cancelDownload(buildNumber: number): Promise<void> {
  await AsyncStorage.removeItem(RESUME_STORAGE_KEY);
  await deleteQuietly(apkLocalPath(buildNumber));
}

// ---------------------------------------------------------------------------
// Install
// ---------------------------------------------------------------------------

/**
 * Hands the downloaded APK to the system installer. The file lives in app-private
 * storage, so it has to be exposed as a content:// URI first; the grant flag lets
 * the package installer read it without exposing the file to any other app.
 */
export async function installDownloadedApk(localUri: string): Promise<void> {
  const contentUri = await FileSystem.getContentUriAsync(localUri);
  await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
    data: contentUri,
    type: APK_MIME,
    flags: FLAG_GRANT_READ_URI_PERMISSION,
  });
}

/**
 * Android 8+ requires the user to grant this app permission to install packages
 * before the installer intent will resolve. Sends them to the right settings page.
 */
export async function openInstallPermissionSettings(): Promise<void> {
  await IntentLauncher.startActivityAsync(
    "android.settings.MANAGE_UNKNOWN_APP_SOURCES",
    { data: `package:${getInstalledPackageId()}` },
  );
}

/** True when a previously downloaded APK is sitting on disk ready to install. */
export async function findDownloadedApk(
  buildNumber: number,
): Promise<string | null> {
  const uri = apkLocalPath(buildNumber);
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists ? uri : null;
}