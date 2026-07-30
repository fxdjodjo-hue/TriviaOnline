// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppSplashGate } from "@/components/splash/AppSplashGate";
import { BOOT_TIMING, getBootProgressTarget } from "@/components/splash/useAppBootProgress";

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    priority?: boolean;
    quality?: number;
  }) => React.createElement("img", {
    src: props.src,
    alt: props.alt,
    sizes: props.sizes,
    onLoad: props.onLoad
  })
}));

describe("splash di avvio", () => {
  let container: HTMLDivElement;
  let root: Root;
  let frameTime: number;

  beforeEach(() => {
    vi.useFakeTimers();
    frameTime = performance.now();
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("matchMedia", vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    })));
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
      window.setTimeout(() => {
        frameTime += 16;
        callback(frameTime);
      }, 16));
    vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: Promise.resolve() }
    });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.body.style.overflow = "";
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  async function renderGate() {
    await act(async () => {
      root.render(<AppSplashGate><main>Home pronta</main></AppSplashGate>);
    });
  }

  async function loadImage() {
    const image = container.querySelector("img[alt^='QuickDuel']") as HTMLImageElement;
    await act(async () => image.dispatchEvent(new Event("load")));
  }

  it("compare al primo mount con la home già renderizzata dietro", async () => {
    await renderGate();
    expect(container.querySelector("[data-testid='app-splash']")).not.toBeNull();
    expect(container.textContent).toContain("Home pronta");
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("raggiunge il 100%, rispetta il minimo e poi si smonta", async () => {
    await renderGate();
    await loadImage();
    await act(async () => vi.advanceTimersByTimeAsync(BOOT_TIMING.minimumMs - 1));
    expect(container.querySelector("[data-testid='app-splash']")).not.toBeNull();
    await act(async () => vi.advanceTimersByTimeAsync(17));
    expect(container.querySelector("[role='progressbar']")?.getAttribute("aria-valuenow")).toBe("100");
    await act(async () => vi.advanceTimersByTimeAsync(150 + 280));
    expect(container.querySelector("[data-testid='app-splash']")).toBeNull();
    expect(document.body.style.overflow).toBe("");
  });

  it("usa il timeout massimo se l'immagine non diventa pronta", async () => {
    await renderGate();
    await act(async () => vi.advanceTimersByTimeAsync(BOOT_TIMING.maximumMs));
    expect(container.querySelector("[role='progressbar']")?.getAttribute("aria-valuenow")).toBe("100");
    await act(async () => vi.advanceTimersByTimeAsync(150 + 280));
    expect(container.querySelector("[data-testid='app-splash']")).toBeNull();
  });

  it("ripristina lo scroll e cancella i timer durante unmount", async () => {
    document.body.style.overflow = "auto";
    await renderGate();
    expect(document.body.style.overflow).toBe("hidden");
    act(() => root.unmount());
    expect(document.body.style.overflow).toBe("auto");
    expect(vi.getTimerCount()).toBe(0);
    root = createRoot(container);
  });

  it("usa il minimo ridotto con reduced motion", async () => {
    vi.mocked(window.matchMedia).mockReturnValue({
      matches: true,
      media: "",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    });
    await renderGate();
    await loadImage();
    await act(async () => vi.advanceTimersByTimeAsync(BOOT_TIMING.reducedMinimumMs - 1));
    expect(container.querySelector("[role='progressbar']")?.getAttribute("aria-valuenow")).not.toBe("100");
    await act(async () => vi.advanceTimersByTimeAsync(17));
    expect(container.querySelector("[role='progressbar']")?.getAttribute("aria-valuenow")).toBe("100");
  });

  it("segue una progressione controllata e limitata al 90% prima della readiness", () => {
    expect(getBootProgressTarget(0, false)).toBe(8);
    expect(getBootProgressTarget(180, false)).toBe(35);
    expect(getBootProgressTarget(760, false)).toBe(75);
    expect(getBootProgressTarget(10000, false)).toBe(90);
    expect(getBootProgressTarget(10, true)).toBe(100);
  });
});
