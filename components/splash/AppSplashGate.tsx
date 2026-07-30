"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppSplashScreen } from "./AppSplashScreen";
import { useAppBootProgress } from "./useAppBootProgress";

export function AppSplashGate({ children }: Readonly<{ children: React.ReactNode }>) {
  const [phase, setPhase] = useState<"visible" | "exiting" | "hidden">("visible");
  const timers = useRef<number[]>([]);

  const beginExit = useCallback(() => {
    if (phase !== "visible") return;
    timers.current.push(window.setTimeout(() => {
      setPhase("exiting");
      timers.current.push(window.setTimeout(() => setPhase("hidden"), 280));
    }, 150));
  }, [phase]);

  const { progress, markImageReady } = useAppBootProgress(beginExit);

  useEffect(() => {
    if (phase === "hidden") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [phase]);

  useEffect(() => () => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
  }, []);

  return (
    <>
      {children}
      {phase !== "hidden" && (
        <AppSplashScreen
          progress={progress}
          exiting={phase === "exiting"}
          onImageReady={markImageReady}
        />
      )}
    </>
  );
}
