"use client";

import QrScanner from "qr-scanner";
import { useEffect, useRef, useState } from "react";

type Camera = {
  id: string;
  label: string;
};

type QrReaderProps = {
  active: boolean;
  onDetected: (value: string) => void;
};

const isExpectedMediaAbort = (error: unknown): boolean => {
  if (error instanceof DOMException) {
    return error.name === "AbortError";
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("aborted by the user agent") ||
      message.includes("fetching process for the media resource was aborted") ||
      message.includes("the play() request was interrupted")
    );
  }

  return false;
};

const CAMERA_KEY = "scanner:selected-camera";
const VISITED_KEY = "scanner:visited";

const buttonClassName =
  "rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-primary-text transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60";
const selectClassName =
  "rounded-md min-w-0 flex-1 bg-uberdark-background px-3 py-2 text-sm text-primary-text";

export default function QrReader({ active, onDetected }: QrReaderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const onDetectedRef = useRef(onDetected);
  const lastScanRef = useRef<string>("");

  const [cameras, setCameras] = useState<Camera[]>([]);
  // Lazy-init from localStorage so the value is available immediately on first
  // render — avoids the race condition where the camera list resolves before the
  // separate localStorage useEffect has flushed its setState call.
  const [selectedCamera, setSelectedCamera] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(CAMERA_KEY) ?? "";
  });
  const [scanningPaused, setScanningPaused] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const savedCamera = window.localStorage.getItem(CAMERA_KEY);
    const hasVisited = window.sessionStorage.getItem(VISITED_KEY) === "1";
    // First entry with a saved camera can autoload. Re-entry always starts paused.
    return hasVisited || !savedCamera;
  });
  const [cameraError, setCameraError] = useState<string>("");
  const [cameraReady, setCameraReady] = useState<boolean>(false);
  const isWaitingForCamera = active && !scanningPaused && !cameraReady;

  // Keep callback ref current.
  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  // Mark scanner as visited in this browser tab/session.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(VISITED_KEY, "1");
  }, []);

  // Load camera list on mount; validate the saved camera against what's available
  // and fall back to the first camera if the saved one no longer exists.
  useEffect(() => {
    let cancelled = false;

    void QrScanner.listCameras(true)
      .then((list) => {
        if (cancelled) return;
        setCameras(list);
        setSelectedCamera((current) => {
          if (current && list.some((c) => c.id === current)) return current;
          return list.at(0)?.id ?? "";
        });
      })
      .catch(() => {
        if (!cancelled) setCameraError("No camera was detected on this device.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Persist camera choice to localStorage.
  useEffect(() => {
    if (!selectedCamera || typeof window === "undefined") return;
    window.localStorage.setItem(CAMERA_KEY, selectedCamera);
  }, [selectedCamera]);

  // Browser tab switches can trigger benign media abort rejections while video
  // playback is being paused/resumed by the user agent.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isExpectedMediaAbort(event.reason)) {
        event.preventDefault();
      }
    };

    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  // Start scanner only when we are live-scanning.
  // If paused, no camera stream is active.
  useEffect(() => {
    if (!videoRef.current || !selectedCamera || scanningPaused || !active) return;
    let disposed = false;

    setCameraReady(false);
    setCameraError("");
    lastScanRef.current = "";

    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        const value = result.data?.trim();
        if (!value || lastScanRef.current === value) return;
        lastScanRef.current = value;
        onDetectedRef.current(value);
      },
      {
        preferredCamera: selectedCamera,
        highlightScanRegion: true,
        highlightCodeOutline: true,
        maxScansPerSecond: 15,
        returnDetailedScanResult: true,
      },
    );

    scannerRef.current = scanner;

    void scanner
      .start()
      .then(() => {
        if (disposed) return;
        setCameraError("");
        setCameraReady(true);
      })
      .catch((error: unknown) => {
        if (disposed || isExpectedMediaAbort(error)) {
          return;
        }

        setCameraReady(false);
        if (
          typeof error === "object" &&
          error !== null &&
          "name" in error &&
          error.name === "NotAllowedError"
        ) {
          setCameraError("Camera permission was denied. Allow camera access and reload.");
          return;
        }
        setCameraError("Could not start the camera scanner.");
      });

    return () => {
      disposed = true;
      setCameraReady(false);
      scanner.stop();
      scanner.destroy();
      if (scannerRef.current === scanner) scannerRef.current = null;
    };
  }, [active, scanningPaused, selectedCamera]);

  return (
    <section className="p-2 bg-uberdark-background/70">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setScanningPaused((current) => !current)}
          className={buttonClassName}
          disabled={!selectedCamera}
        >
          {scanningPaused ? "Start camera" : "Pause camera"}
        </button>

        {scanningPaused ? (
          <select
            value={selectedCamera}
            onChange={(event) => setSelectedCamera(event.target.value)}
            className={selectClassName}
            disabled={cameras.length === 0}
          >
            <option value="">Select a camera</option>
            {cameras.map((camera) => (
              <option key={camera.id} value={camera.id}>
                {camera.label || "Camera"}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="mt-3 overflow-hidden rounded-2xl border border-dark-outline bg-slate-950">
        <div className="relative aspect-[4/3] w-full">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          {!cameraReady && !scanningPaused ? (
            <div className="absolute inset-0 grid place-items-center bg-slate-950 px-6 text-center">
              <div className="flex flex-col items-center gap-3">
                <svg
                  className="h-6 w-6 animate-spin text-keppel-logo"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm font-semibold text-primary-text">Starting camera…</p>
              </div>
            </div>
          ) : null}
          {scanningPaused ? (
            <div className="absolute inset-0 grid place-items-center bg-slate-950/70 px-6 text-center text-sm font-semibold text-primary-text">
              {selectedCamera ? "Scanning paused" : "Select a camera"}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
        <p>
          {cameraReady ? "Camera ready" : isWaitingForCamera ? "Waiting for camera" : ""}
        </p>
        <p>{active ? "Live scan mode" : "Reviewing scanned ticket"}</p>
      </div>

      {cameraError ? (
        <p className="mt-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {cameraError}
        </p>
      ) : null}
    </section>
  );
}
