# Chicken Road: Animated Background Component Documentation

`<ChickenRoadBackground />` is a 60fps/120fps hardware-accelerated animated background component built with **PixiJS** and **React**, engineered specifically for **Telegram Mini Apps (TMA)** on mobile and desktop viewports.

---

## 1. Component Architecture & Props

```tsx
import ChickenRoadBackground, { BackgroundDensity } from '@/components/ChickenRoadBackground';

<ChickenRoadBackground 
  density="medium" // 'low' | 'medium' | 'high' (default: 'medium')
  paused={false}   // boolean (default: false)
  className=""     // optional custom CSS classes
/>
```

### Visual Layers (Z-Index Order from Back to Front)
1. **Sky Gradient**: High-performance CSS `linear-gradient(180deg, #FF9A3C 0%, #FFD56B 50%, #6EC6FF 100%)` (warm golden-hour sunset).
2. **Cloud Layer**: PixiJS container drifting slowly at 0.15–0.40 px/frame with 25%–50% opacity.
3. **Ambient Dust Particles**: Subtle drifting warm sunset dust motes with soft alpha pulsation.
4. **Far Birds Layer**: Tiny silhouettes (scale: 0.22–0.32), slow speed (0.7–1.1 px/frame), opacity 0.25.
5. **Mid Birds Layer**: Medium silhouettes (scale: 0.42–0.60), moderate speed (1.4–2.1 px/frame), opacity 0.55.
6. **Near Birds Layer**: Prominent silhouettes (scale: 0.75–1.05), rapid traversal (2.4–3.6 px/frame), opacity 0.85, banking rotation.

---

## 2. Motion Design & Procedural Animation

- **Horizontal Traversal**: Randomized spawn intervals (2.5s–6.0s) from left or right screen edges.
- **Sinusoidal Bobbing**: Vertical position bobs on a continuous sine wave ($y = y_0 + \sin(\omega t + \phi) \cdot A$) with individual phase and frequency offsets.
- **Flight Banking**: Dynamic rotation matches the vertical velocity derivative ($\theta \propto \cos(\omega t + \phi)$), tilting the beak upward on the climb and downward on the dip.
- **Wing Flap & Squash/Stretch**: 2-frame animation cycle (gliding $\leftrightarrow$ stroke) combined with an elastic scale squash/stretch impulse on `scale.y` (1.08x $\leftrightarrow$ 0.92x).
- **Edge Fading**: Smooth linear alpha ramp across the outer 12% of the screen so birds never abruptly pop in or out.

---

## 3. Performance Budget & Mobile Optimizations

- **Zero Per-Frame Allocations**: Strict object pooling for all birds, clouds, and particles. No `new` objects or garbage collection spikes during the render loop.
- **Draw Call Budget**: Sub-60 draw calls via shared sprite textures and batched PixiJS stage rendering.
- **Frame Budget**: $\le 3.0\text{ms}$ CPU execution per frame on mid-range Android chipsets (Snapdragon 680 / Helio G99).
- **Delta-Time Capping**: RAF delta-time clamped to a maximum of $50\text{ms}$. If a user switches Telegram tabs or locks their phone, birds will never warp or teleport upon returning.
- **Page Visibility API**: Automatically stops RAF ticking when `document.hidden === true`.
- **Hardware-Adaptive Density**:
  - Automatically checks `navigator.hardwareConcurrency` and `deviceMemory`.
  - Automatically steps down density tier (e.g., `high` $\to$ `medium`, `medium` $\to$ `low`) on 4-core or $\le 4\text{GB}$ devices.
- **Accessibility**: Automatically checks `prefers-reduced-motion`. If enabled by the user, Pixi is never initialized; only the static sunset gradient is displayed.

---

## 4. Custom Sprite Asset Specifications

If replacing the built-in procedural SVG/canvas silhouettes with custom sprite art:

| Asset | Format | Recommended Dimensions | Description |
| :--- | :--- | :--- | :--- |
| **Chicken Frame 0** | PNG-24 with alpha or WebP | `128 x 128 px` | Rooster/chicken gliding, wings raised |
| **Chicken Frame 1** | PNG-24 with alpha or WebP | `128 x 128 px` | Rooster/chicken flapping, wings swept downward |
| **Cloud Texture 1** | PNG-24 with alpha or WebP | `512 x 200 px` | Soft semi-transparent volumetric sunset cloud |
| **Cloud Texture 2** | PNG-24 with alpha or WebP | `384 x 160 px` | Smaller secondary sunset cloud puff |
| **Dust Particle** | PNG-24 with alpha or WebP | `32 x 32 px` | Radial soft-edged amber glow circle |

Place assets in `frontend/public/assets/sprites/` and configure their paths in `birdSprites.ts`. If assets are absent, the component seamlessly uses its built-in procedural vector silhouettes with zero 404s.

---

## 5. Live Game Integration

Mount `ChickenRoadBackground` behind the layout or directly inside `app/game/page.tsx`:

```tsx
import ChickenRoadBackground from "@/components/ChickenRoadBackground";

export default function GamePage() {
  const { roundStatus } = useGame();

  return (
    <div className="relative min-h-screen">
      {/* 1. Animated PixiJS Layer (Fixed behind UI) */}
      <ChickenRoadBackground 
        density="medium" 
        paused={roundStatus === "ended"} 
      />

      {/* 2. Live Game UI & Chicken Flight Stage */}
      <div className="relative z-10 max-w-4xl mx-auto p-4">
        {/* Multiplier display, betting controls, player feed */}
      </div>
    </div>
  );
}
```
