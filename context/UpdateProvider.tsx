import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import {
  UpdateModal,
  UpdateState,
} from "../components/features/updates/UpdateModal";
import {
  cancelDownload,
  checkForUpdate,
  downloadApk,
  fetchOtaUpdate,
  findDownloadedApk,
  installDownloadedApk,
  openInstallPermissionSettings,
  ReleaseManifest,
  reloadToApplyOtaUpdate,
} from "../services/update_service";

/** How often to re-check while the app sits in the foreground. */
const FOREGROUND_POLL_MS = 15 * 60 * 1000;
/** Ignore foreground checks that ran more recently than this. */
const APPSTATE_RECHECK_THROTTLE_MS = 60 * 1000;

interface UpdateContextValue {
  state: UpdateState;
  /** True whenever the blocking overlay is on screen. */
  isBlocking: boolean;
  /** Force a re-check, e.g. from the Settings screen. */
  checkNow: () => Promise<void>;
}

const UpdateContext = createContext<UpdateContextValue>({
  state: { phase: "idle" },
  isBlocking: false,
  checkNow: async () => {},
});

/**
 * Owns the app-wide update gate. Mounted once, above every screen, so a release
 * published while the user is already inside the app still blocks them.
 *
 * All state that must outlive a reload (an interrupted download, an APK already on
 * disk) lives in the service layer or on disk, never in this component.
 */
