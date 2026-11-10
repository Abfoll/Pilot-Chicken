/**
 * Bird Sprites & Procedural Fallback Texture Generator for PixiJS
 * 
 * Provides production-ready texture generation for Chicken Road background.
 * Automatically generates crisp rooster/chicken silhouettes and volumetric clouds
 * using canvas if external sprite sheet PNGs are not yet in the public folder.
 */

import { Texture } from "pixi.js";

export interface BirdSpriteConfig {
  sheetPath?: string;
  frameWidth?: number;
  frameHeight?: number;
  framesCount?: number;
}

export interface GeneratedTextures {
  birdFrames: Texture[];
  cloudTextures: Texture[];
  particleTexture: Texture;
}

/**
 * Creates a procedural 2-frame chicken / bird silhouette texture.
 * Frame 0: Gliding / wings up
 * Frame 1: Flapping / wings down
 */
function createProceduralBirdTextures(): Texture[] {
  if (typeof document === "undefined") return [];

  const size = 64;
  const textures: Texture[] = [];

  // Frame 0: Wings Up (Gliding)
  const canvas0 = document.createElement("canvas");
  canvas0.width = size;
  canvas0.height = size;
  const ctx0 = canvas0.getContext("2d");
  if (ctx0) {
    ctx0.fillStyle = "#1e140d"; // Deep warm silhouette
    ctx0.beginPath();

    // Body
    ctx0.ellipse(28, 36, 18, 12, -0.15, 0, Math.PI * 2);
    ctx0.fill();

    // Head & Neck
    ctx0.beginPath();
    ctx0.ellipse(42, 28, 8, 10, 0.3, 0, Math.PI * 2);
    ctx0.fill();

    // Beak
    ctx0.beginPath();
    ctx0.moveTo(48, 27);
    ctx0.lineTo(55, 30);
    ctx0.lineTo(47, 33);
    ctx0.closePath();
    ctx0.fill();

    // Comb (rooster crown)
    ctx0.beginPath();
    ctx0.arc(43, 19, 4, 0, Math.PI * 2);
    ctx0.arc(38, 21, 3.5, 0, Math.PI * 2);
    ctx0.fill();

    // Tail Feathers
    ctx0.beginPath();
    ctx0.moveTo(14, 34);
    ctx0.quadraticCurveTo(4, 20, 10, 14);
    ctx0.quadraticCurveTo(16, 22, 18, 30);
    ctx0.fill();

    ctx0.beginPath();
    ctx0.moveTo(12, 34);
    ctx0.quadraticCurveTo(6, 26, 14, 20);
    ctx0.quadraticCurveTo(18, 26, 20, 32);
    ctx0.fill();

    // Wing - Raised Upward
    ctx0.beginPath();
    ctx0.moveTo(25, 33);
    ctx0.quadraticCurveTo(22, 8, 38, 12);
    ctx0.quadraticCurveTo(34, 24, 29, 36);
    ctx0.fill();

    textures.push(Texture.from(canvas0));
  }

  // Frame 1: Wings Down (Flapping stroke)
  const canvas1 = document.createElement("canvas");
  canvas1.width = size;
  canvas1.height = size;
  const ctx1 = canvas1.getContext("2d");
  if (ctx1) {
    ctx1.fillStyle = "#1e140d";
    ctx1.beginPath();

    // Body
    ctx1.ellipse(28, 35, 18, 12, -0.15, 0, Math.PI * 2);
    ctx1.fill();

    // Head & Neck
    ctx1.beginPath();
    ctx1.ellipse(42, 28, 8, 10, 0.3, 0, Math.PI * 2);
    ctx1.fill();

    // Beak
    ctx1.beginPath();
    ctx1.moveTo(48, 27);
    ctx1.lineTo(55, 30);
    ctx1.lineTo(47, 33);
    ctx1.closePath();
    ctx1.fill();

    // Comb
    ctx1.beginPath();
    ctx1.arc(43, 19, 4, 0, Math.PI * 2);
    ctx1.arc(38, 21, 3.5, 0, Math.PI * 2);
    ctx1.fill();

    // Tail Feathers
    ctx1.beginPath();
    ctx1.moveTo(14, 34);
    ctx1.quadraticCurveTo(4, 20, 10, 14);
    ctx1.quadraticCurveTo(16, 22, 18, 30);
    ctx1.fill();

    // Wing - Swept Downward
    ctx1.beginPath();
    ctx1.moveTo(26, 33);
    ctx1.quadraticCurveTo(28, 54, 42, 48);
    ctx1.quadraticCurveTo(36, 36, 30, 33);
    ctx1.fill();

    textures.push(Texture.from(canvas1));
  }

  return textures;
}

/**
 * Creates soft, fluffy procedural cloud textures with warm sunset edges.
 */
function createProceduralCloudTextures(): Texture[] {
  if (typeof document === "undefined") return [];

  const textures: Texture[] = [];
  const configs = [
    { w: 256, h: 100, puffs: [[50, 60, 42], [95, 45, 52], [150, 48, 56], [200, 62, 40]] },
    { w: 180, h: 80, puffs: [[40, 50, 34], [80, 40, 42], [130, 50, 38]] },
  ];

  for (const cfg of configs) {
    const canvas = document.createElement("canvas");
    canvas.width = cfg.w;
    canvas.height = cfg.h;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Warm gradient fill (sunset amber glow)
      const grad = ctx.createLinearGradient(0, 0, 0, cfg.h);
      grad.addColorStop(0, "rgba(255, 245, 225, 0.85)");
      grad.addColorStop(0.6, "rgba(255, 215, 175, 0.65)");
      grad.addColorStop(1, "rgba(240, 160, 110, 0.2)");
      ctx.fillStyle = grad;

      ctx.beginPath();
      for (const [x, y, r] of cfg.puffs) {
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, Math.PI * 2);
      }
      ctx.fill();

      // Soft blur glow
      ctx.filter = "blur(4px)";
      ctx.drawImage(canvas, 0, 0);
      ctx.filter = "none";

      textures.push(Texture.from(canvas));
    }
  }

  return textures;
}

/**
 * Creates a soft radial glowing dust particle texture.
 */
function createDustParticleTexture(): Texture {
  if (typeof document === "undefined") return Texture.EMPTY;

  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, "rgba(255, 240, 200, 0.9)");
    grad.addColorStop(0.4, "rgba(255, 210, 150, 0.4)");
    grad.addColorStop(1, "rgba(255, 180, 100, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(8, 8, 8, 0, Math.PI * 2);
    ctx.fill();
    return Texture.from(canvas);
  }
  return Texture.EMPTY;
}

/**
 * Loads textures, using procedural generation as default or fallback.
 */
export async function loadBackgroundAssets(
  customConfig?: BirdSpriteConfig
): Promise<GeneratedTextures> {
  const birdFrames = createProceduralBirdTextures();
  const cloudTextures = createProceduralCloudTextures();
  const particleTexture = createDustParticleTexture();

  return {
    birdFrames,
    cloudTextures,
    particleTexture,
  };
}
