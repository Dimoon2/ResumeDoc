import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

const MAX_PARTICLES = 50;
const MIN_PARTICLES = 24;
const MAX_DISTANCE = 145;
const MAX_DISTANCE_SQ = MAX_DISTANCE * MAX_DISTANCE;
const MIN_SPEED = 10; // px/s
const MAX_SPEED = 20; // px/s

function createParticle(width: number, height: number): Particle {
  const speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
  const angle = Math.random() * Math.PI * 2;
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: 1.8 + Math.random() * 1.2,
  };
}

interface ParticleNetworkProps {
  className?: string;
}

export function ParticleNetwork({ className = "" }: ParticleNetworkProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let rafId: number | null = null;
    let lastTime = performance.now();

    const syncCanvasSize = () => {
      const rect = container.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const targetCount = Math.min(
        MAX_PARTICLES,
        Math.max(MIN_PARTICLES, Math.floor((width * height) / 16000))
      );

      for (const p of particles) {
        if (p.x > width) p.x = Math.random() * width;
        if (p.y > height) p.y = Math.random() * height;
      }

      if (particles.length < targetCount) {
        while (particles.length < targetCount) {
          particles.push(createParticle(width, height));
        }
      } else if (particles.length > targetCount) {
        particles = particles.slice(0, targetCount);
      }
    };

    const drawFrame = () => {
      ctx.clearRect(0, 0, width, height);

      // Líneas de conexión (1px, azul #3E8FD6 con mayor visibilidad)
      ctx.lineWidth = 1;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < MAX_DISTANCE_SQ) {
            const dist = Math.sqrt(distSq);
            const alpha = (1 - dist / MAX_DISTANCE) * 0.46;
            ctx.strokeStyle = `rgba(62, 143, 214, ${alpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Nodos / partículas con mayor contraste sobre #EAF6FF
      ctx.fillStyle = "rgba(62, 143, 214, 0.55)";
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const updateParticles = (dt: number) => {
      for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        if (p.x <= 0) {
          p.x = 0;
          p.vx = Math.abs(p.vx);
        } else if (p.x >= width) {
          p.x = width;
          p.vx = -Math.abs(p.vx);
        }

        if (p.y <= 0) {
          p.y = 0;
          p.vy = Math.abs(p.vy);
        } else if (p.y >= height) {
          p.y = height;
          p.vy = -Math.abs(p.vy);
        }
      }
    };

    const stopLoop = () => {
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

      updateParticles(dt);
      drawFrame();
      rafId = window.requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (document.visibilityState === "hidden" || motionQuery.matches) {
        stopLoop();
        drawFrame();
        return;
      }
      if (rafId === null) {
        lastTime = performance.now();
        rafId = window.requestAnimationFrame(tick);
      }
    };

    syncCanvasSize();
    startLoop();

    const resizeObserver = new ResizeObserver(() => {
      syncCanvasSize();
      drawFrame();
    });
    resizeObserver.observe(container);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        stopLoop();
      } else {
        startLoop();
      }
    };

    const handleMotionChange = () => {
      startLoop();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    motionQuery.addEventListener("change", handleMotionChange);

    return () => {
      stopLoop();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      motionQuery.removeEventListener("change", handleMotionChange);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`pointer-events-none w-full h-full ${className}`}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}