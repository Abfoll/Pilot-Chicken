"use client";

import React, { useEffect, useRef } from "react";
import { Application, Container, Sprite } from "pixi.js";
import { loadBackgroundAssets } from "@/utils/birdSprites";

export type BackgroundDensity = "low" | "medium" | "high";

export interface ChickenRoadBackgroundProps {
  density?: BackgroundDensity;
  paused?: boolean;
  className?: string;
  contained?: boolean;
}

interface PooledBird {
  sprite: Sprite;
  layer: "far" | "mid" | "near";
  active: boolean;
  x: number;
  y: number;
  baseY: number;
  speed: number;
  direction: 1 | -1; // 1: moving right, -1: moving left
  baseScale: number;
  targetOpacity: number;
  bobAmplitude: number;
  bobFrequency: number;
  bobPhase: number;
  flapTimer: number;
  flapInterval: number;
  currentFrame: number;
}

interface PooledCloud {
  sprite: Sprite;
  x: number;
  y: number;
  speed: number;
  width: number;
}

interface PooledDust {
  sprite: Sprite;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  baseAlpha: number;
}

/**
 * Evaluates hardware tier to prevent frame drops on budget mobile devices.
 */
function getEffectiveDensity(requested: BackgroundDensity): {
  birdCount: number;
  cloudCount: number;
  dustCount: number;
} {
  let tier: BackgroundDensity = requested;

  if (typeof navigator !== "undefined") {
    const cores = navigator.hardwareConcurrency || 4;
    const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory || 4;

    // Auto-downgrade on constrained devices (Android low/mid-tier or older iPhones)
    if (cores <= 4 || memory <= 4) {
      if (requested === "high") tier = "medium";
      else if (requested === "medium") tier = "low";
    }
  }

  switch (tier) {
    case "high":
      return { birdCount: 20, cloudCount: 7, dustCount: 25 };
    case "low":
      return { birdCount: 6, cloudCount: 3, dustCount: 10 };
    case "medium":
    default:
      return { birdCount: 12, cloudCount: 5, dustCount: 16 };
  }
}

