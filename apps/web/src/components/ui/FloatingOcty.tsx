import { useEffect, useRef, type ReactNode } from "react";
import { OctyMascot, type OctyPose } from "./OctyMascot";

export type FloatingOctyVariant = "hero" | "sidebar";

interface FloatingOctyProps {
  variant?: FloatingOctyVariant;
  children?: ReactNode;
  pose?: OctyPose;
  size?: number;
  className?: string;
  title?: string;
}

const VARIANT_CONFIG: Record<
  FloatingOctyVariant,
  { ampX: number; ampY: number; ampRot: number; speed: number }
> = {
  hero: { ampX: 6, ampY: 7, ampRot: 3.5, speed: 1 },
  sidebar: { ampX: 2.5, ampY: 2.5, ampRot: 2, speed: 0.85 },
};

export function FloatingOcty({
  variant = "hero",
  children,
  pose = "neutral",
  size = 50,
  className = "",
  title,
}: FloatingOctyProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const config = VARIANT_CONFIG[variant];

    const phase1 = Math.random() * Math.PI * 2;
    const phase2 = Math.random() * Math.PI * 2;
    const phase3 = Math.random() * Math.PI * 2;
    const phase4 = Math.random() * Math.PI * 2;
    const phaseRot = Math.random() * Math.PI * 2;
    const freqJitter = 0.9 + Math.random() * 0.2;

    let rafId: number | null = null;
    let lastTime = performance.now();
    let elapsed = 0;

    const stop = () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    const tick = (now: number) => {
      if (document.visibilityState === "hidden" || motionQuery.matches) {
        rafId = null;
        return;
      }

      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      elapsed += dt;

      const t = elapsed * config.speed * freqJitter;
      const x =
        (Math.sin(t * 0.85 + phase1) * 0.65 +
          Math.sin(t * 1.43 + phase2) * 0.35) *
        config.ampX;
      const y =
        (Math.sin(t * 1.12 + phase3) * 0.65 +
          Math.cos(t * 0.67 + phase4) * 0.35) *
        config.ampY;
      const rot =
        (Math.sin(t * 0.78 + phaseRot) * 0.7 +
          Math.cos(t * 1.31 + phase1) * 0.3) *
        config.ampRot;

      el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${rot.toFixed(2)}deg)`;
      rafId = window.requestAnimationFrame(tick);
    };

    const start = () => {
      if (motionQuery.matches) {
        stop();
        el.style.transform = "";
        return;
      }
      if (document.visibilityState === "hidden") {
        stop();
        return;
      }
      if (rafId === null) {
        lastTime = performance.now();
        rafId = window.requestAnimationFrame(tick);
      }
    };

    start();

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        stop();
      } else {
        start();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    motionQuery.addEventListener("change", start);

    return () => {
      stop();
      el.style.transform = "";
      document.removeEventListener("visibilitychange", handleVisibility);
      motionQuery.removeEventListener("change", start);
    };
  }, [variant]);

  return (
    <div
      ref={wrapperRef}
      title={title}
      className={`inline-flex items-center justify-center will-change-transform select-none ${className}`}
    >
      {children ?? <OctyMascot pose={pose} size={size} />}
    </div>
  );
}