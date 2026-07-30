"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const BOOT_TIMING = {
  minimumMs: 900,
  reducedMinimumMs: 500,
  maximumMs: 3000
} as const;

export function getBootProgressTarget(elapsedMs: number, ready: boolean) {
  if (ready) return 100;
  if (elapsedMs < 180) return 8 + (elapsedMs / 180) * 27;
  if (elapsedMs < 760) return 35 + ((elapsedMs - 180) / 580) * 40;
  return Math.min(90, 75 + ((elapsedMs - 760) / 1300) * 15);
}

type BootProgress = {
  progress: number;
  markImageReady: () => void;
};

export function useAppBootProgress(onReady: () => void): BootProgress {
  const [progress, setProgress] = useState(8);
  const imageReadyRef = useRef(false);
  const onReadyRef = useRef(onReady);

  const markImageReady = useCallback(() => {
    imageReadyRef.current = true;
  }, []);

  useEffect(() => {
    let active = true;
    let frame = 0;
    let fontsReady = false;
    let minimumElapsed = false;
    let completed = false;
    const startedAt = performance.now();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const minimum = reducedMotion ? BOOT_TIMING.reducedMinimumMs : BOOT_TIMING.minimumMs;

    const finish = () => {
      if (!active || completed) return;
      completed = true;
      setProgress(100);
      onReadyRef.current();
    };

    const minimumTimer = window.setTimeout(() => {
      minimumElapsed = true;
    }, minimum);
    const maximumTimer = window.setTimeout(finish, BOOT_TIMING.maximumMs);

    if ("fonts" in document) {
      void document.fonts.ready.then(() => {
        fontsReady = true;
      }, () => {
        fontsReady = true;
      });
    } else {
      fontsReady = true;
    }

    const animate = (now: number) => {
      if (!active || completed) return;
      const elapsed = now - startedAt;
      if (imageReadyRef.current && fontsReady && minimumElapsed) {
        finish();
        return;
      }

      const target = getBootProgressTarget(elapsed, false);
      setProgress((current) => {
        const easing = reducedMotion ? 0.22 : 0.08;
        return Math.min(90, current + (target - current) * easing);
      });
      frame = window.requestAnimationFrame(animate);
    };

    frame = window.requestAnimationFrame(animate);
    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(minimumTimer);
      window.clearTimeout(maximumTimer);
    };
  }, []);

  return { progress, markImageReady };
}
