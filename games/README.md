# 🕹️ Postgrad Webgames Collection

A curated laboratory of browser-based arcade experiences. This repository serves as a technical showcase for high-performance rendering, procedural audio, and nostalgic game design across different web technologies.

## 🚀 Featured Simulations

| Title | Technical Focus | Core Mechanics |
| :--- | :--- | :--- |
| **Sector 7** | 2D Canvas / Web Audio | ATC radar simulation, lateral/vertical separation logic. |
| **DEFCON: Red Shield** | React / State Management | Strategic ICBM defense, chain-reaction physics, wave escalation. |
| **Portland Fent Fight** | Three.js / WebGL | 3D urban survival, procedural textures, AABB collision detection. |

## 🛠️ Technical Pillar (Future-Proofing)

Every game in this collection is built to meet a specific "Postgrad" technical standard. Future additions to this repo will follow these architectural patterns:

### 1. High-Performance Loops
All games utilize `requestAnimationFrame` to decouple logic from rendering, ensuring a consistent 60FPS experience even as complexity scales.

### 2. Procedural Audio Engine
We prioritize the **Web Audio API** over static samples. Soundscapes are generated in real-time using oscillators (Square, Sawtooth, Sine) and gain envelopes to create a responsive, low-latency "retro" feel.

### 3. Visual Aesthetic (CRT-Standard)
Games utilize CSS-based CRT overlays, including:
* **Scanlines**: Linear gradients simulating physical tube monitors.
* **Phosphor Glow**: Text-shadow and filter effects for that authentic 1980s terminal look.
* **Pixelation**: Low-resolution internal buffers scaled to modern displays.

## 📂 Adding New Games
To maintain the repository's structure, new games should be added as standalone `.html` files (for vanilla/Three.js) or componentized directories (for React).

1.  **Standardized Controls**: Map inputs to `WASD` or `Pointer` events for immediate accessibility.
2.  **Asset Management**: Use procedural generation for textures and audio where possible to keep the repository lightweight.
3.  **Documentation**: Update the "Featured Simulations" table in this README with the new title and its technical focus.

## 🕹️ Quick Start
Simply clone the repo and open any `.html` file in a modern browser to begin.
```bash
git clone [https://github.com/your-username/postgrad-webgames.git](https://github.com/mtepenner/postgrad-webgames.git)

```