export default function ChickenRoadBackground({
  density = "medium",
  paused = false,
  className = "",
  contained = false,
}: ChickenRoadBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    // 1. Accessibility: Respect prefers-reduced-motion
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotionQuery.matches) {
      return; // Keep static CSS sunset gradient only
    }

    const host = containerRef.current;
    if (!host) return;

    let isDestroyed = false;
    let animationFrameId: number;
    let app: Application | null = null;
    let lastTime = performance.now();

    const { birdCount, cloudCount, dustCount } = getEffectiveDensity(density);

    // Initialize PixiJS application (v8 async init)
    const initPixi = async () => {
      try {
        const pixiApp = new Application();
        await pixiApp.init({
          resizeTo: host,
          backgroundAlpha: 0,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          autoDensity: true,
          antialias: false,
          powerPreference: "low-power",
        });

        if (isDestroyed) {
          pixiApp.destroy(true, { children: true });
          return;
        }

        app = pixiApp;
        const canvas = (pixiApp.canvas || (pixiApp as unknown as { view: HTMLCanvasElement }).view) as HTMLCanvasElement;
        canvas.style.position = "absolute";
        canvas.style.top = "0";
        canvas.style.left = "0";
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.pointerEvents = "none";
        host.appendChild(canvas);

        const { birdFrames, cloudTextures, particleTexture } = await loadBackgroundAssets();
        if (isDestroyed || birdFrames.length === 0) return;

        // Container Hierarchy (Back to Front Parallax)
        const cloudsLayer = new Container();
        const dustLayer = new Container();
        const farBirdsLayer = new Container();
        const midBirdsLayer = new Container();
        const nearBirdsLayer = new Container();

        pixiApp.stage.addChild(cloudsLayer);
        pixiApp.stage.addChild(dustLayer);
        pixiApp.stage.addChild(farBirdsLayer);
        pixiApp.stage.addChild(midBirdsLayer);
        pixiApp.stage.addChild(nearBirdsLayer);

        const width = pixiApp.screen.width;
        const height = pixiApp.screen.height;

        // ==========================================
        // 1. CLOUD POOLING & INITIALIZATION
        // ==========================================
        const clouds: PooledCloud[] = [];
        for (let i = 0; i < cloudCount; i++) {
          const tex = cloudTextures[i % cloudTextures.length];
          const cloudSprite = new Sprite(tex);
          cloudSprite.anchor.set(0.5);
          const cScale = 0.8 + Math.random() * 0.7;
          cloudSprite.scale.set(cScale);
          cloudSprite.alpha = 0.25 + Math.random() * 0.25;

          const cloudWidth = tex.width * cScale;
          const cloud: PooledCloud = {
            sprite: cloudSprite,
            x: Math.random() * (width + cloudWidth),
            y: 30 + Math.random() * (height * 0.45),
            speed: 0.15 + Math.random() * 0.25,
            width: cloudWidth,
          };

          cloudSprite.position.set(cloud.x, cloud.y);
          cloudsLayer.addChild(cloudSprite);
          clouds.push(cloud);
        }

        // ==========================================
        // 2. DUST MOTES (WARM SUNSET PARTICLES)
        // ==========================================
        const particles: PooledDust[] = [];
        for (let i = 0; i < dustCount; i++) {
          const pSprite = new Sprite(particleTexture);
          pSprite.anchor.set(0.5);
          const baseAlpha = 0.2 + Math.random() * 0.4;
          pSprite.alpha = baseAlpha;
          pSprite.scale.set(0.3 + Math.random() * 0.5);

          const dust: PooledDust = {
            sprite: pSprite,
            x: Math.random() * width,
            y: Math.random() * height,
            vx: 0.1 + Math.random() * 0.3,
            vy: -0.05 - Math.random() * 0.15,
            phase: Math.random() * Math.PI * 2,
            baseAlpha,
          };
          pSprite.position.set(dust.x, dust.y);
          dustLayer.addChild(pSprite);
          particles.push(dust);
        }

        // ==========================================
        // 3. BIRD OBJECT POOLING
        // ==========================================
        const birdPool: PooledBird[] = [];
        const layerBuckets: ("far" | "mid" | "near")[] = [];

        // Distribute layers: 45% far, 35% mid, 20% near
        for (let i = 0; i < birdCount; i++) {
          if (i < Math.floor(birdCount * 0.45)) layerBuckets.push("far");
          else if (i < Math.floor(birdCount * 0.8)) layerBuckets.push("mid");
          else layerBuckets.push("near");
        }

        layerBuckets.forEach((layer) => {
          const sprite = new Sprite(birdFrames[0]);
          sprite.anchor.set(0.5);
          sprite.visible = false;

          let targetLayer: Container = farBirdsLayer;
          let baseScale = 0.25;
          let targetOpacity = 0.25;

          if (layer === "far") {
            targetLayer = farBirdsLayer;
            baseScale = 0.22 + Math.random() * 0.1;
            targetOpacity = 0.25;
          } else if (layer === "mid") {
            targetLayer = midBirdsLayer;
            baseScale = 0.42 + Math.random() * 0.18;
            targetOpacity = 0.55;
          } else {
            targetLayer = nearBirdsLayer;
            baseScale = 0.75 + Math.random() * 0.3;
            targetOpacity = 0.85;
          }

          sprite.scale.set(baseScale);
          sprite.alpha = targetOpacity;
          targetLayer.addChild(sprite);

          birdPool.push({
            sprite,
            layer,
            active: false,
            x: -200,
            y: -200,
            baseY: 0,
            speed: 1,
            direction: 1,
            baseScale,
            targetOpacity,
            bobAmplitude: 10 + Math.random() * 14,
            bobFrequency: 2 + Math.random() * 2,
            bobPhase: Math.random() * Math.PI * 2,
            flapTimer: 0,
            flapInterval: 120 + Math.random() * 80,
            currentFrame: 0,
          });
        });

        // Function to spawn an inactive bird from pool
        const spawnBird = () => {
          const inactive = birdPool.filter((b) => !b.active);
          if (inactive.length === 0) return;

          const bird = inactive[Math.floor(Math.random() * inactive.length)];
          const curWidth = pixiApp.screen.width;
          const curHeight = pixiApp.screen.height;

          // Random direction: 65% left-to-right, 35% right-to-left
          const direction: 1 | -1 = Math.random() > 0.35 ? 1 : -1;
          const startX = direction === 1 ? -60 : curWidth + 60;

          // Height distribution (sky area)
          let minY = curHeight * 0.08;
          let maxY = curHeight * 0.65;
          if (bird.layer === "far") {
            minY = curHeight * 0.05;
            maxY = curHeight * 0.4;
          }

          const startY = minY + Math.random() * (maxY - minY);

          // Speed aligned to parallax depth
          let baseSpeed = 1.0;
          if (bird.layer === "far") baseSpeed = 0.7 + Math.random() * 0.4;
          else if (bird.layer === "mid") baseSpeed = 1.4 + Math.random() * 0.7;
          else baseSpeed = 2.4 + Math.random() * 1.2;

          bird.active = true;
          bird.direction = direction;
          bird.x = startX;
          bird.baseY = startY;
          bird.y = startY;
          bird.speed = baseSpeed;
          bird.bobPhase = Math.random() * Math.PI * 2;
          bird.sprite.visible = true;
          bird.sprite.alpha = 0; // Fade in

          // Flip horizontally if traveling left
          bird.sprite.scale.x = bird.direction * bird.baseScale;
          bird.sprite.scale.y = bird.baseScale;
        };

        // Seed 2 initial birds on mount for immediate motion
        spawnBird();
        setTimeout(spawnBird, 800);

        let nextSpawnCountdown = 2000 + Math.random() * 3000;

        // ==========================================
        // 4. ANIMATION TICKER LOOP (RAF)
        // ==========================================
        const tick = (now: number) => {
          if (isDestroyed) return;

          // Delta-time cap (max 50ms) to prevent tab-switch warp
          const rawDelta = now - lastTime;
          lastTime = now;
          const dtMs = Math.min(rawDelta, 50);
          const dtNormalized = dtMs / 16.666; // 1.0 at 60fps

          if (!pausedRef.current && !document.hidden && pixiApp.renderer) {
            const screenW = pixiApp.screen.width;
            const screenH = pixiApp.screen.height;

            // Spawn Manager
            nextSpawnCountdown -= dtMs;
            if (nextSpawnCountdown <= 0) {
              spawnBird();
              nextSpawnCountdown = 2500 + Math.random() * 3500;
            }

            // A. Update Clouds
            for (let i = 0; i < clouds.length; i++) {
              const c = clouds[i];
              c.x += c.speed * dtNormalized;
              if (c.x - c.width / 2 > screenW) {
                c.x = -c.width / 2;
                c.y = 20 + Math.random() * (screenH * 0.4);
              }
              c.sprite.position.x = c.x;
            }

            // B. Update Dust Particles
            for (let i = 0; i < particles.length; i++) {
              const p = particles[i];
              p.x += p.vx * dtNormalized;
              p.y += p.vy * dtNormalized;
              p.phase += 0.02 * dtNormalized;

              // Soft opacity pulse
              p.sprite.alpha = p.baseAlpha + Math.sin(p.phase) * 0.15;

              if (p.x > screenW + 10) p.x = -10;
              if (p.y < -10) p.y = screenH + 10;

              p.sprite.position.set(p.x, p.y);
            }

            // C. Update Active Birds
            for (let i = 0; i < birdPool.length; i++) {
              const b = birdPool[i];
              if (!b.active) continue;

              // Horizontal traversal
              b.x += b.speed * b.direction * dtNormalized;

              // Sinusoidal bobbing (vertical drift)
              b.bobPhase += (0.04 * b.bobFrequency) * dtNormalized;
              const bobOffset = Math.sin(b.bobPhase) * b.bobAmplitude;
              b.y = b.baseY + bobOffset;

              // Bank rotation aligned to vertical velocity
              const velocityAngle = Math.cos(b.bobPhase) * 0.12 * b.direction;
              b.sprite.rotation = velocityAngle;

              // Wing Flap animation (2-frame toggle + subtle squash/stretch)
              b.flapTimer += dtMs;
              if (b.flapTimer >= b.flapInterval) {
                b.flapTimer = 0;
                b.currentFrame = b.currentFrame === 0 ? 1 : 0;
                b.sprite.texture = birdFrames[b.currentFrame];

                // Flap squash/stretch impulse
                b.sprite.scale.y =
                  b.currentFrame === 0 ? b.baseScale * 1.08 : b.baseScale * 0.92;
              }

              // Smooth Edge Fade-in / Fade-out (within 12% of screen edges)
              const edgeZone = Math.max(screenW * 0.12, 80);
              let edgeAlphaFactor = 1.0;

              if (b.direction === 1) {
                if (b.x < edgeZone) edgeAlphaFactor = Math.max(0, (b.x + 60) / (edgeZone + 60));
                else if (b.x > screenW - edgeZone) edgeAlphaFactor = Math.max(0, (screenW + 60 - b.x) / (edgeZone + 60));
              } else {
                if (b.x > screenW - edgeZone) edgeAlphaFactor = Math.max(0, (screenW + 60 - b.x) / (edgeZone + 60));
                else if (b.x < edgeZone) edgeAlphaFactor = Math.max(0, (b.x + 60) / (edgeZone + 60));
              }

              b.sprite.alpha = b.targetOpacity * Math.min(Math.max(edgeAlphaFactor, 0), 1);
              b.sprite.position.set(b.x, b.y);

              // Despawn check when completely offscreen
              const offscreenLeft = b.direction === -1 && b.x < -80;
              const offscreenRight = b.direction === 1 && b.x > screenW + 80;

              if (offscreenLeft || offscreenRight) {
                b.active = false;
                b.sprite.visible = false;
              }
            }

            pixiApp.render();
          }

          animationFrameId = requestAnimationFrame(tick);
        };

        animationFrameId = requestAnimationFrame(tick);

        // Visibility listener for backgrounding
        const handleVisibility = () => {
          if (!document.hidden) {
            lastTime = performance.now();
          }
        };
        document.addEventListener("visibilitychange", handleVisibility);

        return () => {
          document.removeEventListener("visibilitychange", handleVisibility);
        };
      } catch (err) {
        console.warn("ChickenRoadBackground Pixi initialization skipped:", err);
      }
    };

    initPixi();

    return () => {
      isDestroyed = true;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (app) {
        try {
          app.destroy(true, { children: true });
        } catch {
          // Ignore cleanup errors on unmount
        }
      }
    };
  }, [density]);

  const positionClasses = contained
    ? "absolute inset-0 z-0 rounded-2xl overflow-hidden pointer-events-none"
    : "fixed inset-0 -z-10 h-full w-full overflow-hidden pointer-events-none";

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`${positionClasses} ${className}`}
      style={{
        background: "linear-gradient(180deg, #FF9A3C 0%, #FFD56B 50%, #6EC6FF 100%)",
      }}
    />
  );
}
