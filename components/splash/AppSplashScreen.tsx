"use client";

import Image from "next/image";
import styles from "./AppSplashScreen.module.css";

type AppSplashScreenProps = {
  progress: number;
  exiting: boolean;
  onImageReady: () => void;
};

const splashAsset = "/assets/splash/quickduel-splash.webp";

export function AppSplashScreen({ progress, exiting, onImageReady }: AppSplashScreenProps) {
  const roundedProgress = Math.round(progress);

  return (
    <div
      className={`${styles.splash} ${exiting ? styles.exiting : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Avvio di QuickDuel"
      data-testid="app-splash"
    >
      <div className={styles.backdrop} aria-hidden>
        <Image src={splashAsset} alt="" fill priority sizes="100vw" quality={70} />
      </div>
      <div className={styles.artwork}>
        <Image
          src={splashAsset}
          alt="QuickDuel, trivia testa a testa"
          fill
          priority
          sizes="100vw"
          quality={90}
          onLoad={onImageReady}
          onError={onImageReady}
        />
      </div>

      <div className={styles.progressPanel}>
        <div className={styles.progressCopy}>
          <span>Preparazione...</span>
          <span aria-hidden>{roundedProgress}%</span>
        </div>
        <div
          className={styles.track}
          role="progressbar"
          aria-label="Preparazione di QuickDuel"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={roundedProgress}
        >
          <span
            className={styles.fill}
            style={{ transform: `scaleX(${Math.max(0, Math.min(100, progress)) / 100})` }}
          />
        </div>
      </div>
    </div>
  );
}