export const UpdateProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<UpdateState>({ phase: "idle" });

  const manifestRef = useRef<ReleaseManifest | null>(null);
  const localApkRef = useRef<string | null>(null);
  const lastCheckRef = useRef(0);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const setIfMounted = useCallback((next: UpdateState) => {
    if (mountedRef.current) setState(next);
  }, []);

  const runCheck = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    lastCheckRef.current = Date.now();

    try {
      const result = await checkForUpdate();

      if (result.kind === "ota") {
        setIfMounted({ phase: "ota_downloading" });
        const isNew = await fetchOtaUpdate();
        setIfMounted(isNew ? { phase: "ota_ready" } : { phase: "idle" });
        return;
      }

      if (result.kind === "apk" && result.manifest) {
        const manifest = result.manifest;
        manifestRef.current = manifest;

        // If a previous session already downloaded this APK, resume at the install
        // step rather than making the user wait for the check and the download again.
        const alreadyDownloaded = await findDownloadedApk(manifest.buildNumber);
        if (alreadyDownloaded) {
          localApkRef.current = alreadyDownloaded;
          setIfMounted({
            phase: "apk_ready",
            manifest,
            downloadedBytes: manifest.sizeBytes,
            totalBytes: manifest.sizeBytes,
          });
          return;
        }

        setIfMounted({
          phase: "apk_available",
          manifest,
        });
        return;
      }

      setIfMounted({ phase: "idle" });
    } catch (err) {
      // A failed check must never lock the user out of their own app.
      console.warn("[update] check failed:", err);
      setIfMounted({ phase: "idle" });
    } finally {
      busyRef.current = false;
    }
  }, [setIfMounted]);

  // --- Triggers -----------------------------------------------------------

  useEffect(() => {
    void runCheck();
  }, [runCheck]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (AppState.currentState === "active") void runCheck();
    }, FOREGROUND_POLL_MS);
    return () => clearInterval(interval);
  }, [runCheck]);

  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next !== "active") return;
      // Returning from the installer, or from the background with a release that
      // landed while they were away.
      if (Date.now() - lastCheckRef.current < APPSTATE_RECHECK_THROTTLE_MS) return;
      void runCheck();
    };
    const subscription = AppState.addEventListener("change", onChange);
    return () => subscription.remove();
  }, [runCheck]);

  // --- Actions ------------------------------------------------------------

  const startDownload = useCallback(async () => {
    const manifest = manifestRef.current;
    if (!manifest || busyRef.current) return;
    busyRef.current = true;
    setIfMounted({ phase: "apk_downloading", manifest, downloadedBytes: 0, totalBytes: manifest.sizeBytes, fraction: 0 });

    try {
      const uri = await downloadApk(manifest, ({ receivedBytes, totalBytes, fraction }) => {
        if (!mountedRef.current) return;
        setState((prev) =>
          prev.phase === "apk_downloading"
            ? { ...prev, downloadedBytes: receivedBytes, totalBytes, fraction }
            : prev,
        );
      });
      if (!mountedRef.current) return;
      localApkRef.current = uri;
      setIfMounted({
        phase: "apk_ready",
        manifest,
        downloadedBytes: manifest.sizeBytes,
        totalBytes: manifest.sizeBytes,
      });
    } catch {
      if (!mountedRef.current) return;
      setIfMounted({
        phase: "apk_available",
        manifest,
        error: "The download was interrupted. Check your connection and try again.",
      });
    } finally {
      busyRef.current = false;
    }
  }, [setIfMounted]);

  const install = useCallback(async () => {
    const manifest = manifestRef.current;
    if (!manifest) return;

    let uri = localApkRef.current ?? (await findDownloadedApk(manifest.buildNumber));
    if (!uri) {
      await startDownload();
      return;
    }

    localApkRef.current = uri;
    setIfMounted({ phase: "apk_installing", manifest });

    try {
      await installDownloadedApk(uri);
      // Leaves the overlay up: if the user backs out of the system installer,
      // the AppState listener re-checks and puts them right back here.
      setIfMounted({
        phase: "apk_ready",
        manifest,
        downloadedBytes: manifest.sizeBytes,
        totalBytes: manifest.sizeBytes,
      });
    } catch {
      // Android 8+ will not resolve the installer intent until the user has
      // granted "install unknown apps" for this app.
      setIfMounted({
        phase: "apk_ready",
        manifest,
        downloadedBytes: manifest.sizeBytes,
        totalBytes: manifest.sizeBytes,
        error:
          "Android has not granted AEDEX permission to install updates yet. Tap Allow Installation, then install.",
      });
    }
  }, [setIfMounted, startDownload]);

  const discardDownload = useCallback(async () => {
    const manifest = manifestRef.current;
    if (!manifest) return;
    await cancelDownloadInternal(manifest.buildNumber);
    localApkRef.current = null;
    // Stays on apk_available, so a mandatory update is still blocking.
    setIfMounted({ phase: "apk_available", manifest });
  }, [setIfMounted]);

  const applyOtaUpdate = useCallback(async () => {
    // 1. Immediately dismiss modal and switch to non-dialog reloading view
    setIfMounted({ phase: "ota_reloading" });

    // 2. Wait 500ms so touch events finish and native Android Dialog is completely unmounted
    setTimeout(async () => {
      try {
        await reloadToApplyOtaUpdate();
      } catch (err) {
        console.warn("[update] reload failed:", err);
        setIfMounted({ phase: "ota_ready" });
      }
    }, 500);
  }, [setIfMounted]);

  const value = useMemo<UpdateContextValue>(
    () => ({
      state,
      isBlocking:
        state.phase !== "idle" && state.phase !== "checking",
      checkNow: runCheck,
    }),
    [state, runCheck],
  );

  return (
    <UpdateContext.Provider value={value}>
      {children}
      <UpdateModal
        state={state}
        onDownload={startDownload}
        onInstall={install}
        onApplyOta={applyOtaUpdate}
        onAllowInstall={() => {
          void openInstallPermissionSettings().catch(() => {});
        }}
        onCancelDownload={() => {
          void discardDownload();
        }}
      />
    </UpdateContext.Provider>
  );
};

async function cancelDownloadInternal(buildNumber: number): Promise<void> {
  try {
    await cancelDownload(buildNumber);
  } catch {
    // Best effort; the next download overwrites it anyway.
  }
}

export const useUpdate = () => useContext(UpdateContext);